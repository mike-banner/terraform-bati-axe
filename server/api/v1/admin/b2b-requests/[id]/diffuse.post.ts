import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { ACTIVE_TENDER_STATUSES, assertDiffusable, assertTenderQuota } from '../../../../../utils/b2bDiffusion'
import { notifyMatchedB2bPros } from '../../../../../utils/notifyB2bPros'
import { matchZone } from '../../../../../utils/zoneMatcher'

// Phase 8 (08-02) — endpoint admin « Diffuser » : déclenche la diffusion d'un
// AO partenaire aux artisans matchés zone/catégorie. TEND-10 (déclenchement à
// la qualification DirCo, jamais à l'intake public), TEND-11 (plafond
// anti-spam par partenaire). Résolution de la zone au clic (D-06), délégation
// de la notification à notifyMatchedB2bPros (plan 08-01), non-bloquant par lot.

export default defineEventHandler(async (event) => {
  // T-08-02 : l'état désactivé du bouton côté client n'est jamais une garantie.
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  // 1. Charger le dossier
  const { data: req, error: eReq } = await supabase
    .from('b2b_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (eReq || !req) throw createError({ statusCode: 404, statusMessage: 'Dossier introuvable.' })

  // 2. Gating TEND-10 / D-02
  assertDiffusable(req)

  // 3. Plafond D-09 / TEND-11 — partenaire identifié par contact_email (aucune
  // table partenaires n'existe en base).
  const config = useRuntimeConfig(event)
  const maxActive = Number(config.b2bMaxActiveTendersPerPartner ?? 3)
  const { count: activeCount } = await supabase
    .from('b2b_requests')
    .select('id', { count: 'exact', head: true })
    .eq('contact_email', req.contact_email)
    .in('status', ACTIVE_TENDER_STATUSES)
  assertTenderQuota(activeCount ?? 0, maxActive)

  // 4. Lots ouverts (D-03 : tous les lots open en une fois)
  const { data: lots } = await supabase
    .from('b2b_tender_lots').select('id, category, zone_id, status')
    .eq('request_id', id).eq('status', 'open')
  if (!lots || lots.length === 0) {
    throw createError({ statusCode: 422, statusMessage: 'Aucun lot ouvert à diffuser sur ce dossier.' })
  }

  // 5. Résolution tardive de la zone (D-06) — au clic, pas à la qualification.
  const zone = await matchZone(supabase, req.project_postal_code)
  if (!zone) {
    throw createError({
      statusCode: 422,
      statusMessage: `Le code postal ${req.project_postal_code} n'est couvert par aucune zone active — diffusion impossible.`,
    })
  }

  for (const lot of lots) {
    if (lot.zone_id !== zone.id) {
      await supabase.from('b2b_tender_lots').update({ zone_id: zone.id }).eq('id', lot.id)
      lot.zone_id = zone.id
    }
  }

  // 6. Diffusion, non-bloquante par lot
  const maxPerDay = Number(config.b2bMaxNotificationsPerArtisanPerDay ?? 5)
  const siteUrl = (config.public?.siteUrl as string) || 'https://bati-axe.pages.dev'
  let sent = 0
  let skipped = 0
  let failed = 0
  let lotsDiffused = 0
  for (const lot of lots) {
    try {
      const r = await notifyMatchedB2bPros(supabase, req, { ...lot, zone_id: zone.id }, { siteUrl, maxPerDay })
      sent += r.sent
      skipped += r.skipped
      failed += r.failed
      lotsDiffused++
    } catch (err) {
      console.error(`[P8] Échec diffusion lot ${lot.id}:`, err)
      failed++
    }
  }

  // 7. Audit log (non-bloquant)
  try {
    await supabase.from('audit_logs').insert({
      actor_id: (user as any).id,
      action: 'b2b_tender_diffused',
      target_table: 'b2b_requests',
      target_id: id,
      metadata: { zone_id: zone.id, lots_diffused: lotsDiffused, notifications_sent: sent, notifications_skipped: skipped },
    })
  } catch { /* non-blocking */ }

  // 8. Réponse — compteurs uniquement (T-08-03, jamais la liste nominative des pros)
  return {
    status: 'SUCCESS',
    zone: zone.name,
    lots_diffused: lotsDiffused,
    notifications_sent: sent,
    notifications_skipped: skipped,
    notifications_failed: failed,
  }
})
