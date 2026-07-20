import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

const schema = z.object({
  document_type: z.enum(['kbis', 'decennale']),
  file_key: z.string().min(1),
  // Champs obligatoires pour la décennale (auto-approbation sous responsabilité du pro)
  policy_number: z.string().optional(),
  expiration_date: z.string().optional(), // format YYYY-MM-DD
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const uid = (user as any).id ?? (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Identifiant utilisateur manquant.' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Données invalides.' })

  const { document_type, file_key, policy_number, expiration_date } = parsed.data

  // Pour la décennale, le numéro de police et la date d'expiration sont obligatoires
  if (document_type === 'decennale') {
    if (!policy_number?.trim()) throw createError({ statusCode: 422, statusMessage: 'Numéro de police requis.' })
    if (!expiration_date) throw createError({ statusCode: 422, statusMessage: "Date d'expiration requise." })
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

  const status = isDecennale || isKbisAutoApproved ? 'approved' : 'pending'

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

  return { error: null, status: 'SUCCESS', document_type, approved: isDecennale || isKbisAutoApproved }
})
