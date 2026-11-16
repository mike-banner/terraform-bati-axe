// Plafond de création de dossiers B2B (anti mail-bombing : chaque dossier envoie des e-mails à l'adresse saisie).
// Compté EN BASE (b2b_requests) : le compteur mémoire de rateLimit.ts n'est pas fiable sur Cloudflare Workers
// (une instance par requête → jamais de blocage, constaté sur le dev).
// Fenêtre glissante de 60 min. Un partenaire légitime peut déposer plusieurs dossiers à la suite (plusieurs lots
// d'un même dossier ne comptent qu'une fois) ; le plafond ne vise que l'envoi massif d'e-mails à un tiers.
export const B2B_REQUESTS_PER_EMAIL_PER_HOUR = 10
export const B2B_REQUESTS_PER_IP_PER_HOUR = 20
const HOUR_MS = 3_600_000

export type B2bQuotaVerdict = 'ok' | 'email' | 'ip'

export async function checkB2bRequestQuota(
  supabase: any,
  who: { email: string, ip: string | null },
  now: number = Date.now(),
): Promise<B2bQuotaVerdict> {
  const since = new Date(now - HOUR_MS).toISOString()

  const byEmail = await supabase.from('b2b_requests')
    .select('id', { count: 'exact', head: true })
    .eq('contact_email', who.email.toLowerCase()).gt('created_at', since)
  // Échec de lecture : on laisse passer plutôt que de bloquer un vrai partenaire (le dossier reste tracé en base).
  if (byEmail.error) console.error('[b2b-quota] lecture par e-mail', byEmail.error.message)
  else if ((byEmail.count ?? 0) >= B2B_REQUESTS_PER_EMAIL_PER_HOUR) return 'email'

  if (who.ip) {
    const byIp = await supabase.from('b2b_requests')
      .select('id', { count: 'exact', head: true })
      .eq('consent_ip', who.ip).gt('created_at', since)
    if (byIp.error) console.error('[b2b-quota] lecture par IP', byIp.error.message)
    else if ((byIp.count ?? 0) >= B2B_REQUESTS_PER_IP_PER_HOUR) return 'ip'
  }
  return 'ok'
}
