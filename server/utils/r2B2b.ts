// Phase 05.23 — URL pré-signées du bucket B2B (devis déposés par les partenaires).
// ADR-003 : documents sensibles sur R2 privé, URL générées côté Nitro, jamais de fichier en base.
import { AwsClient } from 'aws4fetch'

export const QUOTE_KEY_REGEX = /^b2b-quotes\/[0-9a-f-]{36}\/[0-9a-f]{32}\.pdf$/

export function buildQuoteKey(engagementId: string): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `b2b-quotes/${engagementId}/${hex}.pdf`
}

// Pour un PUT, `upload` verrouille le type et la taille dans la signature : R2 refuse tout envoi qui s'en écarte.
export async function signB2bObjectUrl(
  event: any, key: string, method: 'PUT' | 'GET' | 'HEAD', expiresSec = 300,
  upload?: { contentType: string; contentLength: number },
): Promise<string> {
  const config = useRuntimeConfig(event) as any
  const env = event.context.cloudflare?.env || {}
  const accessKeyId = config.r2AccessKeyId || env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = config.r2SecretAccessKey || env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY
  const bucket = config.r2BucketB2b || env.NUXT_R2_BUCKET_B2B || config.r2Bucket || env.R2_BUCKET_B2B || env.R2_BUCKET || process.env.R2_BUCKET_B2B || process.env.R2_BUCKET || 'bati-axe-uploads'
  const accountId = config.r2AccountId || env.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID
  // Pas de repli « mock » : on lit des données de clients finaux.
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw createError({ statusCode: 500, statusMessage: 'Stockage indisponible.' })
  }
  const aws = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' })
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`)
  url.searchParams.set('X-Amz-Expires', String(expiresSec))
  // Lecture : on force un PDF servi en pièce jointe, quel que soit le type enregistré sur l'objet.
  if (method === 'GET') {
    url.searchParams.set('response-content-type', 'application/pdf')
    url.searchParams.set('response-content-disposition', 'attachment; filename="devis.pdf"')
  }
  if (method === 'PUT' && upload) {
    return (await aws.sign(url, {
      method,
      headers: { 'Content-Type': upload.contentType, 'Content-Length': String(upload.contentLength) },
      aws: { signQuery: true, allHeaders: true },
    })).url
  }
  return (await aws.sign(url, { method, aws: { signQuery: true } })).url
}
