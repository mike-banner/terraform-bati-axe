import { z } from 'zod'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import crypto from 'node:crypto'

const log = (msg: string) => {
  console.log(`[claim.post] ${new Date().toISOString()} - ${msg}`)
}

const VALID_CATEGORIES = ['maconnerie', 'toiture', 'electricite', 'plomberie', 'peinture', 'isolation'] as const

const claimSchema = z.object({
  prospect_id: z.string().uuid().optional(),
  company_name: z.string().min(2, 'Le nom de l\'entreprise est requis.'),
  siret: z.string().regex(/^\d{14}$/, 'Le numéro SIRET doit faire exactement 14 chiffres.'),
  full_name: z.string().min(2, 'Le nom du gérant est requis.'),
  phone: z.string().regex(/^(?:(?:\+|00)33|0)[1-9](?:[\s.-]*\d{2}){4}$/, 'Numéro de téléphone invalide.'),
  postal_code: z.string().regex(/^\d{5}$/, 'Code postal invalide.'),
  categories: z.array(z.enum(VALID_CATEGORIES)).min(1, 'Sélectionnez au moins un corps de métier.'),
  sms_opt_in: z.boolean().default(false)
})

// Helper to generate a URL-safe 8-character ID
function generateShortId(): string {
  const alphabet = 'useandrifySt0123456789bcdfghjklmnpqrstvwxyz'
  let id = ''
  const bytes = crypto.randomBytes(8)
  for (let i = 0; i < 8; i++) {
    const byte = bytes[i] ?? 0
    id += alphabet[byte % alphabet.length]
  }
  return id
}

// Helper to slugify strings for URLs
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace
    .replace(/-+/g, '-') // collapse dashes
    .trim()
}

export default defineEventHandler(async (event) => {
  try {
    // 1. Authenticate user
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Non autorisé. Veuillez vous connecter.'
      })
    }
    const userId: string | null =
      (user as any).id ??
      (user as any).sub ??
      (user as any).user_metadata?.sub ??
      null

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Impossible de résoudre l\'identifiant utilisateur depuis le JWT.'
      })
    }
    log('User resolved: ' + userId)

    // 2. Validate payload
    const body = await readBody(event)
    log('Body read')
    const validation = claimSchema.safeParse(body)
    if (!validation.success) {
      log('Validation failed: ' + JSON.stringify(validation.error.format()))
      throw createError({
        statusCode: 400,
        statusMessage: 'Données d\'inscription invalides.',
        data: validation.error.format()
      })
    }

    log('Validation passed')
    const data = validation.data
    const supabase = await serverSupabaseServiceRole(event) as any

    // Check if professional record already exists for this user
    const { data: existingPro } = await supabase
      .from('professionals')
      .select('id, is_verified')
      .eq('id', userId)
      .maybeSingle()

    if (existingPro && existingPro.is_verified) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Vous avez déjà un profil professionnel configuré et vérifié.'
      })
    }
    log('Existing pro check passed')
    
    // Check if SIRET is already claimed by another pro
    const { data: siretTaken } = await supabase
      .from('professionals')
      .select('id')
      .eq('siret', data.siret)
      .neq('id', userId)
      .maybeSingle()

    if (siretTaken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ce numéro SIRET a déjà été revendiqué par un autre utilisateur.'
      })
    }
    
    log('SIRET check passed')

    // Lookup SIRET via API Recherche Entreprises
    const siretLookup = await lookupSiret(data.siret)
    log('SIRET lookup: ' + siretLookup.status)
    if (siretLookup.status === 'closed') {
      throw createError({
        statusCode: 422,
        statusMessage: "Votre entreprise apparaît comme fermée dans l'annuaire officiel. Contactez-nous si c'est une erreur : contact@bati-axe.fr"
      })
    }

    // 3. Find active zone based on postal code
    const { data: matchedZone, error: zoneError } = await supabase
      .from('zones')
      .select('id, name')
      .eq('is_active', true)
      .contains('postal_codes', [data.postal_code])
      .maybeSingle()

    if (zoneError) {
      log('Zone error: ' + JSON.stringify(zoneError))
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la vérification de la zone géographique.'
      })
    }
    log('Zone check passed')

    const zoneId = matchedZone?.id || null
    const cityName = matchedZone?.name || 'poissy'

    // 4. Generate URL identifiers
    const shortId = generateShortId()
    const canonicalSlug = `${slugify(data.company_name)}-${slugify(cityName)}-${shortId}`
    log('Slug generated')

    // 5. If claiming an existing prospect
    let prospectId = data.prospect_id || null
    let prospect = null
    if (prospectId) {
      log('Fetching prospect...')
      const { data: prospectData, error: prospectErr } = await supabase
        .from('prospects')
        .select('*')
        .eq('id', prospectId)
        .maybeSingle()

      prospect = prospectData

      if (prospectErr || !prospect) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Prospect introuvable.'
        })
      }

      if (prospect.converted_professional_id) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Ce profil entreprise a déjà été revendiqué.'
        })
      }
    } else {
      // Find prospect by SIRET to automatically link it
      const { data: matchedProspect } = await supabase
        .from('prospects')
        .select('id')
        .eq('siret', data.siret)
        .maybeSingle()

      if (matchedProspect) {
        prospectId = matchedProspect.id
      }
    }

    // 6. Upsert professional record
    log('Upserting professional...')
    const { data: newPro, error: proError } = await supabase
      .from('professionals')
      .upsert({
        id: userId,
        short_id: shortId,
        canonical_slug: canonicalSlug,
        email: user.email!,
        company_name: data.company_name,
        siret: data.siret,
        full_name: data.full_name,
        phone: data.phone,
        postal_code: data.postal_code,
        zone_id: zoneId,
        categories: data.categories,
        is_verified: false,
        is_claimed: true,
        decennal_status: 'none',
        stripe_customer_id: null,
        subscription_status: 'none',
        siret_status: siretLookup.status,
        siret_verified_at: siretLookup.verified_at,
        siret_company_name: siretLookup.company_name ?? null,
        siret_address: siretLookup.address ?? null
      }, { onConflict: 'id' })
      .select('id')
      .single()

    if (proError || !newPro) {
      log('Pro error: ' + JSON.stringify(proError))
      throw createError({
        statusCode: 500,
        statusMessage: 'Impossible de créer le profil professionnel.'
      })
    }
    log('Upsert successful')

    // 7. If linked to a prospect, update prospect record
    if (prospectId) {
      log('Updating prospect record')
      await supabase
        .from('prospects')
        .update({
          converted_professional_id: userId,
          optin_status: 'accepted'
        })
        .eq('id', prospectId)
    }

    // 8. Log SMS Consent if checked
    const ip = getHeader(event, 'cf-connecting-ip') || getHeader(event, 'x-forwarded-for') || event.node.req.socket.remoteAddress
    const userAgent = getHeader(event, 'user-agent')

    const consentsToInsert: any[] = [
      {
        subject_type: 'professional',
        subject_id: userId,
        channel: 'cgu',
        status: 'granted',
        source: 'claim',
        ip,
        user_agent: userAgent,
        cgu_version: '1.0'
      }
    ]

    if (data.sms_opt_in) {
      consentsToInsert.push({
        subject_type: 'professional',
        subject_id: userId,
        channel: 'sms',
        status: 'granted',
        source: 'claim',
        ip,
        user_agent: userAgent,
        cgu_version: undefined
      })
    }

    await supabase.from('consents').insert(consentsToInsert)
    log('Consents inserted')

    // 9. Log Audit Entry
    await supabase.from('audit_logs').insert({
      actor_id: userId,
      action: 'prospect_converted',
      target_table: 'professionals',
      target_id: userId,
      metadata: {
        prospect_id: prospectId,
        siret: data.siret,
        company_name: data.company_name
      }
    })
    log('Audit log inserted')

    return {
      status: 'SUCCESS',
      professionalId: userId,
      slug: canonicalSlug
    }
  } catch (error: any) {
    log(`ERROR caught: ${error.message}`)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal Server Error'
    })
  }
})
