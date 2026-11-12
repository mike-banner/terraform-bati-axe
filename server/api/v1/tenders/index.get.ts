import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { maskTender, isTenderRevealed } from '../../../utils/maskTender'
import { findSignedFramework } from '../../../utils/signature'
import { computeCommissionPlan } from '../../../utils/b2bCommissionPlan'
import { installmentLabels } from '../../../../app/utils/b2bCommissionRules'

// Charge utile de suivi côté pro : aucune information interne (clé de stockage, part partenaire, motif de contestation).
function buildEngagement(a: any, submissions: any[], validations: any[]) {
  const mine = submissions.filter(s => s.engagement_id === a.id)
  const confirmed = mine.filter(s => s.status === 'confirmed')
  const open = [...mine].reverse().find(s => s.status === 'pending' || s.status === 'contested') ?? null
  const plannedDates: string[] | null = confirmed.length > 0 ? (confirmed[confirmed.length - 1].planned_due_dates ?? null) : null
  const base = a.confirmed_amount_cents != null ? Number(a.confirmed_amount_cents) : 0
  const bySeq = new Map<number, string>(validations.filter(v => v.engagement_id === a.id).map(v => [v.seq, v.validated_at]))
  // D-06 bis / D-27 : échéancier de la commission (calcul serveur), libellés publics.
  const labels = installmentLabels(base)
  const schedule = base > 0
    ? computeCommissionPlan(base).schedule.map(i => ({
      seq: i.seq, label: labels[i.seq - 1] ?? i.label, amount_cents: i.amount_cents,
      due_on: plannedDates?.[i.seq - 1] ?? null, validated_at: bySeq.get(i.seq) ?? null,
    }))
    : null
  return {
    id: a.id,
    status: a.status,
    selected_at: a.selected_at ?? null,
    not_awarded_reason: a.not_awarded_reason ?? null,
    signed_at: a.signed_at,
    confirmed_amount_cents: a.confirmed_amount_cents,
    commission_cents: a.commission_cents,
    schedule,
    open_submission: open
      ? {
        id: open.id, amount_ht_cents: Number(open.amount_ht_cents), planned_due_dates: open.planned_due_dates ?? [],
        status: open.status, created_at: open.created_at, file_url: '/api/v1/b2b/quotes/' + open.id + '/file',
      }
      : null,
    confirmed_submissions_count: confirmed.length,
  }
}

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
    .select('id, category, status, created_at, zone_id, request_id, description, b2b_requests(id, nb_logements, surface_m2, calendrier_souhaite, description, project_location, project_postal_code, budget_range, decision_status, qualifications_requises, planning_start, planning_end, contact_name, contact_company, contact_phone, contact_email)')
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
    .select('id, lot_id, status, selected_at, not_awarded_reason, confirmed_amount_cents, commission_cents, signed_at')
    .eq('type', 'lot_amendment')
    .eq('pro_id', user.id)

  const amendmentByLotId = new Map<string, any>((amendments ?? []).map((a: any) => [a.lot_id, a]))

  // 05.23 : dépôts de devis du partenaire et validations d'étape, pour le suivi du pro.
  const amendmentIds = (amendments ?? []).map((a: any) => a.id)
  const { data: submissionRows } = amendmentIds.length > 0
    ? await supabase.from('b2b_quote_submissions')
      .select('id, engagement_id, amount_ht_cents, planned_due_dates, status, created_at')
      .in('engagement_id', amendmentIds).order('created_at')
    : { data: [] }
  const { data: validationRows } = amendmentIds.length > 0
    ? await supabase.from('b2b_installment_validations').select('engagement_id, seq, validated_at').in('engagement_id', amendmentIds)
    : { data: [] }
  const submissions: any[] = submissionRows ?? []
  const validations: any[] = validationRows ?? []

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
        engagement: revealed ? buildEngagement(amendment, submissions, validations) : null,
      }
    })

  return { tenders, zones: zonesRows ?? [], canClaim, frameworkSigned }
})
