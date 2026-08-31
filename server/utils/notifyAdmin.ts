import { useRuntimeConfig } from '#imports'
import { sendEmail } from './email'
import { renderEmail, type EmailCta } from './emailLayout'

/**
 * 06.3 — Alerte admin centralisée (destinataire : NUXT_ADMIN_EMAIL).
 * Jamais bloquant : toute erreur est loggée et avalée, l'appelant répond normalement.
 */
export async function notifyAdmin(options: {
  subject: string
  title: string
  intro?: string
  bodyHtml?: string
  cta?: EmailCta
}): Promise<void> {
  try {
    const config = useRuntimeConfig()
    const to = (config as any).adminEmail
    if (!to) {
      console.warn('[notifyAdmin] NUXT_ADMIN_EMAIL non configuré — alerte ignorée:', options.subject)
      return
    }
    await sendEmail({
      to,
      subject: `[BÂTI-AXE ADMIN] ${options.subject}`,
      sender: 'notifications',
      html: renderEmail({
        title: options.title,
        intro: options.intro,
        bodyHtml: options.bodyHtml,
        cta: options.cta,
      }),
    })
  } catch (err) {
    console.error('[notifyAdmin] échec envoi alerte admin:', err)
  }
}

/** Helper de rendu d'un tableau clé/valeur pour le corps des alertes admin. */
export function adminDetailsTable(rows: Array<[string, string]>): string {
  return `<table style="width:100%;border-collapse:collapse;margin:8px 0 0;">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;width:180px;">${k}</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#0F172A;font-weight:600;">${v}</td></tr>`,
    )
    .join('')}</table>`
}
