import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { maskTender, isTenderRevealed } from '../../../utils/maskTender'
import { findSignedFramework } from '../../../utils/signature'

export default defineEventHandler(async (event) => {
  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const supabase = serverSupabaseServiceRole(event) as any

  const { data: pro, error: proError } = await supabase
    .from('professionals')
    .select('id, categories, is_verified, decennal_status')
    .eq('id', user.id)
    .single()

  if (proError || !pro) {
    throw createError({ statusCode: 404, statusMessage: 'Profil professionnel introuvable.' })
  }

  const canClaim = pro.is_verified === true && pro.decennal_status === 'valid'
  const frameworkSigned = Boolean(await findSignedFramework(supabase, { type: 'framework_pro', proId: user.id }))

  const { data: proZones } = await supabase
    .from('pro_zones')
    .select('zone_id')
    .eq('pro_id', user.id)
    .eq('status', 'active')

  const zoneIds = (proZones ?? []).map((z: any) => z.zone_id)

  if (zoneIds.length === 0 || !pro.categories?.length) {
    return { tenders: [], zones: [], canClaim, frameworkSigned }
  }

  const { data: lots, error: lotsError } = await supabase
    .from('b2b_tender_lots')
    .select('id, category, status, created_at, zone_id, request_id, description, b2b_requests(id, nb_logements, surface_m2, calendrier_souhaite, description, project_location, project_postal_code, budget_range, decision_status, contact_name, contact_company, contact_phone, contact_email)')
    .in('zone_id', zoneIds)
    .in('category', pro.categories)
    .order('created_at', { ascending: false })
    .limit(100)

  if (lotsError) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la récupération des appels d\'offres.' })
  }

  const { data: claims } = await supabase
    .from('b2b_tender_claims')
    .select('id, lot_id, claimed_at')
    .eq('pro_id', user.id)

  const claimByLotId = new Map<string, any>((claims ?? []).map((c: any) => [c.lot_id, c]))

  const { data: amendments } = await supabase
    .from('b2b_engagements')
    .select('id, lot_id, status, declared_amount_cents, confirmed_amount_cents, commission_cents, signed_at')
    .eq('type', 'lot_amendment')
    .eq('pro_id', user.id)

  const amendmentByLotId = new Map<string, any>((amendments ?? []).map((a: any) => [a.lot_id, a]))

  const { data: zonesRows } = await supabase
    .from('zones')
    .select('id, name')
    .in('id', zoneIds)

  const zoneNameById = new Map<string, string>((zonesRows ?? []).map((z: any) => [z.id, z.name]))

  const tenders = (lots ?? [])
    .filter((lot: any) => {
      const claim = claimByLotId.get(lot.id)
      return lot.status === 'open' || Boolean(claim)
    })
    .map((lot: any) => {
      const claim = claimByLotId.get(lot.id)
      const amendment = amendmentByLotId.get(lot.id)
      // Phase 05.21 : démasquage seulement si claim ET avenant signé (D-03).
      const revealed = isTenderRevealed(claim, amendment)
      const masked = maskTender(
        { ...lot, zone_name: zoneNameById.get(lot.zone_id) ?? null, claimed_at: claim?.claimed_at ?? null },
        revealed,
      )
      return {
        ...masked,
        engagement: revealed
          ? {
              id: amendment.id,
              status: amendment.status,
              declared_amount_cents: amendment.declared_amount_cents,
              confirmed_amount_cents: amendment.confirmed_amount_cents,
              commission_cents: amendment.commission_cents,
              signed_at: amendment.signed_at,
            }
          : null,
      }
    })

  return { tenders, zones: zonesRows ?? [], canClaim, frameworkSigned }
})
