import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

const messageSchema = z.object({
  lead_id: z.string().uuid(),
  content: z.string().min(1, 'Le message ne peut pas être vide').max(1000, 'Le message ne peut dépasser 1000 caractères.'),
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
    .select('id, pro_id, project_id, status, unlocked_at, projects(access_token, customer_email, category)')
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

    // ADR-004 / REQ-03 : un pro ne peut écrire au client que s'il a réellement
    // débloqué le lead (coordonnées visibles). On réplique la logique isUnlocked
    // de maskLead : Premium OU free-grant pour ce lead OU déblocage 72h écoulé.
    const now = new Date()
    const { data: pro } = await supabase
      .from('professionals')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    const isPremium = pro?.subscription_status === 'active'
    const isTimeUnlocked = lead.unlocked_at !== null && new Date(lead.unlocked_at) <= now

    let isFreeGranted = false
    if (!isPremium && !isTimeUnlocked) {
      const { data: grant } = await supabase
        .from('free_lead_grants')
        .select('id')
        .eq('pro_id', user.id)
        .eq('lead_id', lead.id)
        .maybeSingle()
      isFreeGranted = !!grant
    }

    if (!isPremium && !isTimeUnlocked && !isFreeGranted) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Débloquez ce lead avant de contacter le client.'
      })
    }

    isProSender = true
  } else {
    throw createError({ statusCode: 401, statusMessage: 'Non authentifié' })
  }

  // Insert message
  const { data: message, error: insertError } = await supabase
    .from('messages')
    .insert({
      lead_id: lead.id,
      content,
      is_pro_sender: isProSender
    })
    .select('id, created_at')
    .single()

  if (insertError || !message) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de l\'envoi du message' })
  }

  // Email Notification via Resend (Abstraction)
  const siteUrl = useRuntimeConfig(event).public.siteUrl
  if (isProSender) {
    await sendEmail({
      to: lead.projects.customer_email,
      subject: `Nouveau message de votre artisan sur BÂTI-AXE`,
      html: `
        <p>Bonjour,</p>
        <p>Vous avez reçu un nouveau message concernant votre projet.</p>
        <p>
          <a href="${siteUrl}/mon-projet/${lead.projects.access_token}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Lire et répondre
          </a>
        </p>
        <p>L'équipe BÂTI-AXE</p>
      `
    })
  } else {
    // For the pro, we fetch the pro's email from professionals table or auth.
    const { data: proAuth } = await supabase.auth.admin.getUserById(lead.pro_id)
    if (proAuth && proAuth.user) {
      await sendEmail({
        to: proAuth.user.email,
        subject: `Nouveau message d'un client sur BÂTI-AXE`,
        html: `
          <p>Bonjour,</p>
          <p>Un client vous a répondu concernant le chantier <strong>${lead.projects.category || 'en cours'}</strong>.</p>
          <p>
            <a href="${siteUrl}/espace/leads/${lead.id}" style="background-color: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Voir le message sur mon Espace Pro
            </a>
          </p>
          <p>L'équipe BÂTI-AXE</p>
        `
      })
    }
  }

  return { success: true, messageId: message.id, createdAt: message.created_at }
})
