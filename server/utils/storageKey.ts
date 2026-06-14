import crypto from 'node:crypto'

// Construit une clé d'objet R2 lisible et historisée :
//   {short_id}__{slug}/{type}/{type}_{YYYYMMDD-HHMMSS}_{rand8}.{ext}
// - regroupe tous les fichiers d'un pro dans un dossier lisible (1 dossier/pro) ;
// - jette le nom d'origine (seule l'extension assainie est conservée) ;
// - horodatage + rand8 → unique et trace de renouvellement (rien n'est écrasé).
// Repli sur l'UUID utilisateur si short_id/slug manquent.
export function buildStorageKey(opts: {
  shortId?: string | null
  slug?: string | null
  userId: string
  type: string // 'kbis' | 'decennale' | 'logo'
  filename: string
}): { fileKey: string } {
  const sanitize = (s: string) =>
    s.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')

  const shortId = opts.shortId ? sanitize(opts.shortId) : ''
  const slug = opts.slug ? sanitize(opts.slug) : ''
  const proFolder = (shortId || slug) ? [shortId, slug].filter(Boolean).join('__') : opts.userId

  const ext = ((opts.filename.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')) || 'bin'
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-') // 20260614-104500
  const rand8 = crypto.randomBytes(4).toString('hex')
  const type = sanitize(opts.type)

  return { fileKey: `${proFolder}/${type}/${type}_${stamp}_${rand8}.${ext}` }
}
