# API RULES

> Règles pour toutes les routes API et Server Actions du projet.
> Applicable à Next.js App Router.

---

## Architecture API

| Type | Usage | Localisation |
| :--- | :--- | :--- |
| Server Actions | Mutations internes (forms, dashboard) | `app/_actions/*.ts` |
| Route Handlers | Webhooks externes (Stripe, etc.) | `app/api/v1/*.ts` |
| Supabase RPC | Requêtes DB complexes | Fonctions PostgreSQL |

**Règle d'or :** Préférer Server Actions pour tout ce qui est interne. Les Route Handlers sont réservés aux webhooks et intégrations tierces.

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

- Chaque Server Action vérifie la session Supabase Auth
- Chaque Route Handler valide le token Bearer
- Middleware Next.js protège les routes privées par défaut
- Les webhooks Stripe sont vérifiés via signature `stripe.webhooks.constructEvent()`

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
