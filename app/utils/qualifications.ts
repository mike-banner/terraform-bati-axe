// Catalogue unique des qualifications / certifications demandables sur un chantier B2B.
// Partagé par le formulaire partenaire, la console admin (cases à cocher), la validation
// Zod serveur et l'affichage côté artisan : une seule source, pas de libellé dupliqué.
// `help` = glossaire affiché au partenaire qui ne connaît pas ces sigles.

export const QUALIFICATION_OPTIONS = [
  { value: 'rge', label: 'RGE', help: 'Reconnu Garant de l\'Environnement. Indispensable pour que le client puisse toucher MaPrimeRénov\' et les aides sur des travaux de rénovation énergétique (isolation, chauffage, fenêtres…).' },
  { value: 'qualibat', label: 'Qualibat', help: 'Certification générale des entreprises du bâtiment : savoir-faire, références et assurances vérifiés. Souvent demandée sur les gros chantiers.' },
  { value: 'qualipac', label: 'QualiPAC', help: 'Installation de pompes à chaleur (aérothermie, géothermie). Qualification RGE spécialisée.' },
  { value: 'qualibois', label: 'Qualibois', help: 'Installation de chauffage au bois (poêle, chaudière à bûches ou granulés). Qualification RGE spécialisée.' },
  { value: 'qualisol', label: 'Qualisol', help: 'Installation de chauffe-eau solaires et de systèmes solaires thermiques. Qualification RGE spécialisée.' },
  { value: 'qualipv', label: 'QualiPV', help: 'Installation de panneaux photovoltaïques. Qualification RGE spécialisée.' },
  { value: 'qualifelec', label: 'Qualifelec', help: 'Installations électriques (courants forts et faibles). À demander pour une mise aux normes ou un tableau électrique de copropriété.' },
  { value: 'qualigaz', label: 'Qualigaz', help: 'Installations intérieures de gaz : vérifie que l\'entreprise sait installer et contrôler en sécurité.' },
  { value: 'pgn_pgp', label: 'PG (PGN / PGP)', help: 'Professionnel du Gaz naturel (PGN) ou propane (PGP) : habilitation à intervenir sur les appareils et conduites de gaz.' },
  { value: 'handibat', label: 'Handibat', help: 'Accessibilité des bâtiments aux personnes à mobilité réduite (rampes, ascenseurs, sanitaires adaptés).' },
  { value: 'certibat', label: 'Certibat', help: 'Certification d\'entreprise du bâtiment délivrée par un organisme tiers, équivalente à Qualibat pour de nombreux marchés.' },
] as const

export type QualificationValue = typeof QUALIFICATION_OPTIONS[number]['value']

export const QUALIFICATION_VALUES = QUALIFICATION_OPTIONS.map(o => o.value) as [QualificationValue, ...QualificationValue[]]

export const QUALIFICATION_LABELS: Record<string, string> = Object.fromEntries(
  QUALIFICATION_OPTIONS.map(o => [o.value, o.label]),
)
