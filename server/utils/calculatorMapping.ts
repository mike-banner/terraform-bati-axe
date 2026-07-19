// Dérivation server-side des métiers depuis les choix du calculateur (D-03, invariant marché dynamique Phase 4.6)

const ALL_TRADES = ['maconnerie', 'plomberie', 'electricite', 'peinture', 'isolation', 'toiture'] as const
export type Trade = typeof ALL_TRADES[number]

// Priorité fixe pour départager les égalités (Task 1, option-a)
const PRIORITY_ORDER: Trade[] = ['maconnerie', 'plomberie', 'electricite', 'peinture', 'isolation', 'toiture']

// Table de mapping pièce → métiers (défaut option-a)
const PIECE_TRADES: Record<string, Trade[]> = {
  cuisine: ['plomberie', 'electricite', 'peinture'],
  salle_de_bain: ['plomberie', 'electricite', 'peinture', 'isolation'],
  salon: ['peinture', 'electricite', 'isolation'],
  chambre: ['peinture', 'electricite', 'isolation'],
  exterieur: ['maconnerie', 'toiture', 'isolation'],
  autre: ['peinture'],
}

export function deriveTrades(renovation_type: string, pieces: string[]): Trade[] {
  if (renovation_type === 'totale') {
    return [...ALL_TRADES]
  }

  const trades = new Set<Trade>()
  for (const piece of pieces) {
    for (const trade of PIECE_TRADES[piece] ?? []) {
      trades.add(trade)
    }
  }
  return [...trades]
}

export function derivePrimaryCategory(renovation_type: string, pieces: string[]): Trade {
  if (renovation_type === 'totale') {
    return 'maconnerie'
  }

  const counts = new Map<Trade, number>()
  for (const piece of pieces) {
    for (const trade of PIECE_TRADES[piece] ?? []) {
      counts.set(trade, (counts.get(trade) ?? 0) + 1)
    }
  }

  let best: Trade = PRIORITY_ORDER[0]
  let bestCount = 0
  for (const trade of PRIORITY_ORDER) {
    const count = counts.get(trade) ?? 0
    if (count > bestCount) {
      bestCount = count
      best = trade
    }
  }
  return best
}
