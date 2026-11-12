import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Phase 05.23 (plan 01, tâche 1) — test statique de la migration choix / devis / commissions.
const FILE = '20261112000000_b2b_choix_devis_commissions.sql'
const sql = readFileSync(resolve(__dirname, '../../supabase/migrations', FILE), 'utf8')
// espaces et sauts de ligne normalisés : le test ne dépend pas de l'alignement du SQL
const code = sql.split('\n').filter(l => !l.trimStart().startsWith('--')).join('\n').replace(/\s+/g, ' ')

const NEW_TABLES = [
  'b2b_quote_submissions',
  'b2b_commission_movements',
  'b2b_reminders_sent',
  'b2b_admin_followups',
  'b2b_installment_validations',
]

describe('migration 05.23 — choix du partenaire, devis, commissions', () => {
  it('active la RLS sur les 5 nouvelles tables, sans aucune policy', () => {
    for (const t of NEW_TABLES) {
      expect(code).toMatch(new RegExp(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`))
    }
    expect((code.match(/ENABLE ROW LEVEL SECURITY/g) ?? []).length).toBe(5)
    expect(code).not.toMatch(/CREATE POLICY/)
  })

  it('autorise les 4 nouveaux statuts et conserve les 3 hérités', () => {
    const constraint = code.slice(code.indexOf('ADD CONSTRAINT b2b_engagements_status_check'))
    for (const s of ['signed', 'selected', 'not_awarded', 'quote_submitted', 'contested', 'quote_confirmed', 'commission_cancelled', 'quote_declared', 'deposit_paid', 'invoiced']) {
      expect(constraint.slice(0, 600)).toContain(`'${s}'`)
    }
  })

  it('un seul artisan retenu par lot (index unique partiel)', () => {
    expect(code).toMatch(/uq_b2b_engagements_selected_lot ON b2b_engagements \(lot_id\) WHERE type = 'lot_amendment' AND selected_at IS NOT NULL/)
  })

  it('journaux en ajout seul : trigger commun et ERRCODE 42501', () => {
    expect(code).toMatch(/Journal en ajout seul/)
    for (const t of ['b2b_commission_movements', 'b2b_admin_followups', 'b2b_installment_validations']) {
      expect(code).toMatch(new RegExp(`trg_${t}_guard BEFORE UPDATE OR DELETE ON ${t}`))
    }
    expect(code).toMatch(/ERRCODE = '42501'/)
  })

  it('opérateur obligatoire (2 à 60 caractères) sur les journaux admin (D-29)', () => {
    expect((code.match(/operator\s+TEXT NOT NULL CHECK \(char_length\(operator\) BETWEEN 2 AND 60\)/g) ?? []).length).toBe(2)
  })

  it('dépôt de devis : dates prévues par versement, 2 à 3, première = acompte', () => {
    expect(code).toMatch(/planned_due_dates DATE\[\] NOT NULL CHECK \(cardinality\(planned_due_dates\) BETWEEN 2 AND 3/)
    expect(code).toMatch(/deposit_due_on = planned_due_dates\[1\]/)
    expect(code).toMatch(/uq_b2b_installment_validations UNIQUE \(engagement_id, seq\)/)
    expect(code).toMatch(/uq_b2b_quote_submissions_open ON b2b_quote_submissions \(engagement_id\) WHERE status IN \('pending', ?'contested'\)/)
  })

  it('suivi des appels : parties et résultats bornés, note ≤ 1000 caractères', () => {
    expect(code).toMatch(/party IN \('demandeur', ?'partenaire', ?'artisan'\)/)
    expect(code).toMatch(/outcome IN \('joint', ?'injoignable', ?'rappel_prevu', ?'debloque'\)/)
    expect(code).toMatch(/char_length\(note\) <= 1000/)
  })

  it('garde SQL : montants qui ne font que croître, statuts terminaux, sélection immuable', () => {
    expect(code).toMatch(/Montant confirmé : ne peut que croître/)
    expect(code).toMatch(/Commission : ne peut que croître/)
    expect(code).toMatch(/Statut terminal/)
    expect(code).toMatch(/Sélection immuable/)
    expect(code).toMatch(/Part partenaire figée/)
    expect(code).toMatch(/Annulation immuable/)
    expect(code).toMatch(/Transition de statut interdite/)
    // le trigger existant pointe déjà sur la fonction : on ne le recrée pas
    expect(code).not.toMatch(/CREATE TRIGGER trg_b2b_engagements_guard/)
  })

  it('montants en BIGINT, jamais en flottant', () => {
    expect(code).not.toMatch(/FLOAT|REAL|DOUBLE/i)
    for (const c of ['amount_ht_cents', 'amount_cents', 'partner_share_kept_cents']) {
      expect(code).toMatch(new RegExp(`${c}\\s+BIGINT`))
    }
  })

  it('lot clôturé par choix : nouvelle valeur closed_reason « awarded »', () => {
    expect(code).toMatch(/closed_reason IN \('cap', ?'expired', ?'manual', ?'awarded'\)/)
  })

  it('« pour le compte de » : self ou third_party', () => {
    expect(code).toMatch(/on_behalf_of IN \('self', ?'third_party'\)/)
  })

  it('ajoute les 7 valeurs audit_action', () => {
    for (const v of ['b2b_partner_selected', 'b2b_quote_submitted', 'b2b_quote_contested', 'b2b_commission_movement', 'b2b_commission_cancelled', 'b2b_admin_followup', 'b2b_installment_validated']) {
      expect(code).toMatch(new RegExp(`ALTER TYPE audit_action ADD VALUE IF NOT EXISTS '${v}'`))
    }
  })

  it('révoque TRUNCATE sur les 5 tables', () => {
    expect(code).toMatch(new RegExp(`REVOKE TRUNCATE ON ${NEW_TABLES.join(', ')} FROM anon, authenticated`))
  })

  it('référence le chemin R2 des devis par regex (impossible de pointer ailleurs)', () => {
    expect(code).toContain("file_key ~ '^b2b-quotes/")
  })

  it('ne touche pas à la migration 05.21 d\'origine', () => {
    const original = readFileSync(resolve(__dirname, '../../supabase/migrations/20261030000000_b2b_engagements.sql'), 'utf8')
    expect(original).toContain('quote_declared')
  })
})
