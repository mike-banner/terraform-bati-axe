import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

const verifySchema = z.object({
  pro_id: z.string().uuid(),
  document_type: z.enum(['kbis', 'decennale']),
  status: z.enum(['approved', 'rejected']),
  expiry_date: z.string().optional() // Optional date format YYYY-MM-DD
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

    // 2. Authorize admin (ends with @bati-axe.fr or defined in ADMIN_EMAILS env)
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : []
    const isAdmin = user.email.endsWith('@bati-axe.fr') || adminEmails.includes(user.email)
    
    if (!isAdmin) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Accès refusé. Vous devez être administrateur.'
      })
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

    const { pro_id, document_type, status, expiry_date } = validation.data
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
          reviewed_by: user.id,
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
          reviewed_by: user.id,
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
      actor_id: user.id,
      action: 'doc_validated',
      target_table: 'professionals',
      target_id: pro_id,
      metadata: {
        document_type,
        status,
        expiry_date
      }
    })

    return {
      status: 'SUCCESS',
      message: `Le document ${document_type} a été ${status === 'approved' ? 'approuvé' : 'rejeté'} avec succès.`
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal Server Error'
    })
  }
})
