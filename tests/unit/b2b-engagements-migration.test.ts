import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/20261030000000_b2b_engagements.sql'), 'utf8')
const code = sql.split('\n').filter(l => !l.trimStart().startsWith('--')).join('\n')

describe('migration b2b_engagements', () => {
  it('active la RLS sur les 3 tables, sans aucune policy', () => {
    for (const t of ['b2b_engagements', 'b2b_signature_challenges', 'b2b_partner_tokens']) {
      expect(code).toMatch(new RegExp(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`))
    }
    expect(code).not.toMatch(/CREATE POLICY/)
  })
  it('fige les montants et révoque TRUNCATE', () => {
    expect(code).toMatch(/Montant déclaré figé après confirmation/)
    expect(code).toMatch(/Montant confirmé figé/)
    expect(code).toMatch(/REVOKE TRUNCATE ON b2b_engagements, b2b_signature_challenges, b2b_partner_tokens FROM anon, authenticated/)
  })
  it('stocke les jetons dans b2b_partner_tokens, pas sur b2b_requests', () => {
    expect(code).not.toMatch(/partner_token_hash/)
    expect(code).toMatch(/CREATE TABLE IF NOT EXISTS b2b_partner_tokens/)
  })
  it('pose les 3 index uniques partiels', () => {
    expect(code).toMatch(/uq_b2b_engagements_framework_pro ON b2b_engagements \(pro_id, template_version\) WHERE type = 'framework_pro'/)
    expect(code).toMatch(/uq_b2b_engagements_framework_partner ON b2b_engagements \(signer_email, template_version\) WHERE type = 'framework_partner'/)
    expect(code).toMatch(/uq_b2b_engagements_lot_amendment ON b2b_engagements \(lot_id, pro_id\) WHERE type = 'lot_amendment'/)
  })
  it('garde BEFORE UPDATE OR DELETE avec ERRCODE 42501', () => {
    expect(code).toMatch(/trg_b2b_engagements_guard\s+BEFORE UPDATE OR DELETE ON b2b_engagements/)
    expect(code).toMatch(/ERRCODE = '42501'/)
  })
  it('montants en BIGINT, jamais en flottant', () => {
    for (const c of ['declared_amount_cents', 'confirmed_amount_cents', 'commission_cents']) {
      expect(code).toMatch(new RegExp(`${c}\\s+BIGINT`))
    }
    expect(code).not.toMatch(/FLOAT|REAL|DOUBLE/i)
  })
  it('ajoute les 4 valeurs audit_action', () => {
    for (const v of ['b2b_engagement_signed', 'b2b_quote_declared', 'b2b_quote_confirmed', 'b2b_engagement_status_changed']) {
      expect(code).toMatch(new RegExp(`ALTER TYPE audit_action ADD VALUE IF NOT EXISTS '${v}'`))
    }
  })
})
