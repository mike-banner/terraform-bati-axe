import { useRuntimeConfig } from '#imports'

// Envoi d'e-mails via l'API REST Resend appelée en fetch direct.
// On évite volontairement le SDK `resend` : il importe `@react-email/render`,
// non résolvable par le runtime Cloudflare Workers (build Nitro échoue avec
// « externals are not allowed »). Un simple fetch suffit pour du HTML brut.
export async function sendEmail(options: { to: string; subject: string; html: string }) {
  // DEV : on mocke l'e-mail (pas de quota consommé, pas de clé requise).
  // Bascule opt-in EMAIL_LIVE=true → envoi réel même en dev (vérification manuelle).
  const liveOverride = process.env.EMAIL_LIVE === 'true'
  if (import.meta.dev && !liveOverride) {
    console.log('\n=============================================')
    console.log(`[MOCK EMAIL] To: ${options.to}`)
    console.log(`[MOCK EMAIL] Subject: ${options.subject}`)
    console.log('[MOCK EMAIL] HTML Body:')
    console.log(options.html)
    console.log('=============================================\n')
    return { success: true, mocked: true }
  }

  // PROD : envoi réel via Resend.
  const config = useRuntimeConfig()
  const apiKey = config.resendApiKey || process.env.RESEND_API_KEY

  if (!apiKey) {
    console.warn('⚠️ Missing RESEND_API_KEY. Falling back to console.log')
    console.log(`[EMAIL FALLBACK] To: ${options.to} | Subj: ${options.subject}`)
    return { success: false, error: 'Missing API Key' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'BÂTI-AXE <noreply@bati-axe.fr>', // Domaine vérifié côté Resend
        to: [options.to],
        subject: options.subject,
        html: options.html
      })
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('Error sending email via Resend:', res.status, detail)
      return { success: false, error: `Resend ${res.status}` }
    }

    return { success: true, data: await res.json() }
  } catch (error) {
    console.error('Error sending email via Resend:', error)
    return { success: false, error }
  }
}
