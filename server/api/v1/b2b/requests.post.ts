import { serverSupabaseServiceRole } from '#supabase/server'
import { sendEmail } from '../../../utils/email'
import { b2bRequestSchema, buildTenderLots } from '../../../utils/b2bTender'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = b2bRequestSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données invalides.',
      data: parsed.error.format(),
    })
  }

  const data = parsed.data
  const supabase = await serverSupabaseServiceRole(event) as any
  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() || null

  // Insert request
  const { data: request, error } = await supabase
    .from('b2b_requests')
    .insert({
      apporteur_type: data.apporteur_type,
      need_type: data.need_type,
      project_location: data.project_location || null,
      description: data.description?.trim() || null,
      budget_range: data.budget_range || null,
      certification_number: data.certification_number || null,
      travaux_suggeres: data.travaux_suggeres || null,
      files: data.files,
      contact_name: data.contact_name,
      contact_company: data.contact_company || null,
      contact_phone: data.contact_phone,
      contact_email: data.contact_email,
      consent_accepted: true,
      consent_at: new Date().toISOString(),
      consent_ip: ip,
      consent_source: 'b2b-prescripteur',
      status: 'nouveau',
    })
    .select('id')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de l\'enregistrement.' })
  }

  // TEND-05 — 1 lot par corps de métier (syndic). Non bloquant : la demande est
  // déjà enregistrée, une erreur ici ne doit pas faire perdre le dossier au
  // partenaire. ponytail: log console suffisant au pilote, à remonter dans
  // audit_logs si le volume B2B le justifie.
  const lots = buildTenderLots(request.id, data.apporteur_type, data.lots_categories)
  if (lots.length > 0) {
    const { error: lotsError } = await supabase.from('b2b_tender_lots').insert(lots)
    if (lotsError) console.error('[b2b] échec insertion des lots', request.id, lotsError.message)
  }

  // Log consent in consents table (non-blocking)
  try {
    await supabase.from('consents').insert({
      subject_type: 'professional',
      subject_id: request.id,
      channel: 'cgu',
      status: 'granted',
      source: 'b2b-prescripteur',
      ip,
    })
  } catch { /* non-blocking */ }

  // ─── Notify team (email) ───────────────────────────────────────────────────
  const config = useRuntimeConfig()
  const notifyEmails = ((config as any).b2bNotifyEmails || process.env.B2B_NOTIFY_EMAILS || '').split(',').filter(Boolean)

  if (notifyEmails.length > 0) {
    const typeLabel = {
      architecte: 'Architecte / Maître d\'œuvre',
      bet: 'Bureau d\'Études / Ingénieur',
      agence_immo: 'Agence Immobilière',
      syndic: 'Syndic / Gestionnaire',
      diagnostiqueur: 'Diagnostiqueur Immobilier',
      autre: 'Autre Professionnel',
    }[data.apporteur_type]

    const budgetLabel = data.budget_range ? {
      '<30k': '< 30 000 €',
      '30-100k': '30 000 – 100 000 €',
      '100-300k': '100 000 – 300 000 €',
      '>300k': '> 300 000 €',
    }[data.budget_range] : 'Non renseigné'

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0F172A; font-size: 18px;">📋 Nouveau dossier B2B reçu</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748B; width: 140px;">Type</td><td style="padding: 8px 0; color: #0F172A; font-weight: 600;">${typeLabel}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748B;">Besoin</td><td style="padding: 8px 0; color: #0F172A;">${data.need_type === 'projet_immediat' ? 'Projet immédiat' : 'Partenariat régulier'}</td></tr>
          ${data.project_location ? `<tr><td style="padding: 8px 0; color: #64748B;">Localisation</td><td style="padding: 8px 0; color: #0F172A;">${data.project_location}</td></tr>` : ''}
          ${data.budget_range ? `<tr><td style="padding: 8px 0; color: #64748B;">Budget</td><td style="padding: 8px 0; color: #0F172A;">${budgetLabel}</td></tr>` : ''}
          ${data.certification_number ? `<tr><td style="padding: 8px 0; color: #64748B;">N° certification</td><td style="padding: 8px 0; color: #0F172A;">${data.certification_number}</td></tr>` : ''}
          ${data.travaux_suggeres?.length ? `<tr><td style="padding: 8px 0; color: #64748B;">Travaux suggérés</td><td style="padding: 8px 0; color: #0F172A;">${data.travaux_suggeres.join(', ')}</td></tr>` : ''}
          ${data.description ? `<tr><td style="padding: 8px 0; color: #64748B;">Description</td><td style="padding: 8px 0; color: #0F172A;">${data.description}</td></tr>` : ''}
          ${lots.length ? `<tr><td style="padding: 8px 0; color: #64748B;">Lots (corps de métier)</td><td style="padding: 8px 0; color: #0F172A;">${lots.map(l => l.category).join(', ')}</td></tr>` : ''}
          <tr><td style="padding: 8px 0; color: #64748B;">Contact</td><td style="padding: 8px 0; color: #0F172A;">${data.contact_name}${data.contact_company ? ` (${data.contact_company})` : ''}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748B;">Téléphone</td><td style="padding: 8px 0; color: #0F172A;">${data.contact_phone}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748B;">Email</td><td style="padding: 8px 0; color: #0F172A;">${data.contact_email}</td></tr>
          ${data.files.length > 0 ? `<tr><td style="padding: 8px 0; color: #64748B;">Fichiers</td><td style="padding: 8px 0; color: #0F172A;">${data.files.length} pièce(s) jointe(s)</td></tr>` : ''}
        </table>
        <p style="margin-top: 16px; font-size: 13px; color: #64748B;">
          ⏰ Engagement : rappel sous 4h ouvrées.
        </p>
        <p style="margin-top: 8px;">
          <a href="${config.public?.siteUrl || 'https://bati-axe.pages.dev'}/admin" style="display: inline-block; padding: 10px 20px; background: #EA580C; color: white; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">
            Ouvrir la console admin
          </a>
        </p>
      </div>
    `

    for (const email of notifyEmails) {
      await sendEmail({
        to: email.trim(),
        subject: `[B2B] Nouveau dossier — ${typeLabel} — ${data.contact_name}`,
        html,
      }).catch(() => {})
    }
  }

  // ─── Confirmation email to the partner ──────────────────────────────────────
  const confirmationHtml = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0F172A; font-size: 18px;">✅ Votre dossier a bien été reçu</h2>
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Bonjour ${data.contact_name},<br><br>
        Nous avons bien reçu votre dossier. Un chargé d'affaires dédié analyse vos pièces
        et vous sera recontacté <strong>sous 4 heures ouvrées</strong>.
      </p>
      <p style="color: #64748B; font-size: 13px; margin-top: 24px;">
        Référence : ${request.id.slice(0, 8).toUpperCase()}<br>
        BÂTI-AXE — Le bras armé technique des professionnels du bâtiment.
      </p>
    </div>
  `

  await sendEmail({
    to: data.contact_email,
    subject: '[BÂTI-AXE] Votre dossier a bien été reçu — Rappel sous 4h',
    html: confirmationHtml,
  }).catch(() => {})

  return { status: 'SUCCESS', id: request.id }
})
