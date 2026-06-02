import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'

// French phone validation regex
const phoneRegex = /^(?:(?:\+|00)33|0)[1-9](?:[\s.-]*\d{2}){4}$/

// Input validation schema
const createProjectSchema = z.object({
  category: z.string().min(1, 'La catégorie est requise.'),
  description: z.string().min(20, 'La description doit faire au moins 20 caractères.'),
  budget_range: z.string().min(1, 'Le budget estimé est requis.'),
  postal_code: z.string().regex(/^\d{5}$/, 'Le code postal doit comporter 5 chiffres.'),
  customer_name: z.string().min(2, 'Le nom doit comporter au moins 2 caractères.'),
  customer_email: z.string().email('Adresse email invalide.'),
  customer_phone: z.string().regex(phoneRegex, 'Numéro de téléphone invalide.'),
  cgu_accepted: z.literal(true, {
    errorMap: () => ({ message: 'Vous devez accepter les CGU.' })
  }),
  sms_opt_in: z.boolean().default(false)
})

export default defineEventHandler(async (event) => {
  try {
    // 1. Read and validate request body
    const body = await readBody(event)
    const validation = createProjectSchema.safeParse(body)

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation failed',
        data: validation.error.format()
      })
    }

    const data = validation.data
    const supabase = await serverSupabaseServiceRole(event)

    // 2. Verify if the postal code belongs to an active pilot zone
    const { data: matchedZone, error: zoneError } = await supabase
      .from('zones')
      .select('id, name')
      .eq('is_active', true)
      .contains('postal_codes', [data.postal_code])
      .maybeSingle()

    if (zoneError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Database error checking zones'
      })
    }

    if (!matchedZone) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Zone non couverte',
        data: { message: `Désolé, la zone pour le code postal ${data.postal_code} n'est pas encore couverte par nos professionnels.` }
      })
    }

    // Get IP and User-Agent for compliance auditing
    const ip = getHeader(event, 'cf-connecting-ip') || getHeader(event, 'x-forwarded-for') || event.node.req.socket.remoteAddress
    const userAgent = getHeader(event, 'user-agent')

    // 3. Create the project in DB
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        category: data.category,
        description: data.description,
        budget_range: data.budget_range,
        postal_code: data.postal_code,
        zone_id: matchedZone.id,
        status: 'pending'
      })
      .select('id')
      .single()

    if (projectError || !project) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create project record'
      })
    }

    // 4. Save CGU consent row
    const consentsToInsert = [
      {
        subject_type: 'customer',
        subject_id: project.id,
        channel: 'cgu',
        status: 'granted',
        source: 'simulateur',
        ip,
        user_agent: userAgent,
        cgu_version: '1.0'
      }
    ]

    // 5. Save SMS consent if opted in
    if (data.sms_opt_in) {
      consentsToInsert.push({
        subject_type: 'customer',
        subject_id: project.id,
        channel: 'sms',
        status: 'granted',
        source: 'simulateur',
        ip,
        user_agent: userAgent,
        cgu_version: null
      })
    }

    const { error: consentError } = await supabase
      .from('consents')
      .insert(consentsToInsert)

    if (consentError) {
      // Non-blocking but should be logged or handled
      console.error('Failed to log consent status:', consentError)
    }

    // 6. Log audit entry for tracking
    await supabase
      .from('audit_logs')
      .insert({
        action: 'project_created',
        target_table: 'projects',
        target_id: project.id,
        metadata: {
          category: data.category,
          postal_code: data.postal_code,
          zone_name: matchedZone.name
        }
      })

    // Return success
    setResponseStatus(event, 201)
    return {
      status: 'SUCCESS',
      projectId: project.id,
      zoneName: matchedZone.name
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal Server Error'
    })
  }
})
