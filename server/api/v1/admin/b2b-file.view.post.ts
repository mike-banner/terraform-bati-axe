import { AwsClient } from 'aws4fetch'
import { serverSupabaseUser } from '#supabase/server'
import { z } from 'zod'

// 05.10-06 (B2B-04) : lien signé de lecture pour les pièces uploadées par un apporteur.
// Les fichiers B2B vivent dans le bucket R2_BUCKET (bati-axe-uploads), distinct de
// R2_BUCKET_NAME (batiaxe-documents) utilisé pour les documents de vérification.

const schema = z.object({ file_key: z.string().min(1) })

function getAwsClient(config: any, env: any) {
  const accessKeyId = config.r2AccessKeyId || env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || ''
  const secretAccessKey = config.r2SecretAccessKey || env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || ''
  return new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' })
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.email) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  if ((user as any).app_metadata?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })
  }

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'file_key requis.' })

  const config = useRuntimeConfig(event)
  const env = event.context.cloudflare?.env || {}

  const accountId = config.r2AccountId || env.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || ''
  // 05.14 — B2B view : bucket B2B
  const bucket = config.r2BucketB2b || env.NUXT_R2_BUCKET_B2B || config.r2Bucket || env.R2_BUCKET_B2B || env.R2_BUCKET || process.env.R2_BUCKET_B2B || process.env.R2_BUCKET || 'bati-axe-uploads'

  const aws = getAwsClient(config, env)
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${parsed.data.file_key}`)
  url.searchParams.set('X-Amz-Expires', '300')

  const request = await aws.sign(url, {
    method: 'GET',
    aws: { signQuery: true }
  })

  return { status: 'SUCCESS', signedUrl: request.url }
})
