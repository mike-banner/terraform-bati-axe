// Règles de saisie des coordonnées (formulaire partenaires B2B) — une seule source,
// utilisée par le serveur (Zod) ET par le formulaire (attributs HTML + garde de l'étape).

// Téléphone français : 0X…, +33X… ou 0033X… ; espaces, points ou tirets tolérés (y compris après l'indicatif).
export const PHONE_FR_REGEX = /^(?:(?:\+|00)33[\s.-]*|0)[1-9](?:[\s.-]*\d{2}){4}$/
// Équivalents pour l'attribut HTML pattern (le navigateur l'ancre lui-même et compile en mode « v » :
// ( ) / - doivent y être échappés dans une classe).
export const PHONE_FR_PATTERN = '(?:(?:\\+|00)33[\\s.\\-]*|0)[1-9](?:[\\s.\\-]*\\d{2}){4}'
// Chiffres, +, espace, point, tiret : tout le reste est retiré à la frappe.
export const sanitizePhoneInput = (v: string): string => v.replace(/[^\d+\s.-]/g, '').slice(0, 20)

// Nom de personne : lettres (accents inclus), espace, apostrophe, point, tiret ; aucun chiffre ni symbole.
export const PERSON_NAME_REGEX = /^\p{L}[\p{L}\p{M}'’. -]{1,99}$/u
export const PERSON_NAME_PATTERN = "[\\p{L}][\\p{L}\\p{M}'’. \\-]{1,99}"

// Raison sociale : lettres, chiffres, & ' . , ( ) / - et espace.
export const COMPANY_NAME_REGEX = /^[\p{L}\p{N}][\p{L}\p{N}\p{M}&'’.,()/ -]{0,199}$/u
export const COMPANY_NAME_PATTERN = "[\\p{L}\\p{N}][\\p{L}\\p{N}\\p{M}&'’.,\\(\\)\\/ \\-]{0,199}"

// Numéro de certification diagnostiqueur.
export const CERTIFICATION_REGEX = /^[A-Za-z0-9][A-Za-z0-9 /_-]{0,49}$/
export const CERTIFICATION_PATTERN = '[A-Za-z0-9][A-Za-z0-9 \\/_\\-]{0,49}'

type Persona = 'architecte' | 'bet' | 'agence_immo' | 'syndic' | 'diagnostiqueur' | 'autre'

// Libellés adaptés à l'interlocuteur réel de chaque type de partenaire.
export const CONTACT_LABELS: Record<Persona, { name: string; placeholder: string; company: string; companyPlaceholder: string }> = {
  syndic: { name: 'Nom du contact (gestionnaire de la copropriété)', placeholder: 'Marie Martin', company: 'Nom du cabinet de syndic', companyPlaceholder: 'Cabinet Martin Syndic' },
  agence_immo: { name: 'Nom du contact (négociateur ou responsable d\'agence)', placeholder: 'Paul Bernard', company: 'Nom de l\'agence', companyPlaceholder: 'Agence Bernard Immobilier' },
  architecte: { name: 'Nom et prénom de l\'architecte ou du maître d\'œuvre', placeholder: 'Jean Dupont', company: 'Nom du cabinet', companyPlaceholder: 'Cabinet Dupont Architecture' },
  bet: { name: 'Nom et prénom de l\'ingénieur référent', placeholder: 'Claire Lefèvre', company: 'Nom du bureau d\'études', companyPlaceholder: 'BET Lefèvre Structures' },
  diagnostiqueur: { name: 'Nom et prénom du diagnostiqueur', placeholder: 'Karim Benali', company: 'Nom du cabinet de diagnostic', companyPlaceholder: 'Diagnostics Benali' },
  autre: { name: 'Nom et prénom du contact', placeholder: 'Jean Dupont', company: 'Nom de la structure', companyPlaceholder: 'Votre structure' },
}
