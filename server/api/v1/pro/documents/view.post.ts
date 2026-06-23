import { AwsClient } from 'aws4fetch'
import { serverSupabaseUser } from '#supabase/server'
import { z } from 'zod'

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
  const bucket = config.r2BucketName || env.R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || 'batiaxe-documents'

  const aws = getAwsClient(config, env)
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${parsed.data.file_key}`)

  // Expiration de 300 secondes (5 minutes) pour la signature
  url.searchParams.set('X-Amz-Expires', '300')

  const request = await aws.sign(url, {
    method: 'GET',
    aws: { signQuery: true }
  })

  return { status: 'SUCCESS', signedUrl: request.url }
})
