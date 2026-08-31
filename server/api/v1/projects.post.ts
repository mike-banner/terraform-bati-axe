import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { computeQualifyScore } from '../../utils/qualifyScore'
import { deriveTrades, derivePrimaryCategory } from '../../utils/calculatorMapping'
import { verifyTurnstile } from '../../utils/verifyTurnstile'
import { notifyMatchedPros } from '../../utils/notifyProLead'
import { sendEmail } from '../../utils/email'
import { renderEmail } from '../../utils/emailLayout'
import { notifyAdmin, adminDetailsTable } from '../../utils/notifyAdmin'

// French phone validation regex
const phoneRegex = /^(?:(?:\+|00)33|0)[1-9](?:[\s.-]*\d{2}){4}$/

// Formate un montant en euros avec espace fine insécable tous les 3 chiffres (FR)
function formatEuro(n: number): string {
  return Math.round(n).toLocaleString('fr-FR')
}

// Input validation schema
const createProjectSchema = z.object({
  // Le calculateur est désormais l'unique producteur de leads : calculator_data requis,
  // category/description/budget_range dérivés/composés server-side si absents.
  calculator_data: z.object({
    renovation_type: z.string().max(100),
    pieces: z.array(z.string().max(100)).max(50, 'Trop de pièces sélectionnées.'),
    surface_m2: z.number().positive(),
    gamme: z.string().max(100),
    estimate_min: z.number().nonnegative(),
    estimate_max: z.number().nonnegative(),
    // Phase 05.9 — aides rénovation (présents uniquement si le particulier a choisi "Oui" au fork)
    aides_estimees: z.number().nonnegative().optional(),
    reste_a_charge_min: z.number().nonnegative().optional(),
    reste_a_charge_max: z.number().nonnegative().optional(),
  }),
  category: z.string().min(1, 'La catégorie est requise.').max(100, 'La catégorie ne peut dépasser 100 caractères.').optional(),
  description: z.string().min(20, 'La description doit faire au moins 20 caractères.').max(1000, 'La description ne peut dépasser 1000 caractères.').optional(),
  budget_range: z.string().min(1, 'Le budget estimé est requis.').max(100, 'Le budget estimé ne peut dépasser 100 caractères.').optional(),
  postal_code: z.string().regex(/^\d{5}$/, 'Le code postal doit comporter 5 chiffres.'),
  customer_name: z.string().min(2, 'Le nom doit comporter au moins 2 caractères.').max(100, 'Le nom ne peut dépasser 100 caractères.'),
  customer_email: z.string().email('Adresse email invalide.').max(254, 'L\'adresse email ne peut dépasser 254 caractères.'),
  customer_phone: z.string().regex(phoneRegex, 'Numéro de téléphone invalide.'),
  cgu_accepted: z.literal(true, 'Vous devez accepter les CGU.'),
  sms_opt_in: z.boolean().default(false),
  turnstile_token: z.string().optional(),
  timeline_range: z.enum(['1_semaine', '1_mois', '3_mois', '6_mois', 'flexible']).optional()
})

export default defineEventHandler(async (event) => {
  try {
    // 1. Read and validate request body
    const body = await readBody(event)
    const validation = createProjectSchema.safeParse(body)

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation failed',
        data: validation.error.format()
      })
    }

    const data = validation.data
    const supabase = await serverSupabaseServiceRole(event) as any

    // Get IP and User-Agent for compliance auditing (moved up for Turnstile P2)
    const ip = getHeader(event, 'cf-connecting-ip') || getHeader(event, 'x-forwarded-for') || event.node.req.socket.remoteAddress
    const userAgent = getHeader(event, 'user-agent')

    // P2 — Turnstile anti-spam : token requis si la clé secrète est configurée
    const turnstileOk = await verifyTurnstile(data.turnstile_token, ip)
    if (!turnstileOk) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Vérification anti-spam échouée. Veuillez réessayer.'
      })
    }

    // T-056-03 : category dérivée server-side (non lue du client par défaut), bornée aux 6 métiers valides
    const { renovation_type, pieces, surface_m2, gamme, estimate_min, estimate_max } = data.calculator_data
    const category = data.category ?? derivePrimaryCategory(renovation_type, pieces)
    const trades = deriveTrades(renovation_type, pieces)
    const description = data.description
      ?? `Rénovation ${renovation_type === 'totale' ? 'totale' : 'pièce par pièce'} — ${pieces.join(', ')} — ${surface_m2} m² — gamme ${gamme}.`
    const budgetRange = data.budget_range
      ?? `${formatEuro(estimate_min)} € – ${formatEuro(estimate_max)} €`

    // D-11: compute qualification criteria (T-04.5-10: computed server-side, never read from body)
    // D-13: informational only — low scores are not rejected
    const { count: returningCount } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('customer_email', data.customer_email)
    const { qualify_budget: qualifyBudget, qualify_phone: qualifyPhone, qualify_description: qualifyDescription, qualify_returning: qualifyReturning, qualify_score: qualifyScore } = computeQualifyScore({
      budget_range: budgetRange,
      customer_phone: data.customer_phone,
      description,
      returning_count: returningCount ?? 0,
    })

    // 2. Match postal code → zone (areas 78 ou city legacy)
    const matchedZone = await matchZone(data.postal_code)

    if (!matchedZone) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Zone non couverte',
        data: { message: `Désolé, la zone pour le code postal ${data.postal_code} n'est pas encore couverte par nos professionnels.` }
      })
    }

    // 3. Create the project in DB
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        category,
        description,
        budget_range: budgetRange,
        calculator_data: { ...data.calculator_data, trades },
        timeline_range: data.timeline_range ?? null,
        postal_code: data.postal_code,
        zone_id: matchedZone.id,
        status: 'qualified',
        // D-10: stored at insert time; D-11: 4 criteria
        qualify_score: qualifyScore,
        qualify_budget: qualifyBudget,
        qualify_phone: qualifyPhone,
        qualify_description: qualifyDescription,
        qualify_returning: qualifyReturning
      })
      .select('id, access_token')
      .single()

    if (projectError || !project) {
      console.error('Failed to create project record:', projectError)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to create project: ${projectError?.message || 'Unknown error'}`
      })
    }

    // 4. P4 — Notifier par email les pros vérifiés dont les catégories matchent.
    // La notification ne débloque rien : les coordonnées restent masquées tant
    // que le pro n'est pas Premium / free-granté / 48h écoulées (cf. maskLead).
    // Idempotence + non-bloquant gérés dans notifyMatchedPros.
    await notifyMatchedPros(supabase, { ...project, budget_range: budgetRange, timeline_range: data.timeline_range ?? null, postal_code: data.postal_code }, category)

    // 5. Save CGU consent row
    const consentsToInsert: Array<{
      subject_type: string; subject_id: string; channel: string; status: string;
      source: string; ip: string | undefined; user_agent: string | undefined; cgu_version: string | null
    }> = [
      {
        subject_type: 'customer',
        subject_id: project.id,
        channel: 'cgu',
        status: 'granted',
        source: 'simulateur',
        ip,
        user_agent: userAgent,
        cgu_version: '1.0'
      }
    ]

    // 6. Save SMS consent if opted in
    if (data.sms_opt_in) {
      consentsToInsert.push({
        subject_type: 'customer',
        subject_id: project.id,
        channel: 'sms',
        status: 'granted',
        source: 'simulateur',
        ip,
        user_agent: userAgent,
        cgu_version: null
      })
    }

    const { error: consentError } = await supabase
      .from('consents')
      .insert(consentsToInsert)

    if (consentError) {
      // Non-blocking but should be logged or handled
      console.error('Failed to log consent status:', consentError)
    }

    // 7. Log audit entry for tracking
    await supabase
      .from('audit_logs')
      .insert({
        action: 'project_created',
        target_table: 'projects',
        target_id: project.id,
        metadata: {
          category,
          postal_code: data.postal_code,
          zone_name: matchedZone.name,
          qualify_score: qualifyScore
        }
      })

    // 06.3 — Accusé de réception au particulier (no-reply@ : aucune réponse attendue).
    // Contient le lien magique vers l'espace client : c'est le SEUL moyen pour lui
    // de retrouver son projet et de suivre les artisans qui se positionnent.
    const siteUrl = useRuntimeConfig().public.siteUrl || 'https://bati-axe.com'
    try {
      await sendEmail({
        to: data.customer_email,
        sender: 'no-reply',
        replyTo: 'contact@bati-axe.com',
        subject: 'Votre projet est enregistré — BÂTI-AXE',
        html: renderEmail({
          title: 'Votre projet est bien enregistré',
          preheader: 'Conservez ce message : il contient le lien vers votre espace projet.',
          intro: `Bonjour ${data.customer_name}, votre demande a bien été enregistrée. Des artisans certifiés de votre secteur vont pouvoir se positionner sur votre chantier.`,
          bodyHtml: `
            <table style="width:100%;border-collapse:collapse;margin:8px 0 0;">
              <tr><td style="padding:8px 0;font-size:13px;color:#64748B;">Type de travaux</td><td style="padding:8px 0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${category}</td></tr>
              <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Budget estimé</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${budgetRange}</td></tr>
              <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Secteur</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${data.postal_code}</td></tr>
            </table>`,
          cta: { label: 'Suivre mon projet', href: `${siteUrl}/mon-projet/${project.access_token}` },
          footerNote: "Ce lien est personnel : il donne accès à votre projet sans mot de passe. Ne le transférez pas. Aucun artisan n'obtient vos coordonnées avant que vous ne validiez un contact.",
        }),
      })
    } catch (err) {
      console.error('[06.3] accusé de réception projet échoué:', err)
    }

    // 06.3 — Alerte admin (jamais bloquante, no-op si NUXT_ADMIN_EMAIL absent).
    await notifyAdmin({
      subject: `Nouveau projet — ${category} — ${data.postal_code}`,
      title: 'Nouveau projet déposé',
      intro: `Un nouveau projet vient d'être créé sur ${matchedZone.name}.`,
      bodyHtml: adminDetailsTable([
        ['Catégorie', category],
        ['Budget estimé', budgetRange],
        ['Code postal', data.postal_code],
        ['Zone', matchedZone.name],
        ['Score de qualification', String(qualifyScore)],
        ['Client', data.customer_name],
      ]),
      cta: { label: 'Ouvrir la console admin', href: `${siteUrl}/admin` },
    })

    // Return success
    setResponseStatus(event, 201)
    return {
      status: 'SUCCESS',
      projectId: project.id,
      zoneName: matchedZone.name,
      ...(import.meta.dev ? { accessToken: project.access_token } : {})
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    serverError('projects.post', error)
  }
})
