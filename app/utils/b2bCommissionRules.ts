// Phase 05.23 — règles du flux choix du partenaire / devis / commissions.
// Source unique client + serveur : aucune dépendance Nitro. Le taux de commission et le
// seuil restent dans commissionTiers.ts (importés ici, jamais dupliqués).
import { COMMISSION_THRESHOLD_CENTS } from './commissionTiers'

// D-05 : 3 % du montant HT du devis, partout (y compris au-delà du seuil).
export const PARTNER_SHARE_BPS = 300

// D-06 bis : échéancier de la COMMISSION (pas du devis).
// Jusqu'au seuil inclus : 50 % à l'acompte (= 4 % du total à 8 %) puis 50 % à la fin.
export const INSTALLMENT_SPLITS_LOW_BPS = [5000, 5000] as const
// Au-dessus du seuil : 30 % à l'acompte, 40 % à l'avancement, 30 % à l'étape suivante.
export const INSTALLMENT_SPLITS_HIGH_BPS = [3000, 4000, 3000] as const

// D-27 : libellés neutres côté partenaire et artisan (jamais « facture »).
export const INSTALLMENT_LABELS_LOW = ['Acompte', 'Fin du chantier'] as const
export const INSTALLMENT_LABELS_HIGH = ['Acompte', 'Avancement des travaux', 'Étape suivante'] as const
// Admin et export CSV uniquement.
export const INSTALLMENT_LABELS_HIGH_ADMIN = ['Acompte', 'Avancement des travaux', 'Facture suivante'] as const

export function installmentCount(baseCents: number): 2 | 3 {
  return baseCents <= COMMISSION_THRESHOLD_CENTS ? 2 : 3
}

export function installmentLabels(baseCents: number, audience: 'public' | 'admin' = 'public'): readonly string[] {
  if (installmentCount(baseCents) === 2) return INSTALLMENT_LABELS_LOW
  return audience === 'admin' ? INSTALLMENT_LABELS_HIGH_ADMIN : INSTALLMENT_LABELS_HIGH
}

// D-16 : relances du partenaire (jours après le déclencheur).
export const PARTNER_REMINDER_DAYS = [7, 14] as const
export const QUOTE_MAX_FILE_BYTES = 20 * 1024 * 1024
export const REASON_MIN = 10
export const REASON_MAX = 500

// D-14 : attestation horodatée au dépôt du devis.
export const QUOTE_ATTESTATION_TEXT = "J'atteste avoir informé mon client de la rémunération d'apport d'affaires perçue au titre de cette mise en relation."

export type EngagementStatus = 'signed' | 'selected' | 'not_awarded' | 'quote_submitted' | 'contested' | 'quote_confirmed' | 'commission_cancelled' | 'quote_declared' | 'deposit_paid' | 'invoiced'
export type SubmissionStatus = 'pending' | 'confirmed' | 'contested' | 'rejected'
export type MovementType = 'commission_facturee' | 'encaissement' | 'remboursement' | 'retro_commission_versee' | 'annulation'
export type CommissionStatus = 'echeance_a_venir' | 'a_facturer' | 'facturee' | 'partiellement_encaissee' | 'encaissee' | 'contestee' | 'annulee'
export type PartnerShareStatus = 'en_attente' | 'a_verser' | 'versee' | 'a_recuperer' | 'sans_objet'
export type CancelCase = 'never_started' | 'legal_withdrawal' | 'partner_input_error' | 'dispute_for_pro' | 'commercial_gesture'

export const ENGAGEMENT_STATUS_LABELS_PRO: Record<EngagementStatus, string> = {
  signed: 'Intérêt enregistré — en attente du choix du partenaire',
  selected: 'Retenu par le partenaire — devis à établir avec lui',
  not_awarded: 'Chantier non obtenu',
  quote_submitted: 'Devis déposé par le partenaire — à confirmer',
  contested: 'Montant contesté — arbitrage BÂTI-AXE en cours',
  quote_confirmed: 'Devis confirmé',
  commission_cancelled: 'Commission annulée par BÂTI-AXE',
  quote_declared: 'Devis déclaré (ancien suivi)',
  deposit_paid: 'Acompte versé (ancien suivi)',
  invoiced: 'Clôturé (ancien suivi)',
}

export const ENGAGEMENT_STATUS_LABELS_PARTNER: Record<EngagementStatus, string> = {
  signed: 'Intéressé — à départager',
  selected: 'Retenu',
  not_awarded: 'Non retenu',
  quote_submitted: "Devis déposé — attente de confirmation de l'artisan",
  contested: "Montant contesté par l'artisan — BÂTI-AXE arbitre",
  quote_confirmed: "Devis confirmé par l'artisan",
  commission_cancelled: 'Clôturé',
  quote_declared: 'Ancien suivi',
  deposit_paid: 'Ancien suivi',
  invoiced: 'Ancien suivi',
}

export const ENGAGEMENT_STATUS_LABELS_ADMIN: Record<EngagementStatus, string> = {
  signed: 'Avenant signé',
  selected: 'Retenu',
  not_awarded: 'Non obtenu',
  quote_submitted: 'Devis déposé',
  contested: 'Contesté',
  quote_confirmed: 'Devis confirmé',
  commission_cancelled: 'Commission annulée',
  quote_declared: 'Déclaré (ancien)',
  deposit_paid: 'Acompte versé (ancien)',
  invoiced: 'Facturé (ancien)',
}

export const NOT_AWARDED_REASON_LABELS: Record<string, string> = {
  other_selected: 'un autre artisan a été retenu',
  outside_platform: 'le partenaire a retenu une entreprise hors plateforme',
  expired: 'délai de choix expiré',
}

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: "En attente de confirmation de l'artisan",
  confirmed: 'Confirmé',
  contested: 'Contesté — arbitrage en cours',
  rejected: 'Refusé après arbitrage',
}

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  echeance_a_venir: 'Échéance à venir (attente de validation du partenaire)',
  a_facturer: 'À facturer',
  facturee: 'Facturée',
  partiellement_encaissee: 'Partiellement encaissée',
  encaissee: 'Encaissée',
  contestee: 'Contestée',
  annulee: 'Annulée',
}

export const PARTNER_SHARE_STATUS_LABELS: Record<PartnerShareStatus, string> = {
  en_attente: 'Versée en fin de chantier (après encaissement complet)',
  a_verser: 'À verser',
  versee: 'Versée',
  a_recuperer: 'À récupérer (déjà versée)',
  sans_objet: '—',
}

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  commission_facturee: 'Facture de commission émise',
  encaissement: 'Encaissement',
  remboursement: 'Remboursement',
  retro_commission_versee: 'Rétro-commission versée',
  annulation: 'Annulation',
}

// D-10 : cas d'annulation manuelle d'une commission (motif obligatoire en plus).
export const CANCEL_CASE_LABELS: Record<CancelCase, string> = {
  never_started: 'Chantier jamais démarré / devis résilié',
  legal_withdrawal: 'Rétractation légale du client final',
  partner_input_error: 'Erreur de saisie du partenaire',
  dispute_for_pro: "Litige résolu en faveur de l'artisan",
  commercial_gesture: 'Geste commercial BÂTI-AXE',
}
