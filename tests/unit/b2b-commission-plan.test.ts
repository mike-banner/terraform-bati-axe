import { describe, it, expect } from 'vitest'
import {
  bpsOf, computeQuoteBase, computeCommissionSchedule, computeCommissionPlan, deriveCommissionState,
  toCsv, centsToCsv, readB2bFlowConfig,
} from '../../server/utils/b2bCommissionPlan'
import { computeCommission } from '../../server/utils/commission'
import { installmentLabels, installmentCount, PARTNER_SHARE_BPS } from '../../app/utils/b2bCommissionRules'

// Phase 05.23 (plan 01, tâche 2) — calculs purs : part partenaire, échéancier (D-06 bis),
// état dérivé du journal, rétro-commission en fin de chantier (D-26), CSV.

describe('computeCommission est inchangé', () => {
  it('250 000 € HT → 19 000 €', () => expect(computeCommission(25_000_000)).toBe(1_900_000))
})

describe('échéancier de la commission (D-06 bis)', () => {
  it('100 000 € : 2 versements 50/50, libellés neutres', () => {
    const s = computeCommissionSchedule(10_000_000, 800_000)
    expect(s.map(i => i.amount_cents)).toEqual([400_000, 400_000])
    expect(s.map(i => i.label)).toEqual(['Acompte', 'Fin du chantier'])
  })
  it('200 000 € exact : seuil inclus → 2 versements', () => {
    expect(computeCommissionSchedule(20_000_000, 1_600_000).map(i => i.amount_cents)).toEqual([800_000, 800_000])
    expect(installmentCount(20_000_000)).toBe(2)
  })
  it('250 000 € : 3 versements 30/40/30 DE LA COMMISSION', () => {
    const s = computeCommissionSchedule(25_000_000, 1_900_000)
    expect(s.map(i => i.amount_cents)).toEqual([570_000, 760_000, 570_000])
    expect(s.map(i => i.label)).toEqual(['Acompte', 'Avancement des travaux', 'Étape suivante'])
  })
  it('variante admin : « Facture suivante » uniquement côté admin', () => {
    expect(installmentLabels(25_000_000, 'admin')).toEqual(['Acompte', 'Avancement des travaux', 'Facture suivante'])
    expect(computeCommissionSchedule(25_000_000, 1_900_000, 'admin')[2]!.label).toBe('Facture suivante')
  })
  it('D-27 : aucun libellé public ne contient « factur »', () => {
    for (const base of [10_000_000, 20_000_000, 25_000_000, 100_000_000]) {
      expect(installmentLabels(base).join(' ')).not.toMatch(/factur/i)
    }
  })
  it('1 000 000 € : 3 versements', () => {
    expect(computeCommissionSchedule(100_000_000, 6_400_000).map(i => i.amount_cents)).toEqual([1_920_000, 2_560_000, 1_920_000])
  })
  it('arrondis : le dernier versement absorbe le reste, somme exacte', () => {
    expect(computeCommissionSchedule(3_333, 267).map(i => i.amount_cents)).toEqual([134, 133])
    const s = computeCommissionSchedule(25_000_000, 1_900_001)
    expect(s.map(i => i.amount_cents)).toEqual([570_000, 760_000, 570_001])
    expect(s.reduce((a, i) => a + i.amount_cents, 0)).toBe(1_900_001)
  })
  it('commission 0 → versements à 0', () => {
    expect(computeCommissionSchedule(0, 0).map(i => i.amount_cents)).toEqual([0, 0])
  })
})

describe('plan de commission', () => {
  it('100 000 € : commission 8 000 €, partenaire 3 000 €, net 5 000 €', () => {
    const p = computeCommissionPlan(10_000_000)
    expect(p).toMatchObject({ base_cents: 10_000_000, commission_cents: 800_000, partner_share_cents: 300_000, platform_net_cents: 500_000 })
    expect(p.schedule).toHaveLength(2)
  })
  it('250 000 € : partenaire 3 % du total (7 500 €), net 11 500 €', () => {
    expect(computeCommissionPlan(25_000_000)).toMatchObject({ partner_share_cents: 750_000, platform_net_cents: 1_150_000 })
  })
  it('arrondi de la part partenaire', () => expect(computeCommissionPlan(3_333).partner_share_cents).toBe(100))
  it('base 0 → tout à 0', () => {
    expect(computeCommissionPlan(0)).toMatchObject({ commission_cents: 0, partner_share_cents: 0, platform_net_cents: 0 })
  })
  it('la part partenaire vient de la constante (3 %)', () => expect(PARTNER_SHARE_BPS).toBe(300))
  it('bpsOf arrondit au centime', () => expect(bpsOf(267, 5000)).toBe(134))
})

describe('computeQuoteBase', () => {
  it('somme des devis confirmés', () => expect(computeQuoteBase([10_000_000, 2_000_000], null)).toBe(12_000_000))
  it('plafond configurable (D-17)', () => expect(computeQuoteBase([10_000_000, 2_000_000], 11_000_000)).toBe(11_000_000))
  it('aucun devis → 0', () => expect(computeQuoteBase([], null)).toBe(0))
})

describe('état dérivé du journal', () => {
  const plan = computeCommissionPlan(10_000_000)
  const dates = ['2026-12-01', '2027-03-01']
  const base = { engagement_status: 'quote_confirmed', has_open_contest: false, plan, planned_due_dates: dates, partner_share_kept_cents: null as number | null }
  const v = (seq: number) => ({ seq, validated_at: `2026-12-0${seq}T10:00:00Z` })
  const m = (type: any, amount_cents: number) => ({ type, amount_cents })

  it('aucune validation → échéance à venir, rien d\'exigible', () => {
    const s = deriveCommissionState({ ...base, validations: [] }, [])
    expect(s.status).toBe('echeance_a_venir')
    expect(s.exigible_cents).toBe(0)
    expect(s.next_due).toEqual({ seq: 1, label: 'Acompte', amount_cents: 400_000, due_on: '2026-12-01', validated: false })
  })
  it('1re étape validée → à facturer', () => {
    const s = deriveCommissionState({ ...base, validations: [v(1)] }, [])
    expect(s.status).toBe('a_facturer')
    expect(s.exigible_cents).toBe(400_000)
  })
  it('facturée puis encaissée à moitié → partiellement encaissée, prochain versement', () => {
    expect(deriveCommissionState({ ...base, validations: [v(1)] }, [m('commission_facturee', 400_000)]).status).toBe('facturee')
    const s = deriveCommissionState({ ...base, validations: [v(1)] }, [m('commission_facturee', 400_000), m('encaissement', 400_000)])
    expect(s.status).toBe('partiellement_encaissee')
    expect(s.balance_cents).toBe(400_000)
    expect(s.next_due).toMatchObject({ seq: 2, amount_cents: 400_000, validated: false })
  })
  it('2e étape validée → de nouveau à facturer', () => {
    const s = deriveCommissionState({ ...base, validations: [v(1), v(2)] }, [m('commission_facturee', 400_000), m('encaissement', 400_000)])
    expect(s.status).toBe('a_facturer')
  })
  it('tout facturé et encaissé → encaissée, plus rien à venir', () => {
    const s = deriveCommissionState({ ...base, validations: [v(1), v(2)] }, [m('commission_facturee', 800_000), m('encaissement', 800_000)])
    expect(s.status).toBe('encaissee')
    expect(s.next_due).toBeNull()
    expect(s.balance_cents).toBe(0)
  })

  describe('rétro-commission versée en fin de chantier (D-26, pas de prorata)', () => {
    const allValidated = [v(1), v(2)]
    it('moitié encaissée → rien à verser', () => {
      const s = deriveCommissionState({ ...base, validations: allValidated }, [m('encaissement', 400_000)])
      expect(s.partner_due_now_cents).toBe(0)
      expect(s.partner_status).toBe('en_attente')
    })
    it('tout encaissé mais dernière étape non validée → rien à verser', () => {
      const s = deriveCommissionState({ ...base, validations: [v(1)] }, [m('encaissement', 800_000)])
      expect(s.partner_due_now_cents).toBe(0)
      expect(s.partner_status).toBe('en_attente')
    })
    it('dernière étape validée mais 799 999 encaissés → rien à verser', () => {
      const s = deriveCommissionState({ ...base, validations: allValidated }, [m('encaissement', 799_999)])
      expect(s.partner_due_now_cents).toBe(0)
      expect(s.partner_status).toBe('en_attente')
    })
    it('dernière étape validée ET commission intégralement encaissée → à verser', () => {
      const s = deriveCommissionState({ ...base, validations: allValidated }, [m('encaissement', 800_000)])
      expect(s.partner_due_now_cents).toBe(300_000)
      expect(s.partner_status).toBe('a_verser')
    })
    it('versée', () => {
      const s = deriveCommissionState({ ...base, validations: allValidated }, [m('encaissement', 800_000), m('retro_commission_versee', 300_000)])
      expect(s.partner_status).toBe('versee')
    })
    it('versement alors que rien n\'est dû → à récupérer', () => {
      const s = deriveCommissionState({ ...base, validations: [] }, [m('retro_commission_versee', 300_000)])
      expect(s.partner_status).toBe('a_recuperer')
      expect(s.partner_to_recover_cents).toBe(300_000)
    })
  })

  it('avenant 200 000 → 250 000 € (2 → 3 versements) : échéancier recalculé, reste à facturer cohérent', () => {
    const plan3 = computeCommissionPlan(25_000_000)
    const s = deriveCommissionState(
      { ...base, plan: plan3, planned_due_dates: ['2026-12-01', '2027-02-01', '2027-04-01'], validations: [v(1), v(2)] },
      [m('commission_facturee', 1_600_000)],
    )
    expect(s.invoiced_cents).toBe(1_600_000)
    expect(s.next_due).toMatchObject({ seq: 3, amount_cents: 300_000 })
    expect(s.status).not.toBe('a_facturer')
    expect(s.exigible_cents).toBe(1_330_000)
  })

  it('devis contesté → contestée, pas de prochaine échéance', () => {
    const s = deriveCommissionState({ ...base, engagement_status: 'contested', validations: [v(1)] }, [])
    expect(s.status).toBe('contestee')
    expect(s.next_due).toBeNull()
    expect(deriveCommissionState({ ...base, has_open_contest: true, validations: [] }, []).status).toBe('contestee')
  })

  it('commission annulée → annulée, solde 0, remboursement à traiter', () => {
    const s = deriveCommissionState(
      { ...base, engagement_status: 'commission_cancelled', validations: [v(1)], partner_share_kept_cents: 0 },
      [m('encaissement', 400_000), m('annulation', 400_000), m('remboursement', 150_000)],
    )
    expect(s.status).toBe('annulee')
    expect(s.balance_cents).toBe(0)
    expect(s.refund_due_cents).toBe(250_000)
    expect(s.next_due).toBeNull()
  })

  it('annulée (part conservée 0) alors que 300 000 déjà versés → à récupérer', () => {
    const s = deriveCommissionState(
      { ...base, engagement_status: 'commission_cancelled', validations: [], partner_share_kept_cents: 0 },
      [m('retro_commission_versee', 300_000)],
    )
    expect(s.partner_status).toBe('a_recuperer')
    expect(s.partner_to_recover_cents).toBe(300_000)
  })
})

describe('export CSV', () => {
  it('BOM, séparateur point-virgule, guillemets et protection des formules', () => {
    const csv = toCsv([['a;b', '=SUM(1)']])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toBe('﻿"a;b";\'=SUM(1)')
  })
  it('préfixe aussi + - @ et tabulation ; null → vide ; lignes séparées par CRLF', () => {
    const csv = toCsv([['+1', '-2', '@x', '\tz'], ['ok', null, 3]])
    expect(csv).toBe("﻿'+1;'-2;'@x;'\tz\r\nok;;3")
  })
  it('double les guillemets et entoure les retours à la ligne', () => {
    expect(toCsv([['dit "oui"', 'a\nb']])).toBe('﻿"dit ""oui""";"a\nb"')
  })
  it('centsToCsv', () => {
    expect(centsToCsv(123_456)).toBe('1234,56')
    expect(centsToCsv(5)).toBe('0,05')
    expect(centsToCsv(0)).toBe('0,00')
    expect(centsToCsv(-250)).toBe('-2,50')
  })
})

describe('readB2bFlowConfig', () => {
  it('valeurs par défaut', () => {
    expect(readB2bFlowConfig({})).toEqual({ choiceExpiryDays: 30, quoteStaleDays: 60, confirmReminderDays: 7, quoteBaseCapCents: null })
  })
  it('valeurs valides lues, hors bornes ou non entières → défaut', () => {
    expect(readB2bFlowConfig({ b2bChoiceExpiryDays: 45, b2bQuoteStaleDays: '90' }).choiceExpiryDays).toBe(45)
    expect(readB2bFlowConfig({ b2bQuoteStaleDays: '90' }).quoteStaleDays).toBe(90)
    expect(readB2bFlowConfig({ b2bChoiceExpiryDays: 0 }).choiceExpiryDays).toBe(30)
    expect(readB2bFlowConfig({ b2bChoiceExpiryDays: 366 }).choiceExpiryDays).toBe(30)
    expect(readB2bFlowConfig({ b2bChoiceExpiryDays: 2.5 }).choiceExpiryDays).toBe(30)
    expect(readB2bFlowConfig({ b2bConfirmReminderDays: 'abc' }).confirmReminderDays).toBe(7)
  })
  it('plafond d\'assiette : vide → null, entier positif lu', () => {
    expect(readB2bFlowConfig({ b2bQuoteBaseCapCents: '' }).quoteBaseCapCents).toBeNull()
    expect(readB2bFlowConfig({ b2bQuoteBaseCapCents: '5000000' }).quoteBaseCapCents).toBe(5_000_000)
    expect(readB2bFlowConfig({ b2bQuoteBaseCapCents: '-5' }).quoteBaseCapCents).toBeNull()
  })
})
