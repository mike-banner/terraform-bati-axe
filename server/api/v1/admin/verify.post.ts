import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { sendEmail } from '../../../utils/email'
import { renderEmail } from '../../../utils/emailLayout'

const verifySchema = z.object({
  pro_id: z.string().uuid(),
  document_type: z.enum(['kbis', 'decennale']),
  status: z.enum(['approved', 'rejected']),
  expiry_date: z.string().optional(), // Optional date format YYYY-MM-DD
  rejection_reason: z.string().min(5, 'Le motif doit faire au moins 5 caractères.').max(500, 'Le motif ne peut dépasser 500 caractères.').optional(),
})

export default defineEventHandler(async (event) => {
  try {
    // 1. Authenticate user
    const user = await serverSupabaseUser(event)
    if (!user || !user.email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Non autorisé.'
      })
    }
    const userId: string | null = (user as any).id ?? (user as any).sub ?? (user as any).user_metadata?.sub ?? null

    // 2. Authorize admin — role stored in app_metadata (JWT claim, set via service_role only)
    const isAdmin = (user as any).app_metadata?.role === 'admin'
    if (!isAdmin) {
      throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })
    }

    // 3. Validate body
    const body = await readBody(event)
    const validation = verifySchema.safeParse(body)
    if (!validation.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Données de vérification invalides.',
        data: validation.error.format()
      })
    }

    const { pro_id, document_type, status, expiry_date, rejection_reason } = validation.data

    if (status === 'rejected' && !rejection_reason) {
      throw createError({ statusCode: 400, statusMessage: 'Un motif est requis pour rejeter un document.' })
    }

    const supabase = await serverSupabaseServiceRole(event) as any

    // 4. Update the latest verification record for this pro and doc type
    // First, find the latest pending verification row to update
    const { data: latestVerification } = await supabase
      .from('verifications')
      .select('id')
      .eq('pro_id', pro_id)
      .eq('document_type', document_type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const verificationStatus = status === 'approved' ? 'approved' : 'rejected'

    if (latestVerification) {
      // Update existing record
      await supabase
        .from('verifications')
        .update({
          status: verificationStatus,
          expiry_date: expiry_date || null,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', latestVerification.id)
    } else {
      // Create new verification record directly if none exists
      await supabase
        .from('verifications')
        .insert({
          pro_id,
          document_type,
          file_key: `manual_entry_by_admin`,
          status: verificationStatus,
          expiry_date: expiry_date || null,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString()
        })
    }

    // 5. Update the professional's verification state in DB
    if (document_type === 'decennale') {
      const decennalState = status === 'approved' ? 'valid' : 'none'
      await supabase
        .from('professionals')
        .update({ decennal_status: decennalState })
        .eq('id', pro_id)
    }

    // Check if both KBIS and decennale are approved to set is_verified to true
    if (status === 'approved') {
      const { data: verifications } = await supabase
        .from('verifications')
        .select('document_type, status')
        .eq('pro_id', pro_id)
        .eq('status', 'approved')

      const hasApprovedKbis = verifications?.some((v: any) => v.document_type === 'kbis')
      const hasApprovedDecennale = verifications?.some((v: any) => v.document_type === 'decennale') || document_type === 'decennale'

      if (hasApprovedKbis && hasApprovedDecennale) {
        await supabase
          .from('professionals')
          .update({ is_verified: true })
          .eq('id', pro_id)
      }
    } else {
      // If rejected, remove verified state
      await supabase
        .from('professionals')
        .update({ is_verified: false })
        .eq('id', pro_id)
    }

    // 6. Log audit trail
    await supabase.from('audit_logs').insert({
      actor_id: userId,
      action: 'doc_validated',
      target_table: 'professionals',
      target_id: pro_id,
      metadata: {
        document_type,
        status,
        expiry_date,
        rejection_reason
      }
    })

    // 06.3 — informer le pro du résultat de la revue documentaire (contact@ : il peut répondre)
    try {
      const { data: pro } = await supabase
        .from('professionals')
        .select('email, company_name, full_name')
        .eq('id', pro_id)
        .maybeSingle()

      if (pro?.email) {
        const siteUrl = useRuntimeConfig().public.siteUrl || 'https://bati-axe.com'
        const docLabel = document_type === 'decennale' ? 'attestation décennale' : 'extrait Kbis'
        const approved = status === 'approved'
        await sendEmail({
          to: pro.email,
          sender: 'contact',
          subject: approved
            ? `Votre ${docLabel} est validée — BÂTI-AXE`
            : `Votre ${docLabel} n'a pas pu être validée — BÂTI-AXE`,
          html: renderEmail({
            title: approved ? `Votre ${docLabel} est validée` : `Votre ${docLabel} a été refusée`,
            preheader: approved ? 'Document validé par notre équipe.' : 'Un nouvel envoi est nécessaire.',
            intro: approved
              ? `Bonjour ${pro.full_name || pro.company_name || ''}, notre équipe a validé votre ${docLabel}.${expiry_date ? ` Elle est enregistrée comme valide jusqu'au ${new Date(expiry_date).toLocaleDateString('fr-FR')}.` : ''}`
              : `Bonjour ${pro.full_name || pro.company_name || ''}, votre ${docLabel} n'a pas pu être validée par notre équipe.`,
            bodyHtml: approved
              ? ''
              : `<p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Motif :</strong></p><p style="margin:0;padding:12px 16px;background:#F8FAFC;border-left:3px solid #EA580C;font-size:14px;color:#334155;">${rejection_reason}</p>`,
            cta: {
              label: approved ? 'Accéder à mon espace' : 'Renvoyer mon document',
              href: approved ? `${siteUrl}/espace/dashboard` : `${siteUrl}/espace/dashboard?doc=${document_type}`,
            },
            footerNote: approved
              ? undefined
              : 'Vous pouvez répondre directement à cet e-mail si le motif ne vous semble pas justifié.',
          }),
        })
      }
    } catch (err) {
      console.error('[06.3] e-mail verify pro échoué:', err)
    }

    return {
      status: 'SUCCESS',
      message: `Le document ${document_type} a été ${status === 'approved' ? 'approuvé' : 'rejeté'} avec succès.`
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    serverError('admin.verify', error)
  }
})
