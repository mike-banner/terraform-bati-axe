import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { maskTender } from '../../../../utils/maskTender'
import { renderContract, CONTRACT_VERSIONS } from '../../../../utils/contracts'
import { sha256Hex, getClientMeta, issueOtpChallenge, verifyOtpChallenge, findSignedFramework, insertEngagement, sendSignedCopy } from '../../../../utils/signature'
import { tenderCap, shouldCloseLot, renderTenderClaimEmail } from '../../../../utils/tenderClaim'
import { sendEmail } from '../../../../utils/email'

const idSchema = z.string().uuid('Identifiant de lot invalide.')
const bodySchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Code à 6 chiffres attendu.').optional() })

export default defineEventHandler(async (event) => {
  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const parsedId = idSchema.safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) throw createError({ statusCode: 400, statusMessage: parsedId.error.issues[0]?.message ?? 'Identifiant de lot invalide.' })
  const id = parsedId.data

  const parsedBody = bodySchema.safeParse((await readBody(event).catch(() => null)) ?? {})
  if (!parsedBody.success) throw createError({ statusCode: 400, statusMessage: parsedBody.error.issues[0]?.message ?? 'Requête invalide.' })
  const { code } = parsedBody.data

  const supabase = serverSupabaseServiceRole(event) as any

  const { data: pro, error: proError } = await supabase
    .from('professionals')
    .select('id, email, company_name, full_name, phone, siret, categories, is_verified, decennal_status')
    .eq('id', user.id)
    .single()

  if (proError || !pro) {
    throw createError({ statusCode: 404, statusMessage: 'Profil professionnel introuvable.' })
  }

  if (pro.is_verified !== true) {
    throw createError({ statusCode: 403, statusMessage: 'Votre profil doit être vérifié pour vous positionner sur un appel d\'offres.' })
  }

  if (pro.decennal_status !== 'valid') {
    throw createError({ statusCode: 403, statusMessage: 'Envoyez votre attestation décennale pour vous positionner sur un appel d\'offres.' })
  }

  const { data: lot, error: lotError } = await supabase
    .from('b2b_tender_lots')
    .select('id, category, status, zone_id, request_id, b2b_requests(id, decision_status, description, project_location, project_postal_code, budget_range, contact_name, contact_company, contact_phone, contact_email)')
    .eq('id', id)
    .single()

  if (lotError || !lot) {
    throw createError({ statusCode: 404, statusMessage: 'Appel d\'offres introuvable.' })
  }

  if (!pro.categories?.includes(lot.category)) {
    throw createError({ statusCode: 403, statusMessage: 'Cet appel d\'offres ne correspond pas à vos corps de métier.' })
  }

  const { data: zoneSub } = await supabase
    .from('pro_zones')
    .select('id')
    .eq('pro_id', user.id)
    .eq('zone_id', lot.zone_id)
    .eq('status', 'active')
    .maybeSingle()

  if (!zoneSub) {
    throw createError({ statusCode: 403, statusMessage: 'Votre abonnement ne couvre pas la zone de cet appel d\'offres.' })
  }

  // Phase 05.21 — verrou : convention cadre signée, puis avenant du lot signé, AVANT toute coordonnée.
  const framework = await findSignedFramework(supabase, { type: 'framework_pro', proId: user.id })
  if (!framework) {
    throw createError({ statusCode: 403, statusMessage: 'Signez la convention cadre BÂTI-AXE avant de vous positionner sur un appel d\'offres.', data: { code: 'FRAMEWORK_REQUIRED' } })
  }

  const { data: existingClaim } = await supabase
    .from('b2b_tender_claims')
    .select('id, claimed_at')
    .eq('lot_id', id)
    .eq('pro_id', user.id)
    .maybeSingle()

  let { data: amendment } = await supabase
    .from('b2b_engagements')
    .select('id, status, signed_at')
    .eq('type', 'lot_amendment')
    .eq('lot_id', id)
    .eq('pro_id', user.id)
    .maybeSingle()

  if (existingClaim && amendment) {
    return { status: 'ALREADY_CLAIMED', tender: maskTender({ ...lot, claimed_at: existingClaim.claimed_at }, true) }
  }

  if (!existingClaim && lot.status !== 'open') {
    throw createError({ statusCode: 409, statusMessage: 'Cet appel d\'offres est clos.' })
  }

  if (!amendment) {
    const requestRef = (lot.request_id || '').slice(0, 8).toUpperCase()
    const html = renderContract('lot_amendment', {
      requestRef,
      lotRef: id.slice(0, 8).toUpperCase(),
      lotCategory: lot.category,
      proCompanyName: pro.company_name,
      proSiret: pro.siret,
      proFullName: pro.full_name,
    })
    const sha = await sha256Hex(html)
    const version = CONTRACT_VERSIONS.lot_amendment
    const subject = { type: 'lot_amendment' as const, proId: user.id, lotId: id, requestId: lot.request_id, email: pro.email }

    if (!code) {
      const { emailHint } = await issueOtpChallenge(supabase, subject, sha, 'l\'avenant de mise en relation réf. ' + requestRef)
      return { status: 'AMENDMENT_REQUIRED', contract: { html, sha256: sha, version }, email_hint: emailHint }
    }

    const { challengeId } = await verifyOtpChallenge(supabase, subject, code, sha)

    if (!existingClaim) {
      // Le pro ne doit pas s'engager sans obtenir les contacts : on revérifie lot ouvert + cap.
      const { data: fresh } = await supabase.from('b2b_tender_lots').select('status').eq('id', id).single()
      const { count: currentClaims } = await supabase
        .from('b2b_tender_claims')
        .select('id', { count: 'exact', head: true })
        .eq('lot_id', id)
      const cap = tenderCap(lot.b2b_requests?.decision_status)
      if (fresh?.status !== 'open' || (currentClaims ?? 0) >= cap) {
        throw createError({ statusCode: 409, statusMessage: 'Cet appel d\'offres vient d\'être clos : aucun avenant n\'a été signé et vous n\'êtes engagé à rien.', data: { code: 'LOT_CLOSED' } })
      }
    }

    const meta = getClientMeta(event)
    amendment = await insertEngagement(supabase, {
      type: 'lot_amendment',
      pro_id: user.id,
      lot_id: id,
      request_id: lot.request_id,
      signer_email: String(pro.email).toLowerCase(),
      template_version: version,
      content_html: html,
      content_sha256: sha,
      otp_challenge_id: challengeId,
      signed_ip: meta.ip,
      signed_user_agent: meta.userAgent,
      status: 'signed',
    })

    await sendSignedCopy({ type: 'lot_amendment', template_version: version, content_html: html, content_sha256: sha, signed_at: amendment.signed_at, signer_email: String(pro.email).toLowerCase(), created: amendment.created })

    try {
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'b2b_engagement_signed',
        target_table: 'b2b_engagements',
        target_id: amendment.id,
        metadata: { type: 'lot_amendment', lot_id: id, sha256: sha },
      })
    } catch (err) {
      console.error('[Phase05.21] Échec audit signature avenant:', err)
    }
  }

  // Claim ancien, avenant tout juste signé : pas de second email au partenaire.
  if (existingClaim) {
    return { status: 'ALREADY_CLAIMED', tender: maskTender({ ...lot, claimed_at: existingClaim.claimed_at }, true) }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('b2b_tender_claims')
    .insert({ lot_id: id, pro_id: user.id })
    .select('id, claimed_at')
    .single()

  if (insertError) {
    // Contrainte UNIQUE (lot_id, pro_id) : requête concurrente déjà passée → chemin idempotent.
    if (insertError.code === '23505') {
      const { data: raceClaim } = await supabase
        .from('b2b_tender_claims')
        .select('id, claimed_at')
        .eq('lot_id', id)
        .eq('pro_id', user.id)
        .maybeSingle()
      return { status: 'ALREADY_CLAIMED', tender: maskTender({ ...lot, claimed_at: raceClaim?.claimed_at ?? null }, true) }
    }
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de l\'enregistrement du positionnement.' })
  }

  const { count: claimsAfter } = await supabase
    .from('b2b_tender_claims')
    .select('id', { count: 'exact', head: true })
    .eq('lot_id', id)

  const req = lot.b2b_requests || {}
  const decisionStatus = req.decision_status
  const lotClosed = shouldCloseLot({ decisionStatus, claimsAfter: claimsAfter ?? 1 })

  if (lotClosed) {
    await supabase
      .from('b2b_tender_lots')
      .update({ status: 'closed', closed_at: new Date().toISOString(), closed_reason: 'cap' })
      .eq('id', id)
  }

  try {
    const { subject, html } = renderTenderClaimEmail({
      requestRef: (lot.request_id || '').slice(0, 8).toUpperCase(),
      lotCategory: lot.category,
      contactName: req.contact_name,
      proCompany: pro.company_name || pro.full_name || '',
      proContactName: pro.full_name,
      proEmail: pro.email,
      proPhone: pro.phone ?? null,
      remainingSlots: Math.max(0, tenderCap(decisionStatus) - (claimsAfter ?? 1)),
      siteUrl: useRuntimeConfig().public.siteUrl || 'https://bati-axe.com',
    })
    if (req.contact_email) {
      await sendEmail({ to: req.contact_email, sender: 'notifications', subject, html })
    }
  } catch (err) {
    console.error('[Phase9] Échec envoi email partenaire (claim AO):', err)
  }

  return {
    status: 'SUCCESS',
    lotClosed,
    tender: maskTender({ ...lot, status: lotClosed ? 'closed' : lot.status, claimed_at: inserted.claimed_at }, true),
  }
})
