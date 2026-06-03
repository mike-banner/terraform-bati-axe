import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { serverSupabaseUser } from '#supabase/server'
import { z } from 'zod'

const schema = z.object({ file_key: z.string().min(1) })

function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    }
  })
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

  const r2 = getR2Client()
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || 'batiaxe-documents',
    Key: parsed.data.file_key,
  })

  const signedUrl = await getSignedUrl(r2, command, { expiresIn: 300 })

  return { status: 'SUCCESS', signedUrl }
})
