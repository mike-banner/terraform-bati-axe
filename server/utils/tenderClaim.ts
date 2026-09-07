import { renderEmail } from './emailLayout'
import { CATEGORY_LABELS } from './categoryLabels'

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
}): { subject: string; html: string } {
  const label = CATEGORY_LABELS[opts.lotCategory] ?? opts.lotCategory

  const detailsHtml = `
    <table style="width:100%;border-collapse:collapse;margin:8px 0 0;">
      <tr><td style="padding:8px 0;font-size:13px;color:#64748B;">Entreprise</td><td style="padding:8px 0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${opts.proCompany}</td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Interlocuteur</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${opts.proContactName || '—'}</td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Téléphone</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${opts.proPhone || '—'}</td></tr>
      <tr><td style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;">Email</td><td style="padding:8px 0;border-top:1px solid #E2E8F0;text-align:right;font-size:13px;color:#0F172A;font-weight:600;">${opts.proEmail}</td></tr>
    </table>`

  const footerNote = opts.remainingSlots === 0
    ? 'Cet appel d\'offres est désormais clos, aucun autre artisan ne peut s\'y positionner.'
    : `${opts.remainingSlots} artisan(s) supplémentaire(s) peuvent encore se positionner.`

  const html = renderEmail({
    title: 'Un artisan est intéressé par votre appel d\'offres',
    preheader: `Un artisan certifié BÂTI-AXE s'est positionné sur votre appel d'offres ${label}.`,
    intro: `Bonjour ${opts.contactName || ''}, un artisan certifié BÂTI-AXE s'est positionné sur le lot ${label} de votre appel d'offres (réf. ${opts.requestRef}).`,
    bodyHtml: detailsHtml,
    cta: { label: 'Contacter l\'artisan', href: `mailto:${opts.proEmail}` },
    footerNote,
  })

  return {
    subject: `Un artisan est intéressé par votre appel d'offres ${label} — réf. ${opts.requestRef}`,
    html,
  }
}
