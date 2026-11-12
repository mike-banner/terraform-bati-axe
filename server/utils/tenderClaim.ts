import { renderEmail } from './emailLayout'
import { CATEGORY_LABELS } from './categoryLabels'
import { escapeHtml } from './contracts'

// TEND-03 / D-04 — un AO confirmé est exclusif (1 seul artisan) ; un AO encore
// en attente de décision accepte jusqu'à 3 artisans intéressés.
export function tenderCap(decisionStatus?: string | null): number {
  return decisionStatus === 'confirme' ? 1 : 3
}

// TEND-12 — le lot se clôt dès que le cap est atteint (comptage APRÈS insertion).
export function shouldCloseLot(opts: { decisionStatus?: string | null; claimsAfter: number }): boolean {
  return opts.claimsAfter >= tenderCap(opts.decisionStatus)
}

// TEND-16 — email structuré au partenaire : sujet identifiable, référence AO,
// coordonnées de l'artisan intéressé.
export function renderTenderClaimEmail(opts: {
  requestRef: string
  lotCategory: string
  contactName?: string | null
  proCompany: string
  proContactName?: string | null
  proEmail: string
  proPhone?: string | null
  remainingSlots: number
  siteUrl: string
  // 05.23 : lien de l'espace partenaire pour choisir l'artisan (jeton).
  chooseLink?: string | null
}): { subject: string; html: string } {
  const rawLabel = CATEGORY_LABELS[opts.lotCategory] ?? opts.lotCategory
  // HTML : échappé. Le sujet de l'e-mail est du texte brut et utilise rawLabel.
  const label = escapeHtml(rawLabel)
  const ref = escapeHtml(opts.requestRef)

  const detailsHtml = `
    <table style="width:100%;border-collapse:collapse;margin:8px 0 0;">
      <tr><td style="padding:8px 0;font-size:13px;color:#64748B;">Entreprise</td><td style="padding:8px 0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${escapeHtml(opts.proCompany)}</td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Interlocuteur</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${escapeHtml(opts.proContactName || '—')}</td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Téléphone</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${escapeHtml(opts.proPhone || '—')}</td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Email</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${escapeHtml(opts.proEmail)}</td></tr>
    </table>`

  const footerNote = opts.remainingSlots === 0
    ? 'Cet appel d\'offres est désormais clos, aucun autre artisan ne peut s\'y positionner.'
    : `${opts.remainingSlots} artisan(s) supplémentaire(s) peuvent encore se positionner.`

  const html = renderEmail({
    title: 'Un artisan est intéressé par votre appel d\'offres',
    preheader: `Un artisan certifié BÂTI-AXE s'est positionné sur votre appel d'offres ${label}.`,
    intro: `Bonjour ${escapeHtml(opts.contactName || '')}, un artisan certifié BÂTI-AXE s'est positionné sur le lot ${label} de votre appel d'offres (réf. ${ref}).${opts.chooseLink ? ' Vous retiendrez un seul artisan par lot depuis votre espace.' : ''}`,
    bodyHtml: detailsHtml,
    cta: opts.chooseLink
      ? { label: 'Voir les artisans intéressés et choisir', href: opts.chooseLink }
      : { label: 'Contacter l\'artisan', href: `mailto:${opts.proEmail}` },
    footerNote,
  })

  return {
    subject: `Un artisan est intéressé par votre appel d'offres ${rawLabel} — réf. ${opts.requestRef}`,
    html,
  }
}
