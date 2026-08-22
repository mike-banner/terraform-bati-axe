import { z } from 'zod'
import { AwsClient } from 'aws4fetch'
import { verifyTurnstile } from '../../../utils/verifyTurnstile'

const ALLOWED_EXTENSIONS = ['pdf', 'dwg', 'dxf', 'png', 'jpg', 'jpeg', 'zip', 'docx']
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 Mo

const schema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string(),
  size: z.number().positive().max(MAX_FILE_SIZE),
  turnstile_token: z.string().optional(),
})

function buildStorageKey(filename: string): string {
  const ext = filename.split('.').pop() || 'bin'
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
  const random = Math.random().toString(36).slice(2, 10)
  return `b2b-uploads/${date}/${random}.${ext}`
}

function getAwsClient(config: any, env: any) {
  const accessKeyId = config.r2AccessKeyId || env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || 'mock'
  const secretAccessKey = config.r2SecretAccessKey || env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || 'mock'
  return new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' })
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const env = event.context.cloudflare?.env || {}

  // Turnstile verification (if key configured)
  const turnstileSecret = config.turnstileSecretKey || env.NUXT_TURNSTILE_SECRET_KEY || process.env.NUXT_TURNSTILE_SECRET_KEY

  if (turnstileSecret) {
    const body = await readBody(event)
    const token = body?.turnstile_token
    if (!token) {
      throw createError({ statusCode: 400, statusMessage: 'Token Turnstile requis.' })
    }
    const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    const valid = await verifyTurnstile(token, ip)
    if (!valid) {
      throw createError({ statusCode: 403, statusMessage: 'Vérification anti-bot échouée.' })
    }
  }

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Données invalides.', data: parsed.error.format() })
  }

  const { filename, content_type, size } = parsed.data

  // Extension allow-list check
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw createError({ statusCode: 415, statusMessage: 'Type de fichier non autorisé.' })
  }

  // Generate presigned URL
  const storageKey = buildStorageKey(filename)
  const s3 = getAwsClient(config, env)

  const bucket = config.r2Bucket || env.R2_BUCKET || process.env.R2_BUCKET || 'bati-axe-uploads'
  const accountId = config.r2AccountId || env.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID

  const r2Url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${storageKey}`)
  const request = await s3.sign(r2Url, {
    method: 'PUT',
    aws: { signQuery: true }
  })

  return {
    status: 'SUCCESS',
    signedUrl: request.url,
    fileKey: storageKey,
  }
})
