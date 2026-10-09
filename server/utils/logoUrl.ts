// URL enregistrée dans professionals.logo_url après l'envoi d'un logo.
// - R2_PUBLIC_BASE_URL définie (bucket exposé sur un domaine public) : URL directe de l'objet.
// - sinon : proxy serveur /api/v1/pro/logo/<slug> (le bucket reste privé) ; ?v= invalide le cache de 5 min
//   à chaque nouveau logo. L'URL doit être absolue : le schéma Zod de profile/me.patch exige z.string().url().
export function buildLogoPublicUrl(opts: {
  r2PublicBaseUrl?: string
  fileKey: string
  origin: string
  slug?: string | null
  now?: number
}): string {
  const { r2PublicBaseUrl, fileKey, origin, slug, now = Date.now() } = opts
  if (r2PublicBaseUrl) return `${r2PublicBaseUrl}/${fileKey}`
  if (!slug) return ''
  return `${origin}/api/v1/pro/logo/${encodeURIComponent(slug)}?v=${now}`
}
