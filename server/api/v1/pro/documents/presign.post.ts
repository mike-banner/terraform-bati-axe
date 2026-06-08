import { z } from 'zod'
import { serverSupabaseUser } from '#supabase/server'
import { AwsClient } from 'aws4fetch'

const presignSchema = z.object({
  document_type: z.enum(['kbis', 'decennale']),
  filename: z.string().min(1),
  pro_id: z.string().uuid().optional()
})

function getAwsClient(config: any) {
  return new AwsClient({
    accessKeyId: config.r2AccessKeyId || 'mock',
    secretAccessKey: config.r2SecretAccessKey || 'mock',
    service: 's3',
    region: 'auto'
  })
}

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig(event)
    
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
    const contentType = extension === 'pdf' ? 'application/pdf' : `image/${extension}`
    
    // Fallbacks sécurisés
    const accountId = config.r2AccountId || 'mock'
    const bucket = config.r2BucketName || 'batiaxe-documents'
    const fileKey = `${targetUserId}/${document_type}-${Date.now()}.${extension}`

    // 4. Generate presigned PUT URL using aws4fetch (Edge compatible)
    const aws = getAwsClient(config)
    const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${fileKey}`)
    
    // On ne passe PAS de headers ici pour éviter que la signature ne soit trop stricte.
    // Si on signe le Content-Type et que le navigateur envoie un Content-Type légèrement différent
    // (ex: rajout de charset), R2 rejette avec 403, ce qui déclenche une erreur CORS "Failed to fetch".
    const request = await aws.sign(url, {
      method: 'PUT',
      aws: { signQuery: true }
    })

    return {
      status: 'SUCCESS',
      signedUrl: request.url,
      fileKey
    }
  } catch (err: any) {
    console.error('[presign API error]', err)
    throw createError({
      statusCode: 400, // On force 400 au lieu de 500 car Nuxt masque les 500 en prod !
      statusMessage: 'Storage Error',
      message: err.message || String(err)
    })
  }
})
