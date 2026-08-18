// Rate limit best-effort en mémoire (par isolate Workers — pas de garantie
// cross-isolate/cross-région). Suffisant pour ralentir un brute-force naïf sur
// un endpoint sensible ; pas un remplacement pour une règle Cloudflare WAF au
// niveau réseau (voir .planning/SECURITY-CHECKLIST.md §2).
const hits = new Map<string, number[]>()

export function isRateLimited(key: string, opts: { max: number, windowMs: number }): boolean {
  const now = Date.now()
  const timestamps = (hits.get(key) ?? []).filter(t => now - t < opts.windowMs)
  timestamps.push(now)
  hits.set(key, timestamps)
  return timestamps.length > opts.max
}
