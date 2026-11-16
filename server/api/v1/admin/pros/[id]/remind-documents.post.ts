import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { sendEmail } from '../../../../../utils/email'
import { renderEmail } from '../../../../../utils/emailLayout'
import { escapeHtml } from '../../../../../utils/contracts'
import { resolveSupabaseUserId } from '../../../../../utils/resolveSupabaseUserId'
import { DOC_LABELS, missingDocuments } from '../../../../../../app/types/admin'

// Relance d'un artisan dont le dossier est incomplet : e-mail listant les pièces obligatoires
// manquantes (KBIS, décennale) ou refusées, avec le lien vers son espace. Une relance par
// artisan et par 24 h (trace dans audit_logs).
const COOLDOWN_MS = 24 * 3_600_000

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  if ((user as any).app_metadata?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const idParsed = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) throw createError({ statusCode: 400, statusMessage: 'id invalide.' })
  const id = idParsed.data

  const supabase = await serverSupabaseServiceRole(event) as any
  const { data: pro } = await supabase
    .from('professionals').select('id, email, full_name, company_name, is_verified').eq('id', id).maybeSingle()
  if (!pro) throw createError({ statusCode: 404, statusMessage: 'Artisan introuvable.' })
  if (!pro.email) throw createError({ statusCode: 422, statusMessage: 'Cet artisan n\'a pas d\'adresse e-mail.' })

  const { data: verifications } = await supabase
    .from('verifications').select('document_type, status').eq('pro_id', id)
  const missing = missingDocuments({ ...pro, verifications: verifications ?? [] } as any)
  if (missing.length === 0) {
    throw createError({ statusCode: 409, statusMessage: 'Aucune pièce obligatoire manquante : rien à relancer.' })
  }

  // Une relance par 24 h (la trace d'audit sert aussi d'historique).
  const since = new Date(Date.now() - COOLDOWN_MS).toISOString()
  const { data: recent } = await supabase
    .from('audit_logs').select('created_at')
    .eq('action', 'document_artisan_updated').eq('target_id', id)
    .contains('metadata', { kind: 'documents_reminder' })
    .gte('created_at', since).order('created_at', { ascending: false }).limit(1)
  if (recent?.length) {
    const hours = Math.max(1, Math.ceil((COOLDOWN_MS - (Date.now() - new Date(recent[0].created_at).getTime())) / 3_600_000))
    throw createError({ statusCode: 429, statusMessage: `Une relance a déjà été envoyée. Nouvelle relance possible dans ${hours} h.` })
  }

  const siteUrl = (useRuntimeConfig(event).public?.siteUrl as string) || 'https://bati-axe.pages.dev'
  const list = missing
    .map(m => `<li style="margin:0 0 6px;">${DOC_LABELS[m.type]}${m.rejected ? ' — le document envoyé a été refusé, merci d\'en déposer un nouveau' : ''}</li>`)
    .join('')
  const firstName = escapeHtml(String(pro.full_name ?? '').split(' ')[0] ?? '')
  const html = renderEmail({
    title: 'Il manque des documents à votre dossier',
    preheader: 'Déposez vos documents pour activer votre profil BÂTI-AXE.',
    intro: `Bonjour${firstName ? ' ' + firstName : ''}, votre profil <strong>${escapeHtml(pro.company_name ?? '')}</strong> n'est pas encore activé : il nous manque les pièces suivantes.`,
    bodyHtml: `<ul style="margin:0 0 8px;padding-left:20px;font-size:14px;line-height:1.6;color:#334155;">${list}</ul>`,
    cta: { label: 'Déposer mes documents', href: `${siteUrl}/espace/dashboard` },
    footerNote: 'Dès que votre KBIS et votre décennale sont validés, votre profil est activé et vous pouvez recevoir des appels d\'offres.',
  })

  const sent = await sendEmail({ to: pro.email, sender: 'notifications', subject: 'Il manque des documents à votre dossier BÂTI-AXE', html, event })
  if (!sent?.success) {
    console.error('[remind-documents] e-mail non envoyé:', id, sent?.error)
    throw createError({ statusCode: 502, statusMessage: 'Envoi impossible : clé Resend absente ou service injoignable.' })
  }

  try {
    await supabase.from('audit_logs').insert({
      actor_id: resolveSupabaseUserId(user),
      action: 'document_artisan_updated',
      target_table: 'professionals',
      target_id: id,
      metadata: { kind: 'documents_reminder', missing: missing.map(m => m.type) },
    })
  } catch { /* non bloquant */ }

  return { status: 'SUCCESS', missing: missing.map(m => m.type) }
})
