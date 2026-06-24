---
phase: 05-integration-api-siret-badges
reviewed: 2026-06-24T16:48:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - app/components/ui/BadgeDecennaleCertifiee.vue
  - app/components/ui/BadgeEntrepriseVerifiee.vue
  - app/pages/app/dashboard.vue
  - app/pages/pro/[dept]/[slug].vue
  - server/api/v1/admin/approve-pro.post.ts
  - server/api/v1/pro/claim.post.ts
  - server/api/v1/pro/documents/upload.post.ts
  - server/api/v1/pro/profile/[slug].get.ts
  - server/utils/siretLookup.ts
  - supabase/migrations/20260624000000_phase5_siret_badges.sql
  - tests/admin-approve.test.ts
  - tests/auto-approve.test.ts
  - tests/badges.test.ts
  - tests/siret-lookup.test.ts
findings:
  critical: 3
  warning: 4
  info: 2
  total: 9
status: issues_found
---

# Phase 05 : Rapport de revue — Intégration API SIRET & Badges

**Révisé :** 2026-06-24T16:48:00Z
**Profondeur :** standard
**Fichiers examinés :** 14
**Statut :** issues_found

## Résumé

La phase implémente le lookup SIRET via l'API Recherche Entreprises, l'auto-approbation de la décennale, et deux badges visuels. L'architecture globale est correcte : la validation Zod est présente aux entrées, le masquage serveur (ADR-004) est respecté dans `profile/[slug].get.ts`, et les tests couvrent les chemins principaux.

Trois blockers ont été identifiés : un bypass d'authentification sur l'endpoint de document par injection de `file_key`, une injection potentielle dans l'URL de l'API gouvernementale, et un bug de race condition sur le slug lors d'un re-claim (l'upsert écrase le `canonical_slug` d'un profil existant). Quatre warnings concernent des failles de robustesse moins urgentes.

---

## Structural Findings (fallow)

_Aucune analyse structurelle pré-fournie pour cette phase._

---

## Narrative Findings (AI reviewer)

## Problèmes critiques

### CR-01 : Injection de `file_key` arbitraire dans `upload.post.ts` — bypass de la vérification R2

**Fichier :** `server/api/v1/pro/documents/upload.post.ts:4-8`

**Problème :** Le schéma Zod accepte `file_key: z.string().min(1)` sans aucune contrainte de format. Le client fournit lui-même cette clé après avoir obtenu une presigned URL via `/api/v1/pro/documents/presign`. Rien n'empêche un utilisateur authentifié d'appeler directement `/api/v1/pro/documents/upload` avec un `file_key` arbitraire — par exemple celui d'un autre pro — et d'enregistrer ce document comme le sien, ou d'injecter une clé de type `../../admin/secret`. Le endpoint insère en base sans vérifier que la clé appartient bien à l'utilisateur courant, ni qu'elle respecte la structure attendue.

**Correction :**

```typescript
// Contraindre le format attendu du file_key côté serveur
const schema = z.object({
  document_type: z.enum(['kbis', 'decennale']),
  // Format : {uid}/{type}/{filename} — uid doit correspondre à l'utilisateur courant
  file_key: z.string().regex(/^[0-9a-f-]{36}\/(kbis|decennale)\/[^/]+$/, 'Clé de fichier invalide.'),
  policy_number: z.string().optional(),
  expiration_date: z.string().optional(),
})

// Puis après résolution de uid, vérifier la cohérence :
if (!parsed.data.file_key.startsWith(`${uid}/`)) {
  throw createError({ statusCode: 403, statusMessage: 'Clé de fichier non autorisée.' })
}
```

---

### CR-02 : Injection de paramètre dans l'URL de l'API gouvernementale (`siretLookup.ts`)

**Fichier :** `server/utils/siretLookup.ts:12`

**Problème :** Le SIRET est interpolé directement dans l'URL sans encodage :

```typescript
`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&page=1&per_page=1`
```

Bien que la validation Zod dans `claim.post.ts` impose `/^\d{14}$/`, cette fonction est une utilitaire importable. Si elle est appelée depuis un autre contexte sans pré-validation (futur endpoint, script admin, etc.), un SIRET contenant `&page=999&per_page=999` ou des caractères spéciaux modifierait la requête. La défense en profondeur exige que chaque fonction valide ses propres entrées au niveau où la vulnérabilité existe.

**Correction :**

```typescript
export async function lookupSiret(siret: string): Promise<SiretLookupResult> {
  // Guard interne — ne pas supposer que l'appelant a déjà validé
  if (!/^\d{14}$/.test(siret)) {
    return { status: 'error', verified_at: new Date().toISOString() }
  }
  const url = new URL('https://recherche-entreprises.api.gouv.fr/search')
  url.searchParams.set('q', siret)
  url.searchParams.set('page', '1')
  url.searchParams.set('per_page', '1')
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) })
  // ...
}
```

---

### CR-03 : L'upsert dans `claim.post.ts` écrase le `canonical_slug` d'un profil existant non vérifié

**Fichier :** `server/api/v1/pro/claim.post.ts:196-220`

**Problème :** La logique autorise un re-claim si `existingPro.is_verified === false` (ligne 96). Dans ce cas, l'upsert génère un nouveau `short_id` et un nouveau `canonical_slug` et les écrit en base, ce qui :
1. Casse toutes les URLs déjà partagées par le pro.
2. Orphanise les entrées `verifications` qui pointent sur `pro_id` correct mais dont le slug dans les emails/SMS ne correspond plus.

Le `short_id` est regénéré à chaque appel parce que `generateShortId()` est appelé inconditionnellement (ligne 152), et l'upsert avec `onConflict: 'id'` remplace toutes les colonnes y compris `short_id` et `canonical_slug`.

**Correction :**

```typescript
// Récupérer le short_id existant si le pro existe déjà
const shortId = existingPro?.short_id ?? generateShortId()
const canonicalSlug = existingPro?.canonical_slug ?? `${slugify(data.company_name)}-${slugify(cityName)}-${shortId}`

// Dans l'upsert, exclure ces colonnes si elles existent déjà
await supabase.from('professionals').upsert({
  id: userId,
  // Ne ré-écrire short_id et canonical_slug que pour les nouvelles créations
  ...(existingPro ? {} : { short_id: shortId, canonical_slug: canonicalSlug }),
  // ... reste des champs
}, { onConflict: 'id', ignoreDuplicates: false })
```

Ou plus simplement, utiliser `.update()` si `existingPro` existe et `.insert()` sinon, pour contrôler explicitement quelles colonnes sont modifiées.

---

## Avertissements

### WR-01 : Résultat d'erreur Supabase ignoré dans `approve-pro.post.ts` lors de l'update

**Fichier :** `server/api/v1/admin/approve-pro.post.ts:53-56`

**Problème :** L'appel `await supabase.from('professionals').update(...).eq('id', pro_id)` ne vérifie pas l'erreur retournée. Si l'update échoue (contrainte DB, réseau), la réponse `{ status: 'SUCCESS' }` est quand même renvoyée et l'audit log est inséré avec `approved: true` — le log est mensonger et le pro reste non vérifié sans alerte.

**Correction :**

```typescript
const { error: updateErr } = await supabase
  .from('professionals')
  .update({ is_verified: true, decennal_status: 'valid', labels: newLabels })
  .eq('id', pro_id)

if (updateErr) throw createError({ statusCode: 500, statusMessage: 'Échec de la mise à jour du profil.' })
```

---

### WR-02 : `serverSupabaseServiceRole` appelé sans `await` dans `upload.post.ts`

**Fichier :** `server/api/v1/pro/documents/upload.post.ts:31`

**Problème :**

```typescript
const supabase = serverSupabaseServiceRole(event) as any  // pas de await
```

Tous les autres endpoints utilisent `await serverSupabaseServiceRole(event)`. Si la fonction est async (ce qu'elle est dans le module `#supabase/server`), `supabase` est une `Promise` non résolue et tous les appels `.from()` ultérieurs échouent silencieusement ou lèvent des erreurs non typées masquées par le `as any`.

**Correction :**

```typescript
const supabase = await serverSupabaseServiceRole(event) as any
```

---

### WR-03 : La réponse de l'API gouvernementale n'est pas vérifiée (`res.ok`) avant parsing JSON

**Fichier :** `server/utils/siretLookup.ts:14-15`

**Problème :** Si l'API retourne un HTTP 429 (rate limit), 503 ou toute erreur HTTP, `res.json()` est appelé sur le corps d'erreur. Le parsing peut réussir mais produire un objet sans `total_results`, ce qui provoque une lecture de `json.total_results` sur `undefined` et retourne `not_found` au lieu de `error` — l'entreprise serait ainsi considérée comme introuvable plutôt que comme une erreur temporaire.

**Correction :**

```typescript
const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) })
if (!res.ok) {
  // Rate limit ou erreur serveur → ne pas bloquer la registration
  return { status: 'error', verified_at }
}
const json = await res.json() as { ... }
```

---

### WR-04 : L'expiration de la décennale n'est pas validée côté serveur (date passée acceptée)

**Fichier :** `server/api/v1/pro/documents/upload.post.ts:28`

**Problème :** La date d'expiration `expiration_date` est vérifiée pour présence (`!expiration_date`) mais jamais pour validité temporelle. Un pro peut soumettre une date passée (ex : `2020-01-01`) et obtenir `decennal_status: 'valid'` et le badge `decennale_certified` pour une assurance expirée. La validation côté client (champ `<input type="date">`) est bypassable.

**Correction :**

```typescript
if (document_type === 'decennale') {
  if (!policy_number?.trim()) throw createError({ statusCode: 422, statusMessage: 'Numéro de police requis.' })
  if (!expiration_date) throw createError({ statusCode: 422, statusMessage: "Date d'expiration requise." })
  // Vérifier que la date n'est pas déjà passée
  if (new Date(expiration_date) <= new Date()) {
    throw createError({ statusCode: 422, statusMessage: "La date d'expiration ne peut pas être dans le passé." })
  }
}
```

---

## Informations

### IN-01 : Duplication de la logique `@keyframes shimmer` dans les deux composants Badge

**Fichiers :** `app/components/ui/BadgeDecennaleCertifiee.vue:14-28`, `app/components/ui/BadgeEntrepriseVerifiee.vue:14-28`

**Problème :** Le bloc `<style scoped>` avec `@keyframes shimmer`, `.animate-shimmer` et la media query `prefers-reduced-motion` est identique dans les deux composants. Avec `scoped`, chaque instance injecte le même CSS.

**Suggestion :** Extraire l'animation dans `tailwind.css` (une seule fois via `@layer utilities`) ou dans un composant `BaseBadge.vue` partagé. Applicable si un troisième badge est prévu.

---

### IN-02 : Le `dept` de l'URL n'est jamais utilisé dans `[slug].get.ts`

**Fichier :** `app/pages/pro/[dept]/[slug].vue:50-53`, `server/api/v1/pro/profile/[slug].get.ts`

**Problème :** La page extrait `dept` depuis `route.params.dept` mais ne le transmet pas à l'API. L'API `profile/[slug].get.ts` recherche le pro par `short_id` uniquement, sans filtrer par département. Un slug valide dans le mauvais département retourne le bon profil (pas de 404) et une redirection 301 n'est déclenchée que si le slug complet diffère, pas si le département est incorrect. Ce n'est pas un bug de sécurité mais peut créer des URLs ambiguës avec du contenu dupliqué pour le SEO.

**Suggestion :** Soit valider que le dept dans l'URL correspond au code postal du pro côté serveur, soit supprimer le paramètre dept s'il ne sert qu'à la lisibilité.

---

_Révisé : 2026-06-24T16:48:00Z_
_Reviewer : Claude (gsd-code-reviewer)_
_Profondeur : standard_
