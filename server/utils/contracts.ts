// Gabarits de contrat B2B versionnés (Phase 05.21) — purs, sans import Nuxt.
//
// D-04 bis (arbitré par Mike le 2026-10-30) : aucune lib PDF n'est installée et
// le runtime Cloudflare Workers rend une génération PDF coûteuse. On fige donc
// le HTML rendu + son SHA-256 ; le document est imprimable en PDF par le
// navigateur. Le hash prouve l'intégrité du texte signé.
import { COMMISSION_RATE_LOW_PCT, COMMISSION_RATE_HIGH_PCT } from './commission'
import { COMMISSION_THRESHOLD_LABEL } from '../../app/utils/commissionTiers'
import { CATEGORY_LABELS } from './categoryLabels'

export type EngagementType = 'framework_pro' | 'framework_partner' | 'lot_amendment'

// Changer une version = obliger à re-signer (les index uniques sont par version).
export const CONTRACT_VERSIONS: Record<EngagementType, string> = {
  framework_pro: 'CC-PRO-2026-10-v1',
  framework_partner: 'CC-PART-2026-10-v1',
  lot_amendment: 'AV-LOT-2026-10-v1',
}

export interface FrameworkProParams { companyName: string; fullName: string; siret: string; email: string }
export interface FrameworkPartnerParams { contactName: string; contactCompany: string | null; email: string; requestRef: string }
// Volontairement AUCUN champ lié au prescripteur : identité communiquée après signature.
export interface AmendmentParams { requestRef: string; lotRef: string; lotCategory: string; proCompanyName: string; proSiret: string; proFullName: string }

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const e = escapeHtml
const BANNER = (v: string) => `<p><strong>Gabarit — à faire relire par un avocat avant mise en prod.</strong> Version ${e(v)}.</p>`
const COMMISSION = `${COMMISSION_RATE_LOW_PCT} % HT sur la part du montant HT du devis signé jusqu'à ${COMMISSION_THRESHOLD_LABEL}, ${COMMISSION_RATE_HIGH_PCT} % HT sur l'excédent`
const NON_CIRCUMVENTION = `interdiction de contracter directement ou par personne interposée, pour tout chantier issu d'une mise en relation, pendant 24 mois à compter de la signature de l'avenant`
const PENALTY = `pénalité de 5 000 € HT par chantier dissimulé, sans préjudice de la commission due, et exclusion définitive du réseau (clause pénale susceptible de modération judiciaire, art. 1231-5 du Code civil)`
const CLIENT_INFO = `information du client final de l'existence de la commission d'apport d'affaires, en rappel des obligations déontologiques des prescripteurs (Article 27 du Code de déontologie des architectes ; loi Hoguet n° 70-9 du 2 janvier 1970 pour les agents immobiliers et syndics)`
const LAW = `Les présentes sont soumises au droit français. À défaut d'accord amiable, les tribunaux du ressort du siège de BÂTI-AXE sont compétents.`

function frameworkPro(p: FrameworkProParams): string {
  return `<article>
<h1>Convention cadre — Entreprise</h1>
${BANNER(CONTRACT_VERSIONS.framework_pro)}
<p>Entre BÂTI-AXE, intermédiaire et tiers de confiance technique, et l'Entreprise ${e(p.companyName)}, SIRET ${e(p.siret)}, représentée par ${e(p.fullName)} (${e(p.email)}).</p>
<h2>1. Objet</h2>
<p>La présente convention encadre toute mise en relation avec des dossiers apportés par des Partenaires prescripteurs via BÂTI-AXE. Chaque mise en relation fait l'objet d'un avenant signé avant communication des coordonnées.</p>
<h2>2. Commission de succès</h2>
<p>À la charge de l'Entreprise : ${COMMISSION}. Exigible à la signature du devis par le client final et au versement du premier acompte ; facturée par BÂTI-AXE.</p>
<p>Exemple : devis de 250 000 € HT = 16 000 € + 3 000 € = 19 000 € HT.</p>
<h2>3. Déclaration loyale</h2>
<p>L'Entreprise déclare sur la plateforme le montant HT du devis signé ou l'issue négative ; le Partenaire confirme.</p>
<h2>4. Non-contournement</h2>
<p>${e(NON_CIRCUMVENTION.charAt(0).toUpperCase() + NON_CIRCUMVENTION.slice(1))}.</p>
<h2>5. Pénalité</h2>
<p>${e(PENALTY.charAt(0).toUpperCase() + PENALTY.slice(1))}.</p>
<h2>6. Information du client final</h2>
<p>L'Entreprise assure l'${e(CLIENT_INFO)}.</p>
<h2>7. Preuve</h2>
<p>Signature électronique simple par code à usage unique envoyé par email ; horodatage, adresse IP, navigateur et empreinte SHA-256 du texte sont conservés comme preuve.</p>
<h2>8. Droit applicable et juridiction</h2>
<p>${LAW}</p>
</article>`
}

function frameworkPartner(p: FrameworkPartnerParams): string {
  return `<article>
<h1>Convention cadre — Partenaire prescripteur</h1>
${BANNER(CONTRACT_VERSIONS.framework_partner)}
<p>Entre BÂTI-AXE et le Partenaire ${e(p.contactName)}${p.contactCompany ? `, ${e(p.contactCompany)}` : ''} (${e(p.email)}). Dossier déclencheur réf. ${e(p.requestRef)}.</p>
<h2>1. Objet</h2>
<p>Dépôt de dossiers par le Partenaire et mise en relation avec des artisans certifiés.</p>
<h2>2. Rémunération</h2>
<p>La rémunération du Partenaire est une quote-part de la commission perçue par BÂTI-AXE (${COMMISSION}) ; les modalités sont fixées par avenant ou conditions particulières.</p>
<h2>3. Déclaration loyale</h2>
<p>Le Partenaire s'engage à confirmer loyalement le montant du devis signé.</p>
<h2>4. Non-contournement</h2>
<p>Pendant 24 mois, le Partenaire ne fait pas contracter directement l'artisan présenté hors plateforme.</p>
<h2>5. Pénalité</h2>
<p>${e(PENALTY.charAt(0).toUpperCase() + PENALTY.slice(1))}.</p>
<h2>6. Information du client final</h2>
<p>Le Partenaire assure l'${e(CLIENT_INFO)}.</p>
<h2>7. Preuve</h2>
<p>Signature électronique simple par code à usage unique envoyé par email ; horodatage, adresse IP, navigateur et empreinte SHA-256 du texte sont conservés comme preuve.</p>
<h2>8. Droit applicable et juridiction</h2>
<p>${LAW}</p>
</article>`
}

function lotAmendment(p: AmendmentParams): string {
  const lot = CATEGORY_LABELS[p.lotCategory] ?? p.lotCategory
  return `<article>
<h1>Avenant par lot — rattaché à la convention cadre Entreprise</h1>
${BANNER(CONTRACT_VERSIONS.lot_amendment)}
<p>Dossier réf. ${e(p.requestRef)}, lot réf. ${e(p.lotRef)} (${e(lot)}), apporté par le Partenaire prescripteur du dossier. L'identité et les coordonnées du Partenaire sont communiquées à l'Entreprise après signature du présent avenant.</p>
<p>Entreprise ${e(p.proCompanyName)}, SIRET ${e(p.proSiret)}, représentée par ${e(p.proFullName)}.</p>
<h2>1. Commission</h2>
<p>${COMMISSION}.</p>
<h2>2. Non-contournement</h2>
<p>${e(NON_CIRCUMVENTION.charAt(0).toUpperCase() + NON_CIRCUMVENTION.slice(1))}.</p>
<h2>3. Pénalité</h2>
<p>${e(PENALTY.charAt(0).toUpperCase() + PENALTY.slice(1))}.</p>
<h2>4. Information du client final</h2>
<p>L'Entreprise assure l'${e(CLIENT_INFO)}.</p>
<h2>5. Déclaration</h2>
<p>L'Entreprise s'engage à déclarer sur la plateforme le montant HT du devis signé ou l'issue négative.</p>
<h2>6. Ensemble contractuel</h2>
<p>Le présent avenant, au titre de l'ensemble contractuel ainsi formé, forme un tout indivisible avec la convention cadre de l'Entreprise et la convention cadre signée par le Partenaire prescripteur du dossier réf. ${e(p.requestRef)}.</p>
<h2>7. Stipulation pour autrui (art. 1205 C. civ.)</h2>
<p>Par stipulation pour autrui, l'engagement de non-contournement est souscrit envers BÂTI-AXE et, à son profit, envers le Partenaire prescripteur, qui peut s'en prévaloir directement sans être signataire du présent avenant.</p>
<h2>8. Droit applicable</h2>
<p>${LAW}</p>
</article>`
}

export function renderContract(type: 'framework_pro', p: FrameworkProParams): string
export function renderContract(type: 'framework_partner', p: FrameworkPartnerParams): string
export function renderContract(type: 'lot_amendment', p: AmendmentParams): string
export function renderContract(type: EngagementType, p: any): string {
  if (type === 'framework_pro') return frameworkPro(p)
  if (type === 'framework_partner') return frameworkPartner(p)
  return lotAmendment(p)
}

export function renderContractDocument(d: {
  type: EngagementType; template_version: string; content_html: string; content_sha256: string
  signed_at: string; signed_ip: string | null; signer_email: string
}): string {
  const signedAt = new Date(d.signed_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>${e(d.type)} ${e(d.template_version)}</title><style>body{font-family:system-ui;max-width:760px;margin:2rem auto;padding:0 1rem;color:#0F172A}@media print{.no-print{display:none}}</style></head><body>
<section><h2>Preuve de signature</h2>
<ul>
<li>Type : ${e(d.type)}</li>
<li>Version : ${e(d.template_version)}</li>
<li>Signataire : ${e(d.signer_email)}</li>
<li>Signé le : ${e(signedAt)}</li>
<li>IP : ${e(d.signed_ip ?? 'inconnue')}</li>
<li>Empreinte SHA-256 : ${e(d.content_sha256)}</li>
</ul></section>
<button class="no-print" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
${d.content_html}
</body></html>`
}
