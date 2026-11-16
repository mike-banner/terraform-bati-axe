import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { renderEmail } from '../../../utils/emailLayout'
import { sendEmail } from '../../../utils/email'
import { isRateLimited } from '../../../utils/rateLimit'

// Mot de passe oublié envoyé depuis BÂTI-AXE (Resend, gabarit du site) et non par Supabase.
// Réponse toujours neutre : aucune indication sur l'existence du compte (énumération).
const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
})

const NEUTRAL = { status: 'OK' as const }

export default defineEventHandler(async (event) => {
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Adresse e-mail invalide.' })
  }
  const { email } = parsed.data

  const ip = getHeader(event, 'cf-connecting-ip') || 'unknown'
  if (isRateLimited(`forgot:${ip}`, { max: 10, windowMs: 60 * 60 * 1000 })
    || isRateLimited(`forgot-email:${email}`, { max: 3, windowMs: 60 * 60 * 1000 })) {
    return NEUTRAL
  }

  const siteUrl = (useRuntimeConfig().public.siteUrl || getRequestURL(event).origin).replace(/\/$/, '')

  try {
    const supabase = await serverSupabaseServiceRole(event) as any
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${siteUrl}/pro/reinitialiser-mot-de-passe` },
    })
    const link = data?.properties?.action_link
    if (error || !link) return NEUTRAL // compte inconnu : on ne dit rien

    await sendEmail({
      to: email,
      subject: 'Réinitialisation de votre mot de passe BÂTI-AXE',
      sender: 'no-reply',
      event,
      html: renderEmail({
        title: 'Réinitialiser votre mot de passe',
        preheader: 'Choisissez un nouveau mot de passe pour votre espace BÂTI-AXE.',
        intro: 'Vous avez demandé la réinitialisation du mot de passe de votre espace BÂTI-AXE. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.',
        cta: { label: 'Choisir un nouveau mot de passe', href: link },
        footerNote: 'Ce lien est valable une heure et ne peut servir qu\'une fois. Si vous n\'êtes pas à l\'origine de cette demande, ignorez simplement ce message : votre mot de passe actuel reste inchangé.',
      }),
    })
  } catch (err) {
    console.error('[forgot-password]', err)
  }
  return NEUTRAL
})
