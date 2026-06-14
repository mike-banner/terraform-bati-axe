import { serverSupabaseServiceRole } from '#supabase/server'
import { AwsClient } from 'aws4fetch'

// Option B — proxy logo : sert le logo d'un pro depuis le bucket R2 PRIVÉ,
// sans exposer le bucket (les documents KBIS/décennale restent privés).
// Route publique (le logo est de la com' publique). Clé = canonical_slug.
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug manquant' })

  const config = useRuntimeConfig(event)
  const accountId = config.r2AccountId || process.env.R2_ACCOUNT_ID
  const bucket = config.r2BucketName || process.env.R2_BUCKET_NAME || 'batiaxe-documents'
  const accessKeyId = config.r2AccessKeyId || process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = config.r2SecretAccessKey || process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw createError({ statusCode: 500, statusMessage: 'Configuration R2 manquante.' })
  }

  // Reconstruit le préfixe du dossier pro (même logique que buildStorageKey).
  const sb = serverSupabaseServiceRole(event) as any
  const { data: pro } = await sb
    .from('professionals')
    .select('id, short_id, canonical_slug')
    .eq('canonical_slug', slug)
    .maybeSingle()
  if (!pro) throw createError({ statusCode: 404, statusMessage: 'Profil introuvable.' })

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  const shortId = pro.short_id ? sanitize(pro.short_id) : ''
  const slugPart = pro.canonical_slug ? sanitize(pro.canonical_slug) : ''
  const proFolder = (shortId || slugPart) ? [shortId, slugPart].filter(Boolean).join('__') : pro.id
  const prefix = `${proFolder}/logo/`

  const aws = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' })
  const base = `https://${accountId}.r2.cloudflarestorage.com/${bucket}`

  // Liste les objets sous le préfixe logo/ et prend le plus récent (timestamp dans le nom).
  const listRes = await aws.fetch(`${base}?list-type=2&prefix=${encodeURIComponent(prefix)}`)
  if (!listRes.ok) throw createError({ statusCode: 502, statusMessage: 'Erreur R2 (list).' })
  const xml = await listRes.text()
  const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map(m => m[1]).sort()
  if (keys.length === 0) throw createError({ statusCode: 404, statusMessage: 'Aucun logo.' })
  const latest = keys[keys.length - 1]!

  const objUrl = `${base}/${latest.split('/').map(encodeURIComponent).join('/')}`
  const objRes = await aws.fetch(objUrl)
  if (!objRes.ok || !objRes.body) throw createError({ statusCode: 404, statusMessage: 'Logo introuvable.' })

  return new Response(objRes.body, {
    status: 200,
    headers: {
      'Content-Type': objRes.headers.get('content-type') || 'image/webp',
      'Cache-Control': 'public, max-age=300',
    },
  })
})
