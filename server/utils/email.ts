import { Resend } from 'resend'
import { useRuntimeConfig } from '#imports'

export async function sendEmail(options: { to: string; subject: string; html: string }) {
  // DEV Environment: Mock the email to avoid consuming quotas or failing without keys
  if (process.dev) {
    console.log('\n=============================================')
    console.log(`[MOCK EMAIL] To: ${options.to}`)
    console.log(`[MOCK EMAIL] Subject: ${options.subject}`)
    console.log('[MOCK EMAIL] HTML Body:')
    console.log(options.html)
    console.log('=============================================\n')
    return { success: true, mocked: true }
  }

  // PROD Environment: Send real email via Resend
  const config = useRuntimeConfig()
  const apiKey = config.resendApiKey || process.env.RESEND_API_KEY
  
  if (!apiKey) {
    console.warn('⚠️ Missing RESEND_API_KEY. Falling back to console.log')
    console.log(`[EMAIL FALLBACK] To: ${options.to} | Subj: ${options.subject}`)
    return { success: false, error: 'Missing API Key' }
  }

  const resend = new Resend(apiKey)

  try {
    const data = await resend.emails.send({
      from: 'BÂTI-AXE <noreply@bati-axe.fr>', // Must be a verified domain on Resend
      to: [options.to],
      subject: options.subject,
      html: options.html
    })
    return { success: true, data }
  } catch (error) {
    console.error('Error sending email via Resend:', error)
    return { success: false, error }
  }
}
