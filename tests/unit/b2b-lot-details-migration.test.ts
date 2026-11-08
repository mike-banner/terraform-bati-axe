import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/20261108000000_b2b_lot_details.sql', 'utf8')

describe('migration 20261108000000 — détail des lots B2B', () => {
  it('ajoute les colonnes nullables avec bornes, sans nouvelle table', () => {
    expect(sql).toMatch(/b2b_tender_lots[\s\S]*ADD COLUMN IF NOT EXISTS description TEXT/)
    expect(sql).toMatch(/char_length\(description\) BETWEEN 10 AND 1000/)
    expect(sql).toMatch(/nb_logements SMALLINT/)
    expect(sql).toMatch(/surface_m2 INTEGER/)
    expect(sql).toMatch(/'urgent','sous_3_mois','3_6_mois','plus_6_mois'/)
    expect(sql).not.toMatch(/CREATE TABLE/i)
    expect(sql).not.toMatch(/NOT NULL/i)
  })
})
