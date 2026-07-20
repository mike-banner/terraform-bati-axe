// Codes "nature juridique" INSEE renvoyés par recherche-entreprises.api.gouv.fr — non exhaustif,
// couvre les formes courantes chez les artisans du bâtiment. Code inconnu -> null (pas d'affichage).
const LEGAL_FORM_LABELS: Record<string, string> = {
  '1000': 'Entrepreneur individuel',
  '5385': 'EURL',
  '5498': 'SARL',
  '5499': 'SARL',
  '5599': 'SA',
  '5710': 'SAS',
  '5720': 'SASU',
}

export function legalFormLabel(code: string | null | undefined): string | null {
  if (!code) return null
  return LEGAL_FORM_LABELS[code] ?? null
}
