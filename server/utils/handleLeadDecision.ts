import { shouldRelaunch, canRelaunch } from './leadFeedback'

// Orchestration de la décision du particulier (REQ-06), extraite de l'endpoint
// magic-link pour être testable (même pattern que handleStripeEvent).
// Le HTTP reste dans l'endpoint ; ici on ne manipule que la base (supabase injecté).

export type LeadDecisionOutcome =
  | { ok: true; relaunched: boolean; customerEmail?: string | null }
  | { ok: false; reason: 'project_not_found' | 'lead_mismatch' }

export interface LeadDecisionInput {
  token: string
  lead_id: string
  decision: 'refused' | 'selected'
}

export async function handleLeadDecision(
  supabase: any,
  { token, lead_id, decision }: LeadDecisionInput,
): Promise<LeadDecisionOutcome> {
  // 1. Résoudre le projet via le token (auth particulier).
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, customer_email, access_token, relaunch_count')
    .eq('access_token', token)
    .single()

  if (projectError || !project) {
    return { ok: false, reason: 'project_not_found' }
  }

  // 2. Vérifier que le lead appartient bien à ce projet.
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, project_id, status')
    .eq('id', lead_id)
    .single()

  if (leadError || !lead || lead.project_id !== project.id) {
    return { ok: false, reason: 'lead_mismatch' }
  }

  // 3. Enregistrer la décision.
  const { error: updateError } = await supabase
    .from('leads')
    .update({ customer_decision: decision })
    .eq('id', lead.id)

  if (updateError) {
    throw new Error(`Erreur lors de l'enregistrement du choix : ${updateError.message}`)
  }

  // "selected" → rien d'autre : la présence d'un retenu empêche toute relance.
  if (decision === 'selected') {
    return { ok: true, relaunched: false, customerEmail: project.customer_email }
  }

  // 4. "refused" → faut-il remettre le projet au marché ?
  const { data: projectLeads } = await supabase
    .from('leads')
    .select('status, unlocked_at, customer_decision')
    .eq('project_id', project.id)

  if (!shouldRelaunch(projectLeads || []) || !canRelaunch(project.relaunch_count ?? 0)) {
    return { ok: true, relaunched: false, customerEmail: project.customer_email }
  }

  // 5. Remise au marché : passer les leads engagés refusés à 'lost'. Cela libère les
  // slots du cap (claim Premium) et retire les conversations refusées de l'espace
  // client, tout en gardant l'historique. Couvre claim ET free-grant (unlocked_at).
  await supabase
    .from('leads')
    .update({ status: 'lost' })
    .eq('project_id', project.id)
    .eq('customer_decision', 'refused')
    .not('unlocked_at', 'is', null)

  await supabase
    .from('projects')
    .update({
      relaunch_count: (project.relaunch_count ?? 0) + 1,
      last_relaunched_at: new Date().toISOString(),
    })
    .eq('id', project.id)

  return { ok: true, relaunched: true, customerEmail: project.customer_email }
}
