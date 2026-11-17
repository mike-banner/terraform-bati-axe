import { departmentLabel } from '../../app/utils/departments'
import { COMPATIBILITY_MATRIX } from '../../app/utils/workTypeMatrix'

// Aperçu d'un lead flouté : uniquement des données issues de listes fermées (département déduit du
// code postal, postes cochés dans le tunnel). Jamais de texte libre : le particulier peut y écrire
// un nom, un téléphone ou une adresse (ADR-004).
function previewFields(proj: any) {
  const works = (Array.isArray(proj.selected_items) ? proj.selected_items : [])
    .map((k: string) => COMPATIBILITY_MATRIX[k]?.label)
    .filter(Boolean)
  return { department: departmentLabel(proj.postal_code), works }
}

export function maskLead(lead: any, isPremium: boolean, now: Date, isFreeGranted: boolean = false): Record<string, any> {
  const proj = lead.projects || {}

  // Claimed by another pro: show only non-sensitive lead info (D-10)
  if (lead.status === 'claimed' && !isPremium) {
    return {
      id: lead.id,
      status: 'claimed',
      created_at: lead.created_at,
      projects: {
        category: proj.category,
        budget_range: proj.budget_range,
      },
    }
  }

  // D-03: free-grant path — first 3 leads tracked in free_lead_grants junction table
  const isUnlocked = isPremium || isFreeGranted || (lead.unlocked_at !== null && new Date(lead.unlocked_at) <= now)

  if (!isUnlocked) {
    // BASIC pro, 48h pas écoulées : coordonnées masquées (D-05)
    return {
      id: lead.id,
      status: 'locked',
      unlocked_at: lead.unlocked_at,
      created_at: lead.created_at,
      category: proj.category,
      budget_range: proj.budget_range,
      timeline_range: proj.timeline_range,
      ...previewFields(proj),
      customer_name: '*** *** ***',
      customer_phone: '*** *** ***',
      customer_email: 'contact@***.fr',
      postal_code: '***',
    }
  }

  // Premium ou 48h écoulées : données complètes (D-06 / D-07)
  return {
    id: lead.id,
    status: 'unlocked',
    db_status: lead.status, // Original DB status for CRM tracking
    unlocked_at: lead.unlocked_at,
    created_at: lead.created_at,
    category: proj.category,
    budget_range: proj.budget_range,
    timeline_range: proj.timeline_range,
    description: proj.description,
    customer_name: proj.customer_name,
    customer_phone: proj.customer_phone,
    customer_email: proj.customer_email,
    postal_code: proj.postal_code,
  }
}
