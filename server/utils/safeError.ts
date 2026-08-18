// Logue le détail réel côté serveur (Postgres/R2/Stripe...) mais ne renvoie
// jamais ce détail au client — évite l'exposition de noms de colonnes,
// contraintes SQL ou messages internes des providers tiers.
export function serverError(context: string, err: any, opts?: { statusCode?: number, fallback?: string }): never {
  console.error(`[${context}]`, err)
  throw createError({
    statusCode: opts?.statusCode ?? 500,
    statusMessage: opts?.fallback ?? 'Une erreur est survenue. Réessayez dans quelques instants.',
  })
}
