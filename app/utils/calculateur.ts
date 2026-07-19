export interface CalculateurInput {
  renovation_type: string
  pieces: string[]
  surface_m2: number
  gamme: 'leger' | 'standard' | 'premium'
}

export interface CalculateurResult {
  estimate_min: number
  estimate_max: number
}

// ponytail: grille en dur, ajuster selon retours métier
const PRIX_M2: Record<CalculateurInput['gamme'], number> = {
  leger: 250,
  standard: 500,
  premium: 900,
}

const FORFAITS_PIECES: Record<string, number> = {
  cuisine: 8000,
  salle_de_bain: 6000,
  salon: 2500,
  chambre: 2000,
  exterieur: 5000,
  autre: 1500,
}

function round500(n: number): number {
  return Math.round(n / 500) * 500
}

export function computeEstimate(input: CalculateurInput): CalculateurResult {
  const forfaitsPieces = input.renovation_type === 'pieces'
    ? input.pieces.reduce((sum, piece) => sum + (FORFAITS_PIECES[piece] ?? 0), 0)
    : 0

  const base = input.surface_m2 * PRIX_M2[input.gamme] + forfaitsPieces

  const estimate_min = round500(base * 0.85)
  let estimate_max = round500(base * 1.15)
  if (estimate_max <= estimate_min) estimate_max = estimate_min + 500

  return { estimate_min, estimate_max }
}
