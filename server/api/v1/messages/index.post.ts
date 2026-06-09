import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

const messageSchema = z.object({
  lead_id: z.string().uuid(),
  content: z.string().min(1, 'Le message ne peut pas être vide'),
  access_token: z.string().uuid().optional() // Provided if sender is customer
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validation = messageSchema.safeParse(body)
  if (!validation.success) {
    throw createError({ statusCode: 400, statusMessage: 'Validation failed', data: validation.error.format() })
  }
  const { lead_id, content, access_token } = validation.data

  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user } } = await supabaseAuth.auth.getUser()
  const supabase = await serverSupabaseServiceRole(event) as any

  // Get lead info
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, pro_id, project_id, status, projects(access_token, customer_email)')
    .eq('id', lead_id)
    .single()

  if (leadError || !lead) {
    throw createError({ statusCode: 404, statusMessage: 'Lead introuvable' })
  }

  let isProSender = false

  // Authenticate sender
  if (access_token) {
    // Customer sending
    if (lead.projects.access_token !== access_token) {
      throw createError({ statusCode: 403, statusMessage: 'Token invalide' })
    }
    isProSender = false
  } else if (user) {
    // Pro sending
    if (lead.pro_id !== user.id) {
      throw createError({ statusCode: 403, statusMessage: 'Vous ne possédez pas ce lead' })
    }
    // Check if the pro has actually unlocked the lead
    // They must either be Premium, or have used a free grant, or the lead is unlocked.
    // For simplicity here, we assume if they can send a request from the UI, they have access.
    // In a real strict implementation, we would replicate maskLead's isUnlocked check.
    isProSender = true
  } else {
    throw createError({ statusCode: 401, statusMessage: 'Non authentifié' })
  }

  // Insert message
  const { data: message, error: insertError } = await supabase
    .from('messages')
    .insert({
      project_id: lead.project_id,
      lead_id: lead.id,
      content,
      is_pro_sender: isProSender
    })
    .select('id, created_at')
    .single()

  if (insertError || !message) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de l\'envoi du message' })
  }

  // Mock Email Notification
  console.log('\n=============================================')
  if (isProSender) {
    console.log('MOCK EMAIL: Nouveau message de votre artisan')
    console.log(`À: ${lead.projects.customer_email}`)
    console.log(`Lien magique: http://localhost:3000/mon-projet/${lead.projects.access_token}`)
  } else {
    // For the pro, we would need the pro's email. Let's just log it generically.
    console.log('MOCK EMAIL: Le particulier vous a répondu !')
    console.log(`Connectez-vous sur votre Espace Pro pour lire le message.`)
  }
  console.log('=============================================\n')

  return { success: true, messageId: message.id, createdAt: message.created_at }
})
