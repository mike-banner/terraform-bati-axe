export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export type RgeUploadCheck =
  | { ok: false; error: string }
  | { ok: true; status: 'pending'; expiry_date: string }

/**
 * Dépôt d'une attestation RGE (05.19-17) : date YYYY-MM-DD réelle, strictement future,
 * obligatoire ; jamais auto-approuvée (statut forcé « pending »).
 * Renvoie null si le type n'est pas 'rge'.
 */
export function validateRgeUpload(
  documentType: string,
  expirationDate: string | undefined,
  today = new Date().toISOString().slice(0, 10),
): RgeUploadCheck | null {
  if (documentType !== 'rge') return null
  if (!expirationDate) return { ok: false, error: "Date d'expiration requise." }
  const d = expirationDate
  // Rejette aussi les dates inexistantes (2027-02-30) par aller-retour ISO
  if (!ISO_DATE.test(d) || isNaN(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d) {
    return { ok: false, error: 'Date invalide.' }
  }
  if (d <= today) return { ok: false, error: "La date d'expiration doit être future." }
  return { ok: true, status: 'pending', expiry_date: d }
}
