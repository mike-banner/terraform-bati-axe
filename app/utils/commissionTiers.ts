// D-01 (Phase 05.21) — paliers de commission et règle de saisie du montant.
// Source unique partagée client/serveur : contrats, modales, cartes et
// endpoints lisent ces constantes, jamais de 8 / 6 / 200 000 en dur ailleurs.
export const COMMISSION_THRESHOLD_CENTS = 20_000_000
export const COMMISSION_RATE_LOW_PCT = 8
export const COMMISSION_RATE_HIGH_PCT = 6
export const COMMISSION_THRESHOLD_LABEL = '200 000 € HT'
// Saisie du montant HT : ≤ 9 chiffres entiers, décimales , ou . (2 max),
// espaces (y compris insécables) autorisés et retirés par le serveur.
export const AMOUNT_INPUT_MAXLENGTH = 16 // = z.string().max(16) côté serveur
export const AMOUNT_INPUT_PATTERN = '(?:[0-9][ \\u00a0\\u202f]?){1,9}(?:[.,][0-9]{1,2})?' // attribut HTML pattern (drapeau v)
export const AMOUNT_SERVER_REGEX = /^\d{1,9}([.,]\d{1,2})?$/ // appliquée après retrait des espaces
