// Jeton « Mes dossiers » : lien envoyé par e-mail qui donne accès à la liste des dossiers d'une adresse.
// Sans état (aucune table) : `<expiration>.<e-mail encodé>.<signature HMAC-SHA256>`. Le secret reste côté
// serveur ; l'adresse e-mail est lue dans le jeton, jamais dans la requête.
// Pur (Web Crypto uniquement) : testable en vitest node.

export const DOSSIERS_TOKEN_TTL_MS = 24 * 3_600_000
const CONTEXT = 'b2b-mes-dossiers:v1'

const enc = new TextEncoder()

const toB64u = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function fromB64u(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from(bin, c => c.charCodeAt(0))
  } catch {
    return null
  }
}

async function sign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toB64u(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message))))
}

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function signDossiersToken(secret: string, email: string, now = Date.now()): Promise<string> {
  const mail = email.trim().toLowerCase()
  const exp = now + DOSSIERS_TOKEN_TTL_MS
  const sig = await sign(secret, `${CONTEXT}:${exp}:${mail}`)
  return `${exp}.${toB64u(enc.encode(mail))}.${sig}`
}

/** Renvoie l'adresse (en minuscules) si le jeton est valide et non expiré, sinon null. */
export async function verifyDossiersToken(secret: string, token: string, now = Date.now()): Promise<string | null> {
  if (!secret || typeof token !== 'string' || token.length > 600) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [expText, mailB64, sig] = parts as [string, string, string]
  if (!/^\d{10,15}$/.test(expText)) return null
  const exp = Number(expText)
  if (exp <= now) return null
  const bytes = fromB64u(mailB64)
  if (!bytes) return null
  const mail = new TextDecoder().decode(bytes)
  const expected = await sign(secret, `${CONTEXT}:${exp}:${mail}`)
  return sameString(expected, sig) ? mail : null
}

/** Échappe `%`, `_` et `\` pour une comparaison `ilike` exacte (insensible à la casse). */
export const escapeLike = (text: string) => text.replace(/[\\%_]/g, c => `\\${c}`)
