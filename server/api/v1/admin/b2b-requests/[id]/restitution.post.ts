import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { sendEmail } from '../../../../../utils/email'

// 05.10-08 (B2B-06) : workflow DirCo — restitution au donneur d'ordres.
// Le chargé d'affaires a qualifié le dossier (recommended_pros rempli) → on
// présente les 2-3 sous-traitants sélectionnés par email, on passe le statut
// en 'qualifie' et on trace (note + audit log).

const BUDGET_LABELS: Record<string, string> = {
  '<30k': '< 30 000 €',
  '30-100k': '30 000 – 100 000 €',
  '100-300k': '100 000 – 300 000 €',
  '>300k': '> 300 000 €',
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  // 1. Charger le dossier
  const { data: req, error: eReq } = await supabase
    .from('b2b_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (eReq || !req) throw createError({ statusCode: 404, statusMessage: 'Dossier introuvable.' })

  const proIds: string[] = req.recommended_pros || []
  if (proIds.length === 0) {
    throw createError({ statusCode: 422, statusMessage: 'Aucun sous-traitant recommandé — sélectionnez 2-3 pros avant la restitution.' })
  }

  // 2. Charger les pros recommandés
  const { data: pros, error: ePros } = await supabase
    .from('professionals')
    .select('id, company_name, full_name, category, canonical_slug, postal_code')
    .in('id', proIds)

  if (ePros || !pros) throw createError({ statusCode: 500, statusMessage: 'Impossible de charger les sous-traitants.' })

  const config = useRuntimeConfig(event)
  const baseUrl = config.public?.siteUrl || 'https://bati-axe.pages.dev'

  const proCards = pros
    .map((p: any) => {
      const dept = p.postal_code ? String(p.postal_code).slice(0, 2) : null
      const profileUrl = p.canonical_slug && dept
        ? `${baseUrl}/pro/${dept}/${p.canonical_slug}`
        : null
      const link = profileUrl
        ? `<a href="${profileUrl}" style="color:#EA580C; font-weight:600; text-decoration:none;">Voir la fiche complète →</a>`
        : ''
      return `
        <div style="border:1px solid #E2E8F0; border-radius:8px; padding:16px; margin-bottom:12px;">
          <p style="margin:0; font-size:15px; font-weight:700; color:#0F172A;">${p.company_name || p.full_name || 'Sous-traitant'}</p>
          ${p.category ? `<p style="margin:4px 0 0; font-size:13px; color:#64748B;">${p.category}</p>` : ''}
          ${link ? `<p style="margin:8px 0 0; font-size:13px;">${link}</p>` : ''}
        </div>`
    })
    .join('')

  const qualifications = (req.qualifications_requises || []).map((q: string) => `<li>${q}</li>`).join('')
  const planning = req.planning_start || req.planning_end
    ? `${req.planning_start || '—'} → ${req.planning_end || '—'}`
    : null

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0F172A; font-size: 18px;">📋 Votre dossier — ${pros.length} sous-traitant${pros.length > 1 ? 's' : ''} qualifié${pros.length > 1 ? 's' : ''}</h2>
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Bonjour ${req.contact_name},<br><br>
        Notre chargé d'affaires a analysé votre dossier et vous présente ci-dessous
        ${pros.length} professionnel${pros.length > 1 ? 's' : ''} certifié${pros.length > 1 ? 's' : ''} sélectionné${pros.length > 1 ? 's' : ''}
        pour votre projet ${req.project_location ? `à ${req.project_location}` : ''}${req.budget_range ? ` (budget ${BUDGET_LABELS[req.budget_range] || req.budget_range})` : ''}.
      </p>
      ${proCards}
      ${qualifications ? `
        <p style="color: #334155; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Exigences retenues</p>
        <ul style="color: #64748B; font-size: 13px; margin-top: 0; padding-left: 20px;">${qualifications}</ul>
      ` : ''}
      ${planning ? `<p style="color: #64748B; font-size: 13px;">Planning prévisionnel : <strong>${planning}</strong></p>` : ''}
      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-top: 16px;">
        Notre équipe reste à votre disposition pour organiser les premiers échanges.
        Réponse garantie sous 4 heures ouvrées.
      </p>
      <p style="color: #64748B; font-size: 13px; margin-top: 24px;">
        BÂTI-AXE — Le bras armé technique des professionnels du bâtiment.<br>
        Référence : ${id.slice(0, 8).toUpperCase()}
      </p>
    </div>
  `

  await sendEmail({
    to: req.contact_email,
    subject: `[BÂTI-AXE] Votre dossier — ${pros.length} sous-traitant${pros.length > 1 ? 's' : ''} qualifié${pros.length > 1 ? 's' : ''}`,
    html,
  })

  // 3. Mise à jour du pipeline : statut 'qualifie' + note tracée
  const now = new Date().toISOString()
  const noteLine = `\n[${now.slice(0, 10)}] Propositions envoyées au donneur d'ordres (${pros.length} sous-traitant${pros.length > 1 ? 's' : ''}).`
  const nextStatus = req.status === 'converti' || req.status === 'perdu' ? req.status : 'qualifie'

  const { data: updated, error: eUpd } = await supabase
    .from('b2b_requests')
    .update({ status: nextStatus, notes: `${req.notes || ''}${noteLine}` })
    .eq('id', id)
    .select('id, status, notes')
    .single()

  if (eUpd) throw createError({ statusCode: 500, statusMessage: eUpd.message })

  await supabase.from('audit_logs').insert({
    actor_id: (user as any).id,
    action: 'b2b_restitution_sent',
    target_table: 'b2b_requests',
    target_id: id,
    metadata: { pro_count: pros.length, pro_ids: proIds },
  }).catch(() => {})

  return {
    status: 'SUCCESS',
    email_to: req.contact_email,
    pro_count: pros.length,
    request_status: nextStatus,
  }
})
