import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { maskTender } from '../../../utils/maskTender'

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

  const { data: proZones } = await supabase
    .from('pro_zones')
    .select('zone_id')
    .eq('pro_id', user.id)
    .eq('status', 'active')

  const zoneIds = (proZones ?? []).map((z: any) => z.zone_id)

  if (zoneIds.length === 0 || !pro.categories?.length) {
    return { tenders: [], zones: [], canClaim }
  }

  const { data: lots, error: lotsError } = await supabase
    .from('b2b_tender_lots')
    .select('id, category, status, created_at, zone_id, request_id, b2b_requests(id, description, project_location, project_postal_code, budget_range, decision_status, contact_name, contact_company, contact_phone, contact_email)')
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
      return maskTender(
        { ...lot, zone_name: zoneNameById.get(lot.zone_id) ?? null, claimed_at: claim?.claimed_at ?? null },
        Boolean(claim),
      )
    })

  return { tenders, zones: zonesRows ?? [], canClaim }
})
