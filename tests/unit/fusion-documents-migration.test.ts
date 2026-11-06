import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/20261106000000_fusion_documents_artisan.sql'), 'utf8')

describe('migration fusion_documents_artisan (05.11-05)', () => {
  it('refuse de supprimer documents_artisan si elle contient des lignes', () => {
    expect(sql).toMatch(/IF EXISTS \(SELECT 1 FROM public\.documents_artisan\) THEN\s+RAISE EXCEPTION/)
  })
  it('ajoute urssaf, issued_on et les colonnes d\'alerte à verifications', () => {
    expect(sql).toMatch(/document_type IN \('decennale','kbis','rge','urssaf'\)/)
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS issued_on DATE/)
    expect(sql).toMatch(/alert_j30_sent_at TIMESTAMPTZ/)
    expect(sql).toMatch(/alert_j7_sent_at TIMESTAMPTZ/)
    expect(sql).toMatch(/document_type <> 'urssaf' OR expiry_date IS NOT NULL/)
  })
  it('coupe la capacité sur Kbis/décennale/URSSAF manquants et RGE énergie, fonction non exécutable par les clients', () => {
    expect(sql).toMatch(/v\.issued_on >= current_date - interval '3 months'/)
    expect(sql).toMatch(/'renovation_energetique' = ANY \(p\.categories\) AND p\.rge_status <> 'valid'/)
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.sync_professional_subcontracting\(\) FROM PUBLIC, anon, authenticated/)
  })
  it('remplace l\'ancien job cron et supprime le modèle en double', () => {
    expect(sql).toMatch(/cron\.unschedule\('expire-artisan-documents'\)/)
    expect(sql).toMatch(/cron\.schedule\('sync-subcontracting'/)
    expect(sql).toMatch(/DROP TABLE IF EXISTS public\.documents_artisan/)
    expect(sql).toMatch(/DROP TYPE IF EXISTS public\.artisan_doc_status/)
  })
})
