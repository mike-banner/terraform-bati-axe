// 06.3 — Layout HTML unique pour tous les e-mails transactionnels BÂTI-AXE.
// Pure : aucun import Nuxt, aucun accès runtimeConfig (testable en vitest node).
// Styles inline uniquement (Gmail/Outlook strippent le <head>).

export interface EmailCta {
  label: string
  href: string
}

export interface EmailLayoutOptions {
  title: string
  preheader?: string
  intro?: string
  bodyHtml?: string
  cta?: EmailCta
  footerNote?: string
}

const LCEN_FOOTER = `BÂTI-AXE — Mise en relation entre particuliers et artisans certifiés du bâtiment. Ce message transactionnel vous est adressé dans le cadre de l'exécution du service auquel vous avez souscrit (art. L34-5 du Code des postes et des communications électroniques, LCEN). Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et d'effacement de vos données : contact@bati-axe.com.`

export function renderEmail(opts: EmailLayoutOptions): string {
  const preheaderHtml = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>`
    : ''

  const introHtml = opts.intro
    ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155;">${opts.intro}</p>`
    : ''

  const bodyHtml = opts.bodyHtml ?? ''

  const ctaHtml = opts.cta
    ? `<p style="margin:24px 0 0;"><a href="${opts.cta.href}" style="display:inline-block;background:#EA580C;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">${opts.cta.label}</a></p>`
    : ''

  const footerNoteHtml = opts.footerNote
    ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748B;">${opts.footerNote}</p>`
    : ''

  return `<div style="margin:0;padding:24px;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${preheaderHtml}<div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;padding:32px;"><p style="margin:0 0 24px;font-weight:700;font-size:14px;letter-spacing:0.08em;color:#EA580C;">BÂTI-AXE</p><h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#0F172A;">${opts.title}</h1>${introHtml}${bodyHtml}${ctaHtml}${footerNoteHtml}<hr style="margin:28px 0 16px;border:none;border-top:1px solid #E2E8F0;"><p style="margin:0;font-size:11px;line-height:1.6;color:#94A3B8;">${LCEN_FOOTER}</p></div></div>`
}
