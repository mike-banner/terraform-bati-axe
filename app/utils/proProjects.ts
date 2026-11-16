// « Mes projets » (espace pro) : appels d'offres sur lesquels le pro s'est positionné,
// répartis selon l'état de l'avenant de mise en relation.
export interface ProProject {
  lot_id: string
  positioned?: boolean
  avenant_signed?: boolean
  created_at?: string | null
}

export function splitProjects<T extends ProProject>(tenders: T[]): { signed: T[]; unsigned: T[] } {
  const mine = tenders.filter(t => t.positioned)
  const byRecent = (a: T, b: T) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  return {
    signed: mine.filter(t => t.avenant_signed).sort(byRecent),
    unsigned: mine.filter(t => !t.avenant_signed).sort(byRecent),
  }
}
