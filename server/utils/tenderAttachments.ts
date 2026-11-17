import { isTenderRevealed } from './maskTender'

// Pièces jointes d'un dossier partenaire (plans, CCTP…), consultables par l'artisan positionné.
// Le navigateur ne reçoit jamais la clé R2 : seulement un numéro, le nom et la taille.

// file_key est fourni par le partenaire à la création du dossier : on n'accepte que le format produit
// par /api/v1/b2b/presign, sinon un dossier forgé pourrait pointer vers un autre objet du bucket.
export const ATTACHMENT_KEY_REGEX = /^b2b-uploads\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9]{1,16}\.(pdf|dwg|dxf|png|jpg|jpeg|zip|docx)$/

const TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  dwg: 'application/octet-stream',
  dxf: 'application/octet-stream',
  zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}
const INLINE = new Set(['pdf', 'png', 'jpg', 'jpeg'])
const LOST_STATUSES = new Set(['not_awarded', 'commission_cancelled'])

export interface TenderAttachment { index: number, name: string, size: number, viewable: boolean }

const extOf = (key: string) => key.split('.').pop()?.toLowerCase() ?? ''

/** Droit de lecture : même règle que les coordonnées (positionné + avenant signé), perdu l'accès est retiré. */
export function canReadAttachments(
  claim: { claimed_at?: string | null } | null | undefined,
  amendment: { id: string, status?: string | null } | null | undefined,
): boolean {
  return isTenderRevealed(claim, amendment) && !LOST_STATUSES.has(String(amendment?.status ?? ''))
}

/** Pièces valides, avec leur numéro d'origine (stable : la route de téléchargement s'en sert). */
export function listAttachments(files: unknown): TenderAttachment[] {
  if (!Array.isArray(files)) return []
  const out: TenderAttachment[] = []
  files.forEach((f: any, index) => {
    if (!f || typeof f.file_key !== 'string' || !ATTACHMENT_KEY_REGEX.test(f.file_key)) return
    out.push({
      index,
      name: String(f.filename ?? 'document').slice(0, 255),
      size: Number.isFinite(Number(f.size)) ? Number(f.size) : 0,
      viewable: INLINE.has(extOf(f.file_key)),
    })
  })
  return out
}

/** Type et disposition imposés à la lecture, dérivés de l'extension (jamais du type déclaré par l'uploadeur). */
export function attachmentRead(fileKey: string, name: string): { contentType: string, disposition: string } {
  const ext = extOf(fileKey)
  const safe = name.replace(/[^\w.\- ()]/g, '_').slice(0, 120) || 'document'
  return {
    contentType: TYPES[ext] ?? 'application/octet-stream',
    disposition: `${INLINE.has(ext) ? 'inline' : 'attachment'}; filename="${safe}"`,
  }
}
