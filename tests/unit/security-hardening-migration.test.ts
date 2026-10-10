import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/20260920000000_security_hardening_pro_tables.sql'), 'utf8')

describe('migration security_hardening_pro_tables', () => {
  it('remplace manage_own_consent par une politique en lecture seule', () => {
    expect(sql).toMatch(/DROP POLICY IF EXISTS manage_own_consent ON public\.consents/)
    expect(sql).toMatch(/CREATE POLICY select_own_consent ON public\.consents\s+FOR SELECT TO authenticated USING \(auth\.uid\(\) = subject_id\)/)
  })
  it('garde manage_own_completed_projects et protège is_showcased par trigger', () => {
    expect(sql).not.toMatch(/DROP POLICY[^;]*manage_own_completed_projects/)
    expect(sql).toMatch(/CREATE TRIGGER trg_guard_completed_project_showcase\s+BEFORE INSERT OR UPDATE ON public\.completed_projects/)
    expect(sql).toMatch(/is_showcased := false/)
    expect(sql).toMatch(/ERRCODE = '42501'/)
  })
  it('planifie expire-decennale-status toutes les heures, sans toucher is_verified', () => {
    expect(sql).toMatch(/cron\.schedule\('expire-decennale-status', '0 \* \* \* \*'/)
    expect(sql).toMatch(/cron\.unschedule\('expire-decennale-status'\)/)
    expect(sql).toMatch(/SET decennal_status = 'expired'/)
    expect(sql).not.toMatch(/SET is_verified/)
  })
  it('révoque l\'exécution de la fonction SECURITY DEFINER', () => {
    expect(sql).toMatch(/SECURITY DEFINER SET search_path = public/)
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.expire_decennale_status\(\) FROM PUBLIC, anon, authenticated/)
  })
})
