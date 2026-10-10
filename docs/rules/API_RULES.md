# API RULES

> Règles pour toutes les routes API et endpoints Nitro du projet.
> Applicable à l'API Nuxt 3 (Nitro).

---

## Architecture API

| Type | Usage | Localisation |
| :--- | :--- | :--- |
| Nitro API Routes | Endpoints REST / RPC de l'application | `server/api/**/*.ts` |
| Nitro Middlewares | Logs, Sentry, Security Headers | `server/middleware/*.ts` |
| Supabase RPC | Requêtes DB complexes | Fonctions PostgreSQL |

**Règle d'or :** Toute opération de mutation ou de lecture privée passe par les endpoints `/api/...` de Nitro. La logique RLS de Supabase sert de garde-fou final, mais l'API Nitro applique la logique métier (floutage, validation R2). No direct DB access from the client for write operations.

---

## Versioning

- Toute API publique expose la version dans l'URL : `/api/v1/`
- Header optionnel : `X-API-Version: 1`
- Pas de changement breaking sans nouveau préfixe de version `/api/v2/`

---

## Format de Réponse Standard

### Succès

```typescript
type ApiSuccess<T> = {
  data: T;
  error: null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
};
```

### Erreur

```typescript
type ApiError = {
  data: null;
  error: {
    code: string;      // 'LEAD_NOT_FOUND', 'UNAUTHORIZED'
    message: string;   // Message lisible
    details?: unknown; // Zod errors, etc.
  };
};
```

---

## HTTP Status Codes

| Code | Usage |
| :--- | :--- |
| `200` | Succès lecture |
| `201` | Ressource créée |
| `400` | Input invalide (erreur client) |
| `401` | Non authentifié |
| `403` | Non autorisé (authentifié mais sans permission) |
| `404` | Ressource introuvable |
| `409` | Conflit (doublon, état invalide) |
| `422` | Validation échouée (Zod) |
| `429` | Rate limit dépassé |
| `500` | Erreur serveur (loggée, jamais exposée raw) |

---

## Validation

- **Zod obligatoire** sur tous les inputs entrants (Server Actions, Route Handlers)
- Validation côté serveur uniquement pour la logique métier
- Côté client : validation UX uniquement (pas de sécurité)

```typescript
// Pattern obligatoire
const schema = z.object({
  firstName: z.string().min(2).max(100),
  projectType: z.enum(['renovation', 'construction', 'extension']),
});

const validated = schema.safeParse(input);
if (!validated.success) {
  return { data: null, error: { code: 'VALIDATION_ERROR', details: validated.error } };
}
```

---

## Authentification & Autorisation

- Chaque API Nitro privée vérifie la session Supabase Auth (via le module `@nuxtjs/supabase` server utilities)
- Middleware de route Nuxt (`middleware/auth.ts`) protège les pages privées `/app/**` côté client
- Les webhooks Stripe sont vérifiés via signature `stripe.webhooks.constructEvent()` dans l'endpoint Nitro dédié

---

## Rate Limiting

- API publique : 60 req/min par IP (Cloudflare)
- API authentifiée : 300 req/min par utilisateur
- Webhooks : illimité côté serveur, limité côté Stripe

---

## Pagination

Obligatoire sur toutes les listes.

```typescript
// Format cursor-based (préféré pour perf)
type PaginatedResponse<T> = {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
};
```

## Règles ajoutées le 2026-10-10

- **Accès par chantier** : toute route qui lit ou débloque un chantier utilise `canAccessLead` / `proMatchesProject` (`app/utils/workTypeMatrix.ts`) — liste, détail, déblocage, e-mails. Le masquage des coordonnées reste côté serveur (ADR-004).
- **Dépôts de fichiers** : URL présignée R2 générée par Nitro ; la date d'expiration d'un justificatif `rge` est obligatoire, au format `YYYY-MM-DD`, strictement future ; un dépôt part toujours en `pending` (validation admin).
- **Champs interdits au pro** : `PATCH /api/v1/pro/profile/me` est `.strict()` ; `professional_type`, `egb_status`, `rge_status`, `is_verified`, `subscription_status` y sont refusés (400).
- **Endpoints admin EGB** : `GET /api/v1/admin/egb` et `PATCH /api/v1/admin/egb/[id]` (rôle `app_metadata.role === 'admin'`, trace dans `audit_logs`).
