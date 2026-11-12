// Signature électronique simple par OTP + jeton d'accès partenaire (Phase 05.21, D-04).
// Compatible Cloudflare Workers : crypto.subtle / getRandomValues uniquement.
// Tous les plafonds OTP sont comptés EN BASE (la mémoire d'un isolate Workers n'est pas partagée).
import { sendEmail } from './email'
import { renderEmail } from './emailLayout'
import { CONTRACT_VERSIONS, escapeHtml, type EngagementType } from './contracts'

export const OTP_TTL_MS = 10 * 60_000
export const OTP_MAX_ATTEMPTS = 5
export const OTP_RESEND_COOLDOWN_MS = 60_000
export const OTP_MAX_CHALLENGES_PER_HOUR = 5
export const OTP_MAX_ATTEMPTS_PER_HOUR = 15
export const PARTNER_TOKEN_TTL_MS = 30 * 86_400_000
const HOUR_MS = 3_600_000

export interface SignatureSubject { type: EngagementType; email: string; proId?: string | null; requestId?: string | null; lotId?: string | null }

const toHex = (buf: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(buf as ArrayBuffer), b => b.toString(16).padStart(2, '0')).join('')

export async function sha256Hex(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
}

export function generateOtpCode(): string {
  const a = new Uint32Array(1)
  do { crypto.getRandomValues(a) } while (a[0]! >= 4_294_000_000) // rejet : évite le biais du modulo
  return String(a[0]! % 1_000_000).padStart(6, '0')
}

export const hashOtp = (challengeId: string, code: string) => sha256Hex(`${challengeId}:${code}`)

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function evaluateChallenge(
  ch: { expires_at: string; attempts: number; consumed_at: string | null } | null,
  now: Date,
): 'ok' | 'missing' | 'expired' | 'locked' | 'consumed' {
  if (!ch) return 'missing'
  if (ch.consumed_at) return 'consumed'
  if (new Date(ch.expires_at) < now) return 'expired'
  if (ch.attempts >= OTP_MAX_ATTEMPTS) return 'locked'
  return 'ok'
}

export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@')
  const i = domain.lastIndexOf('.')
  const host = i > 0 ? domain.slice(0, i) : domain
  const tld = i > 0 ? domain.slice(i) : ''
  return `${local.charAt(0)}***@${host.charAt(0)}***${tld}`
}

export function getClientMeta(event: any): { ip: string | null; userAgent: string | null } {
  const h = event?.node?.req?.headers ?? event?.headers ?? {}
  const get = (k: string) => (typeof h.get === 'function' ? h.get(k) : h[k]) as string | undefined
  const ip = get('cf-connecting-ip') || get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const ua = get('user-agent')
  return { ip, userAgent: ua ? ua.slice(0, 500) : null }
}

// Filtres communs d'un « sujet » de signature.
function subjectQuery(q: any, s: SignatureSubject) {
  q = q.eq('engagement_type', s.type)
  if (s.proId) q = q.eq('pro_id', s.proId)
  if (s.requestId) q = q.eq('request_id', s.requestId)
  if (s.lotId) q = q.eq('lot_id', s.lotId)
  return q
}

const fail = (statusCode: number, statusMessage: string, data?: any) =>
  createError({ statusCode, statusMessage, ...(data ? { data } : {}) })

export async function issueOtpChallenge(supabase: any, subject: SignatureSubject, contentSha256: string, purposeLabel: string) {
  const since = new Date(Date.now() - HOUR_MS).toISOString()
  const { count } = await subjectQuery(
    supabase.from('b2b_signature_challenges').select('id', { count: 'exact', head: true }), subject,
  ).gt('created_at', since)
  if ((count ?? 0) >= OTP_MAX_CHALLENGES_PER_HOUR) throw fail(429, 'Trop de codes demandés. Réessayez dans une heure.')

  const { data: last } = await subjectQuery(
    supabase.from('b2b_signature_challenges').select('created_at'), subject,
  ).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (last && Date.now() - new Date(last.created_at).getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw fail(429, 'Patientez une minute avant de redemander un code.')
  }

  const id = crypto.randomUUID()
  const code = generateOtpCode()
  const { error } = await supabase.from('b2b_signature_challenges').insert({
    id,
    engagement_type: subject.type,
    pro_id: subject.proId ?? null,
    request_id: subject.requestId ?? null,
    lot_id: subject.lotId ?? null,
    email: subject.email.toLowerCase(),
    code_hash: await hashOtp(id, code),
    content_sha256: contentSha256,
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  })
  if (error) throw fail(500, 'Impossible de créer le code de signature.')

  await sendEmail({
    to: subject.email,
    sender: 'no-reply',
    subject: 'Votre code de signature BÂTI-AXE',
    html: renderEmail({
      title: 'Votre code de signature',
      intro: `Code à usage unique pour signer : ${escapeHtml(purposeLabel)}.`,
      bodyHtml: `<p style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;font-family:monospace">${code}</p>`,
      footerNote: 'Valable 10 minutes. Si vous n\'êtes pas à l\'origine de cette demande, ignorez ce message.',
    }),
  })
  return { challengeId: id, emailHint: maskEmail(subject.email) }
}

export async function verifyOtpChallenge(supabase: any, subject: SignatureSubject, code: string, expectedContentSha256: string) {
  const since = new Date(Date.now() - HOUR_MS).toISOString()
  const { data: recent } = await subjectQuery(
    supabase.from('b2b_signature_challenges').select('attempts'), subject,
  ).gt('created_at', since)
  const total = ((recent ?? []) as { attempts: number }[]).reduce((n, r) => n + (r.attempts ?? 0), 0)
  if (total >= OTP_MAX_ATTEMPTS_PER_HOUR) throw fail(429, 'Trop de tentatives sur la dernière heure. Réessayez plus tard.')

  const { data: ch } = await subjectQuery(
    supabase.from('b2b_signature_challenges').select('*'), subject,
  ).is('consumed_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle()

  const state = evaluateChallenge(ch ?? null, new Date())
  if (state === 'missing') throw fail(404, 'Aucun code en cours, demandez-en un nouveau.')
  if (state === 'expired') throw fail(410, 'Code expiré, demandez-en un nouveau.')
  if (state === 'locked') throw fail(429, 'Trop de tentatives, demandez un nouveau code.')
  if (state === 'consumed') throw fail(409, 'Code déjà utilisé.')

  // Incrément optimiste : deux requêtes concurrentes ne peuvent pas partager un essai.
  const { data: bumped } = await supabase.from('b2b_signature_challenges')
    .update({ attempts: ch.attempts + 1 }).eq('id', ch.id).eq('attempts', ch.attempts).select('id')
  if (!bumped?.length) throw fail(409, 'Requête concurrente, réessayez.')

  if (!timingSafeEqualHex(await hashOtp(ch.id, code), ch.code_hash)) {
    throw fail(422, 'Code incorrect.', { remainingAttempts: OTP_MAX_ATTEMPTS - (ch.attempts + 1) })
  }
  if (ch.content_sha256 !== expectedContentSha256) {
    throw fail(409, 'Le contrat a changé depuis l\'envoi du code, demandez-en un nouveau.')
  }

  const { data: consumed } = await supabase.from('b2b_signature_challenges')
    .update({ consumed_at: new Date().toISOString() }).eq('id', ch.id).is('consumed_at', null).select('id')
  if (!consumed?.length) throw fail(409, 'Code déjà utilisé.')
  return { challengeId: ch.id as string }
}

export function generateToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)))
}

export async function issuePartnerToken(supabase: any, requestId: string, opts: { revokePrevious: boolean }): Promise<string> {
  if (opts.revokePrevious) {
    await supabase.from('b2b_partner_tokens')
      .update({ revoked_at: new Date().toISOString() }).eq('request_id', requestId).is('revoked_at', null)
  }
  const token = generateToken()
  const { error } = await supabase.from('b2b_partner_tokens').insert({
    request_id: requestId,
    token_hash: await sha256Hex(token),
    expires_at: new Date(Date.now() + PARTNER_TOKEN_TTL_MS).toISOString(),
  })
  if (error) throw fail(500, 'Impossible de créer le lien partenaire.')
  return token
}

export async function findRequestByToken(supabase: any, token: string): Promise<any | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null
  const { data: t } = await supabase.from('b2b_partner_tokens').select('request_id')
    .eq('token_hash', await sha256Hex(token)).is('revoked_at', null)
    .gt('expires_at', new Date().toISOString()).maybeSingle()
  if (!t) return null
  const { data: req } = await supabase.from('b2b_requests').select('*').eq('id', t.request_id).maybeSingle()
  return req ?? null
}

export async function findSignedFramework(
  supabase: any,
  q: { type: 'framework_pro'; proId: string } | { type: 'framework_partner'; email: string },
): Promise<{ id: string; signed_at: string } | null> {
  let query = supabase.from('b2b_engagements').select('id, signed_at')
    .eq('type', q.type).eq('template_version', CONTRACT_VERSIONS[q.type])
  query = q.type === 'framework_pro' ? query.eq('pro_id', q.proId) : query.eq('signer_email', q.email.toLowerCase())
  const { data } = await query.maybeSingle()
  return data ?? null
}

export async function insertEngagement(supabase: any, row: Record<string, any>): Promise<{ id: string; signed_at: string; created: boolean }> {
  const { data, error } = await supabase.from('b2b_engagements').insert(row).select('id, signed_at').single()
  if (!error) return { ...data, created: true }
  if (error.code !== '23505') throw fail(500, 'Impossible d\'enregistrer la signature.')
  // Idempotence : déjà signé (double clic, rejeu) → on relit la ligne existante.
  let q = supabase.from('b2b_engagements').select('id, signed_at')
    .eq('type', row.type).eq('template_version', row.template_version)
  for (const k of ['pro_id', 'request_id', 'lot_id']) if (row[k]) q = q.eq(k, row[k])
  if (row.signer_email) q = q.eq('signer_email', String(row.signer_email).toLowerCase())
  const { data: existing } = await q.limit(1).maybeSingle()
  if (!existing) throw fail(500, 'Signature en conflit introuvable.')
  return { ...existing, created: false }
}

export type PartnerLinkReason = 'framework' | 'choose_pro' | 'submit_quote' | 'validate_progress'

export function renderPartnerLinkEmail(o: {
  contactName: string; requestRef: string; link: string
  reason: PartnerLinkReason; stepLabel?: string
}): { subject: string; html: string } {
  const ref = escapeHtml(o.requestRef)
  const step = escapeHtml(o.stepLabel ?? 'prochaine étape')
  // D-22 : aucun texte destiné au partenaire ne mentionne commission, rétro-commission, pourcentage ni montant.
  const texts: Record<PartnerLinkReason, [string, string]> = {
    framework: ['Signez votre convention de partenariat BÂTI-AXE', `Votre dossier réf. ${ref} ne sera transmis aux artisans qu'après signature.`],
    validate_progress: ['Validez l\'avancement du chantier', `La date prévue de l'étape « ${step} » du dossier réf. ${ref} est atteinte. Si elle est franchie, validez-la depuis votre espace.`],
    choose_pro: ['Choisissez l\'artisan de votre dossier', `Des artisans certifiés se sont positionnés sur votre dossier réf. ${ref}. Consultez leurs fiches et retenez-en un par lot.`],
    submit_quote: ['Déposez le devis signé', `Une fois le devis de l'artisan signé par votre client pour le dossier réf. ${ref}, déposez-le sur votre espace avec son montant HT.`],
  }
  const [title, intro] = texts[o.reason]
  return {
    subject: title,
    html: renderEmail({
      title,
      intro: `Bonjour ${escapeHtml(o.contactName)}, ${intro}`,
      cta: { label: 'Ouvrir mon espace de suivi', href: o.link },
      footerNote: 'Lien personnel valable 30 jours, ne le transférez pas.',
    }),
  }
}

const TYPE_LABELS: Record<EngagementType, string> = {
  framework_pro: 'Convention cadre BÂTI-AXE',
  framework_partner: 'Convention de partenariat BÂTI-AXE',
  lot_amendment: 'Avenant de mise en relation',
}

export interface SignedCopy {
  type: EngagementType; template_version: string; content_html: string
  content_sha256: string; signed_at: string; signer_email: string
}

// Exemplaire signé : content_html est déjà échappé à la génération (contracts.ts) ; les champs de preuve le sont ici.
export function renderSignedCopyEmail(e: SignedCopy): string {
  const date = new Date(e.signed_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'long', timeStyle: 'short' })
  const proof = `<div style="border:1px solid #e2e8f0;border-radius:6px;padding:12px;margin:0 0 16px;font-size:13px;color:#334155">`
    + `<p style="margin:0 0 4px"><strong>Version :</strong> ${escapeHtml(e.template_version)}</p>`
    + `<p style="margin:0 0 4px"><strong>Signé le :</strong> ${escapeHtml(date)}</p>`
    + `<p style="margin:0 0 4px"><strong>Signataire :</strong> ${escapeHtml(e.signer_email)}</p>`
    + `<p style="margin:0;word-break:break-all"><strong>Empreinte SHA-256 :</strong> ${escapeHtml(e.content_sha256)}</p></div>`
  return renderEmail({
    title: `Votre exemplaire signé — ${TYPE_LABELS[e.type]}`,
    intro: 'Conservez ce message : il constitue votre exemplaire du contrat signé.',
    bodyHtml: proof + e.content_html,
  })
}

// À appeler après insertEngagement ; n'envoie qu'à la première signature. Un échec ne casse jamais la signature.
export async function sendSignedCopy(e: SignedCopy & { created: boolean }): Promise<void> {
  if (!e.created) return
  try {
    await sendEmail({ to: e.signer_email, sender: 'no-reply', subject: 'Votre exemplaire signé BÂTI-AXE', html: renderSignedCopyEmail(e) })
  } catch (err) {
    console.error('[Phase05.21] Échec envoi exemplaire signé:', err)
  }
}
