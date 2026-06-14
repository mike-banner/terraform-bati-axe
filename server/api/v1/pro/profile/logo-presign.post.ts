import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { AwsClient } from 'aws4fetch'

// CNV-05 D-17: logo upload presigned URL — mirrors documents/presign.post.ts pattern
// T-04.5-16: 5 MB content length cap; T-04.5-17: SVG in allow-list (known XSS risk — serve with CSP or proxy)

const VALID_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'] as const

const presignSchema = z.object({
  content_type: z.enum(VALID_MIME, { message: "Format d'image non supporté." }),
  filename: z.string().min(1).max(255),
})

function getAwsClient(config: any, env: any) {
  const accessKeyId = config.r2AccessKeyId || env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || 'mock'
  const secretAccessKey = config.r2SecretAccessKey || env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || 'mock'
  if (accessKeyId === 'mock' || secretAccessKey === 'mock') {
    console.warn('WARNING: Missing R2 credentials, using mock')
  }
  return new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' })
}

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig(event)
    const env = event.context.cloudflare?.env || {}

    const user = await serverSupabaseUser(event)
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

    const body = await readBody(event)
    const parsed = presignSchema.safeParse(body)
    if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Validation échouée', data: parsed.error.format() })

    const { content_type, filename } = parsed.data

    const accountId = config.r2AccountId || env.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || 'mock'
    const bucket = config.r2BucketName || env.R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || 'batiaxe-documents'
    const r2PublicBaseUrl = config.r2PublicBaseUrl || env.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_BASE_URL || ''

    // Résolution défensive de l'id (comme documents/presign) : selon le runtime,
    // user.id peut être undefined alors que l'id réel est dans user.sub.
    const userId = (user as any).id ?? (user as any).sub ?? (user as any).user_metadata?.sub ?? null
    if (!userId) throw createError({ statusCode: 401, statusMessage: 'Identifiant utilisateur introuvable.' })

    // Clé lisible et historisée : {short_id}__{slug}/logo/logo_{date}_{rand8}.{ext}
    const sb = serverSupabaseServiceRole(event) as any
    const { data: pro } = await sb.from('professionals').select('short_id, canonical_slug').eq('id', userId).maybeSingle()
    const { fileKey } = buildStorageKey({ shortId: pro?.short_id, slug: pro?.canonical_slug, userId, type: 'logo', filename })

    const aws = getAwsClient(config, env)
    const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${fileKey}`)

    // 5 MB max (T-04.5-16) — encoded via Content-Length in signed headers
    const MAX_SIZE = 5 * 1024 * 1024 // 5_242_880

    const request = await aws.sign(url, {
      method: 'PUT',
      headers: { 'Content-Type': content_type, 'Content-Length': String(MAX_SIZE) },
      aws: { signQuery: true }
    })

    const publicUrl = r2PublicBaseUrl ? `${r2PublicBaseUrl}/${fileKey}` : ''

    return { status: 'SUCCESS', signedUrl: request.url, fileKey, publicUrl }
  } catch (err: any) {
    console.error('[logo-presign error]', err)
    throw createError({ statusCode: 400, statusMessage: 'Storage Error', message: err.message || String(err) })
  }
})
