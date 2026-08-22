import { useRuntimeConfig } from '#imports'

// P2 — Vérification Cloudflare Turnstile (anti-spam).
// Appelle l'endpoint siteverify. Retourne true si le token est valide,
// ou si aucune clé secrète n'est configurée (dev → bypass).
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  const config = useRuntimeConfig()
  const secretKey = (config as any).turnstileSecretKey || process.env.TURNSTILE_SECRET_KEY

  // Aucune clé configurée → Turnstile désactivé (dev local).
  if (!secretKey) {
    return true
  }

  if (!token) {
    return false
  }

  const form = new URLSearchParams()
  form.append('secret', secretKey as string)
  form.append('response', token)
  if (ip) form.append('remoteip', ip)

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    })

    if (!res.ok) return false

    const data = await res.json() as { success: boolean }
    return data.success === true
  } catch {
    // Fail-closed : si Cloudflare est injoignable, on refuse plutôt que de
    // laisser passer du spam.
    return false
  }
}
