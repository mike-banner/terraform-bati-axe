// D-29 — même découpage que le serveur (server/utils/adminOperator.ts) : noms séparés par des virgules.
export function parseOperators(raw: string | undefined | null): string[] {
  return [...new Set(String(raw ?? '').split(',').map(s => s.trim()).filter(Boolean))]
}
