import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { ISO_DATE, validateFutureExpiry, validateRgeUpload, validateIssuedOn } from '../../../../utils/rgeUpload'

const schema = z.object({
  document_type: z.enum(['kbis', 'decennale', 'rge', 'urssaf']),
  file_key: z.string().min(1),
  // Champs obligatoires pour la décennale (auto-approbation sous responsabilité du pro)
  policy_number: z.string().max(50, 'Le numéro de police ne peut pas dépasser 50 caractères.').optional(),
  expiration_date: z.string().regex(ISO_DATE, 'Date invalide.').optional(), // format YYYY-MM-DD (<input type="date">)
  issued_on: z.string().regex(ISO_DATE, 'Date invalide.').optional(), // date d'édition du Kbis (05.11-05)
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const uid = (user as any).id ?? (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Identifiant utilisateur manquant.' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Données invalides.' })

  const { document_type, file_key, policy_number, expiration_date, issued_on } = parsed.data

  // Pour la décennale, le numéro de police et la date d'expiration sont obligatoires
  if (document_type === 'decennale') {
    if (!policy_number?.trim()) throw createError({ statusCode: 422, statusMessage: 'Numéro de police requis.' })
    const exp = validateFutureExpiry(expiration_date)
    if (!exp.ok) throw createError({ statusCode: 422, statusMessage: exp.error })
  }

  // RGE : date future obligatoire, toujours en attente de revue admin (jamais auto-approuvé)
  const rge = validateRgeUpload(document_type, expiration_date)
  if (rge && !rge.ok) throw createError({ statusCode: 422, statusMessage: rge.error })

  // Kbis : date d'édition obligatoire (verrou sous-traitance « moins de 3 mois »)
  let kbisIssuedOn: string | null = null
  if (document_type === 'kbis') {
    const k = validateIssuedOn(issued_on)
    if (!k.ok) throw createError({ statusCode: 422, statusMessage: k.error })
    kbisIssuedOn = k.issued_on
  }

  // URSSAF : date de fin de validité future obligatoire, toujours en attente de revue admin
  let urssafExpiry: string | null = null
  if (document_type === 'urssaf') {
    const u = validateFutureExpiry(expiration_date)
    if (!u.ok) throw createError({ statusCode: 422, statusMessage: u.error })
    urssafExpiry = u.expiry_date
  }

  const supabase = serverSupabaseServiceRole(event) as any

  // La décennale est auto-approuvée : le pro engage sa responsabilité (CGU)
  const isDecennale = document_type === 'decennale'

  // Le Kbis est auto-approuvé si le SIRET a déjà été confirmé actif au claim (API gouv)
  const { data: proRow } = await supabase
    .from('professionals')
    .select('siret_status')
    .eq('id', uid)
    .maybeSingle()
  const isKbisAutoApproved = document_type === 'kbis' && proRow?.siret_status === 'active'

  const status = rge ? rge.status : document_type === 'urssaf' ? 'pending' : (isDecennale || isKbisAutoApproved ? 'approved' : 'pending')

  const { error: insertErr } = await supabase.from('verifications').insert({
    pro_id: uid,
    document_type,
    file_key,
    status,
    ...(isDecennale ? {
      policy_number,
      expiry_date: expiration_date,
      reviewed_at: new Date().toISOString(),
    } : {}),
    ...(rge ? { expiry_date: rge.expiry_date } : {}),
    ...(urssafExpiry ? { expiry_date: urssafExpiry } : {}),
    ...(kbisIssuedOn ? { issued_on: kbisIssuedOn } : {}),
    ...(isKbisAutoApproved ? {
      reviewed_at: new Date().toISOString(),
    } : {}),
  })
  if (insertErr) throw createError({ statusCode: 500, statusMessage: insertErr.message })

  // Auto-approbation décennale : met à jour professionals + labels
  if (isDecennale) {
    const { data: proData } = await supabase
      .from('professionals')
      .select('labels')
      .eq('id', uid)
      .maybeSingle()

    const currentLabels: string[] = proData?.labels ?? []
    const newLabels = currentLabels.includes('decennale_certified')
      ? currentLabels
      : [...currentLabels, 'decennale_certified']

    const { error: updateErr } = await supabase
      .from('professionals')
      .update({ decennal_status: 'valid', labels: newLabels })
      .eq('id', uid)

    if (updateErr) throw createError({ statusCode: 500, statusMessage: updateErr.message })
  }

  // Le profil passe "vérifié" dès que Kbis + décennale sont tous deux approuvés
  // (auto-approbation ci-dessus, ou validation manuelle admin passée) — sans attendre une revue humaine.
  if (status === 'approved') {
    const { data: approvedDocs } = await supabase
      .from('verifications')
      .select('document_type')
      .eq('pro_id', uid)
      .eq('status', 'approved')

    const hasKbis = approvedDocs?.some((v: any) => v.document_type === 'kbis')
    const hasDecennale = approvedDocs?.some((v: any) => v.document_type === 'decennale')

    if (hasKbis && hasDecennale) {
      await supabase.from('professionals').update({ is_verified: true }).eq('id', uid)
    }
  }

  return { error: null, status: 'SUCCESS', document_type, approved: isDecennale || isKbisAutoApproved }
})
