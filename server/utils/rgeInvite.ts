import { renderEmail } from './emailLayout'

// Pure : aucun import Nuxt (testable en vitest node).
export const RGE_CATEGORY = 'renovation_energetique'

/** Vrai uniquement à l'AJOUT du métier (absent avant, présent après) pour un pro dont le RGE n'est pas valide. */
export function shouldInviteToRge(opts: {
  previousCategories?: string[] | null
  nextCategories?: string[] | null
  rgeStatus?: string | null
}): boolean {
  if (!opts.nextCategories?.includes(RGE_CATEGORY)) return false
  if (opts.previousCategories?.includes(RGE_CATEGORY)) return false
  return opts.rgeStatus !== 'valid'
}

export function buildRgeInviteEmail(siteUrl: string): { subject: string; html: string; text: string } {
  const href = `${siteUrl}/espace/dashboard`
  const subject = 'Rénovation énergétique : déposez votre attestation RGE'
  const intro = 'Vous venez d\'ajouter le métier « Rénovation énergétique » à votre profil BÂTI-AXE.'
  const p1 = 'Les chantiers de rénovation énergétique (pompe à chaleur, solaire, isolation thermique…) ne sont proposés qu\'aux entreprises RGE dont l\'assurance décennale est valide.'
  const p2 = 'Pensez à vérifier que votre décennale couvre bien ces travaux.'
  const label = 'Déposer mon attestation RGE'
  const style = 'margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155;'
  return {
    subject,
    html: renderEmail({
      title: subject,
      intro,
      bodyHtml: `<p style="${style}">${p1}</p><p style="${style}">${p2}</p>`,
      cta: { label, href },
    }),
    text: `${intro}\n\n${p1}\n\n${p2}\n\n${label} : ${href}\n\nBÂTI-AXE — contact@bati-axe.com`,
  }
}
