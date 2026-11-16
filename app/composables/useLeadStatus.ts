// Suivi CRM d'un chantier particulier (nouveau / contacté / gagné / perdu), mise à jour optimiste.
export const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'Nouveau lead' },
  { value: 'contacted', label: 'Déjà contacté' },
  { value: 'won', label: 'Chantier gagné' },
  { value: 'lost', label: 'Chantier perdu' },
] as const

export function useLeadStatus() {
  async function updateLeadStatus(lead: any, newStatus: string): Promise<boolean> {
    const oldStatus = lead.db_status
    lead.db_status = newStatus
    try {
      await $fetch(`/api/v1/leads/${lead.id}/status`, { method: 'PATCH', body: { status: newStatus } })
      return true
    } catch {
      lead.db_status = oldStatus
      return false
    }
  }
  return { updateLeadStatus }
}
