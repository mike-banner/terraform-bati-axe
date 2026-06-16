# supabase/fixtures

Données de **test local uniquement**. Ce dossier n'est **pas** géré par le système de
migrations Supabase : rien ici n'est jamais poussé en prod (`supabase db push`) ni rejoué
automatiquement au `db reset`.

- `test_data_seeding.sql` — pros/projets/leads/vérifs de démo (anciennement migration
  `20260613000000`, sortie des migrations le 2026-06-16 car c'est du seed, pas du schéma,
  et il ne doit jamais atteindre la prod).

Pour (re)charger en local :

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/fixtures/test_data_seeding.sql
```
