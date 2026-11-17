import { sendEmail } from './email'
import { renderEmail } from './emailLayout'
import { escapeHtml } from './contracts'

export type LotClosedReason = 'awarded' | 'outside_platform' | 'expired'

/**
 * Artisans prévenus de la clôture d'un lot : ceux qui ont reçu l'appel d'offres
 * (b2b_tender_notifications) sans s'engager (aucun avenant signé). Les engagés
 * (retenu ou non retenu) ont déjà leur propre e-mail.
 */
export function selectClosedLotRecipients(notifiedProIds: string[], engagedProIds: string[]): string[] {
  const engaged = new Set(engagedProIds)
  return [...new Set(notifiedProIds)].filter(id => !engaged.has(id))
}

const INTRO: Record<LotClosedReason, string> = {
  awarded: 'Le partenaire a retenu un artisan',
  outside_platform: 'Le partenaire a retenu une entreprise hors plateforme',
  expired: 'Le partenaire n\'a retenu aucun artisan dans le délai prévu',
}

/** Jamais bloquant : toute erreur est journalisée et ignorée. */
export async function notifyLotClosedPros(
  supabase: any,
  opts: { lotId: string, label: string, ref: string, reason: LotClosedReason, siteUrl: string },
): Promise<{ sent: number }> {
  try {
    const { data: notified } = await supabase.from('b2b_tender_notifications').select('pro_id').eq('lot_id', opts.lotId)
    const { data: engaged } = await supabase.from('b2b_engagements').select('pro_id').eq('type', 'lot_amendment').eq('lot_id', opts.lotId)
    const ids = selectClosedLotRecipients(
      (Array.isArray(notified) ? notified : []).map((r: any) => r.pro_id),
      (Array.isArray(engaged) ? engaged : []).map((r: any) => r.pro_id),
    )
    if (ids.length === 0) return { sent: 0 }

    const { data: pros } = await supabase
      .from('professionals').select('id, email').in('id', ids).eq('b2b_alerts_email', true)

    let sent = 0
    for (const p of Array.isArray(pros) ? pros : []) {
      if (!p.email) continue
      try {
        await sendEmail({
          to: p.email,
          sender: 'notifications',
          subject: 'Appel d\'offres clos',
          html: renderEmail({
            title: 'Appel d\'offres clos',
            intro: `${INTRO[opts.reason]} pour le lot ${escapeHtml(opts.label)} (dossier réf. ${escapeHtml(opts.ref)}). Vous n'aviez pas signé d'avenant : vous n'êtes engagé à rien.`,
            cta: { label: 'Voir les appels d\'offres', href: `${opts.siteUrl}/espace/appels-offres` },
          }),
        })
        sent++
      } catch (err) {
        console.error('[05.23] Échec e-mail pro (lot clos, sans avenant):', err)
      }
    }
    return { sent }
  } catch (err) {
    console.error('[05.23] notifyLotClosedPros erreur globale:', err)
    return { sent: 0 }
  }
}
