import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { listLotAudience } from '../../../../../utils/notifyB2bPros'
import { matchZone } from '../../../../../utils/zoneMatcher'

// Écran admin « qui a reçu l'appel d'offres » : pour chaque lot, les artisans dont le profil
// correspond (zone active + métier) et leur état — notifié, à notifier, plafond du jour, exclu.
// Réservé admin : expose nom et e-mail des artisans (contrairement à la réponse de /diffuse).
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  if ((user as any).app_metadata?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const idParsed = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) throw createError({ statusCode: 400, statusMessage: 'id invalide.' })
  const id = idParsed.data

  const supabase = await serverSupabaseServiceRole(event) as any
  const { data: req } = await supabase
    .from('b2b_requests').select('id, project_postal_code').eq('id', id).maybeSingle()
  if (!req) throw createError({ statusCode: 404, statusMessage: 'Dossier introuvable.' })

  const { data: lots } = await supabase
    .from('b2b_tender_lots').select('id, category, zone_id, status').eq('request_id', id).order('created_at')

  const { count: diffusions } = await supabase
    .from('audit_logs').select('id', { count: 'exact', head: true })
    .eq('action', 'b2b_tender_diffused').eq('target_id', id)

  const config = useRuntimeConfig(event)
  const maxPerDay = Number(config.b2bMaxNotificationsPerArtisanPerDay ?? 5)

  // Zone non encore résolue (dossier pas diffusé) : aperçu via le code postal.
  const previewZone = (lots ?? []).some((l: any) => !l.zone_id) && req.project_postal_code
    ? await matchZone(supabase, req.project_postal_code)
    : null

  const out = []
  for (const lot of lots ?? []) {
    const zoneId = lot.zone_id ?? previewZone?.id ?? null
    const audience = zoneId ? await listLotAudience(supabase, { id: lot.id, category: lot.category, zone_id: zoneId }, maxPerDay) : []
    const count = (s: string) => audience.filter(a => a.state === s).length
    out.push({
      lot_id: lot.id,
      category: lot.category,
      status: lot.status,
      zone_resolved: Boolean(zoneId),
      audience,
      totals: { notified: count('notified'), pending: count('pending'), capped: count('capped'), excluded: count('excluded') },
    })
  }

  return { diffused: (diffusions ?? 0) > 0, lots: out }
})
