import { z } from 'zod'
import { serverSupabaseUser } from '#supabase/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const presignSchema = z.object({
  document_type: z.enum(['kbis', 'decennale']),
  filename: z.string().min(1),
  pro_id: z.string().uuid().optional()
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
  try {
    // 1. Authenticate
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
    
    // 2. Validate payload
    const body = await readBody(event)
    const validation = presignSchema.safeParse(body)
    if (!validation.success) {
      throw createError({ statusCode: 400, statusMessage: 'Validation failed', data: validation.error.format() })
    }

    const { document_type, filename, pro_id } = validation.data
    
    // Détermination de l'ID cible (Admin peut uploader pour un autre)
    let targetUserId = (user as any).id ?? (user as any).sub ?? (user as any).user_metadata?.sub ?? null
    
    if (pro_id) {
      const isAdmin = (user as any).app_metadata?.role === 'admin'
      if (!isAdmin && pro_id !== targetUserId) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admins only can upload for others' })
      }
      targetUserId = pro_id
    }

    const extension = filename.split('.').pop()?.toLowerCase() || 'pdf'
    
    // Fallbacks sécurisés
    const accountId = process.env.R2_ACCOUNT_ID || 'mock'
    const bucket = process.env.R2_BUCKET_NAME || 'batiaxe-documents'
    const fileKey = `${targetUserId}/${document_type}-${Date.now()}.${extension}`

    // 4. Generate presigned PUT URL
    const client = getR2Client()
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      ContentType: extension === 'pdf' ? 'application/pdf' : `image/${extension}`
    })

    const signedUrl = await getSignedUrl(client, command, { expiresIn: 900 })

    return {
      status: 'SUCCESS',
      signedUrl,
      fileKey
    }
  } catch (err: any) {
    console.error('[presign API error]', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Server Error',
      message: err.message || String(err)
    })
  }
})
