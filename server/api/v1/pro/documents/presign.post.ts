import { z } from 'zod'
import { serverSupabaseUser } from '#supabase/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const presignSchema = z.object({
  document_type: z.enum(['kbis', 'decennale']),
  filename: z.string().min(1)
})

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID || 'mock-account-id'
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || 'mock-access-key-id'
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || 'mock-secret-access-key'

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey }
  })
}

export default defineEventHandler(async (event) => {
  // 1. Authenticate
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userId: string | null = (user as any).id ?? (user as any).sub ?? (user as any).user_metadata?.sub ?? null

  // 2. Validate payload
  const body = await readBody(event)
  const validation = presignSchema.safeParse(body)
  if (!validation.success) {
    throw createError({ statusCode: 400, statusMessage: 'Validation failed', data: validation.error.format() })
  }

  const { document_type, filename } = validation.data
  const extension = filename.split('.').pop()?.toLowerCase() || 'pdf'
  const bucket = process.env.R2_BUCKET_NAME || 'batiaxe-documents'

  // 3. Isolated path per user — prevents path traversal
  const fileKey = `${userId}/${document_type}-${Date.now()}.${extension}`

  // 4. Generate presigned PUT URL (expires in 15 minutes)
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileKey,
    ContentType: extension === 'pdf' ? 'application/pdf' : `image/${extension}`
  })

  let signedUrl: string
  try {
    signedUrl = await getSignedUrl(client, command, { expiresIn: 900 })
  } catch (err: any) {
    console.error('[presign] R2 getSignedUrl failed:', err?.message ?? err)
    throw createError({
      statusCode: 502,
      statusMessage: 'Storage unavailable',
      message: `R2 error: ${err?.message ?? 'unknown'}`
    })
  }

  return {
    status: 'SUCCESS',
    signedUrl,
    fileKey
  }
})
