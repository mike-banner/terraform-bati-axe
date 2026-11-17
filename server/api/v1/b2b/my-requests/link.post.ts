import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { sendEmail } from '../../../../utils/email'
import { renderEmail } from '../../../../utils/emailLayout'
import { escapeHtml } from '../../../../utils/contracts'
import { getClientMeta } from '../../../../utils/signature'
import { isRateLimited } from '../../../../utils/rateLimit'
import { signDossiersToken, escapeLike } from '../../../../utils/partnerDossiersToken'
import { dossiersSecret } from '../../../../utils/partnerDossiers'

// « Mes dossiers » : le partenaire saisit son e-mail et reçoit un lien valable 24 h.
// La réponse est identique que l'adresse ait des dossiers ou non (pas de sondage des adresses connues).
const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) })

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store' })

  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Adresse e-mail invalide.' })
  const { email } = parsed.data

  const ip = getClientMeta(event).ip ?? 'unknown'
  if (isRateLimited('b2b-mes-dossiers-ip:' + ip, { max: 10, windowMs: 3_600_000 }) || isRateLimited('b2b-mes-dossiers-mail:' + email, { max: 3, windowMs: 3_600_000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Trop de demandes. Réessayez dans une heure.' })
  }

  const supabase = await serverSupabaseServiceRole(event) as any
  const { data: rows, error } = await supabase
    .from('b2b_requests')
    .select('contact_name')
    .ilike('contact_email', escapeLike(email))
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) {
    console.error('[mes-dossiers] lecture dossiers:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Service indisponible. Réessayez plus tard.' })
  }

  if (rows?.length) {
    const token = await signDossiersToken(dossiersSecret(event), email)
    const siteUrl = (useRuntimeConfig(event).public?.siteUrl as string) || 'https://bati-axe.com'
    const html = renderEmail({
      title: 'Vos dossiers BÂTI-AXE',
      intro: `Bonjour ${escapeHtml(String(rows[0].contact_name ?? ''))}, voici le lien pour retrouver tous vos dossiers et déposer un nouveau projet.`,
      cta: { label: 'Voir mes dossiers', href: `${siteUrl}/b2b/mes-dossiers/${token}` },
      footerNote: 'Lien personnel valable 24 heures, ne le transférez pas. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.',
    })
    try {
      const sent = await sendEmail({ to: email, sender: 'no-reply', subject: 'Vos dossiers BÂTI-AXE', html, event })
      if (!sent?.success) console.error('[mes-dossiers] e-mail non envoyé:', sent?.error)
    } catch (err) {
      console.error('[mes-dossiers] envoi en exception:', err)
    }
  }

  return { status: 'SENT' }
})
