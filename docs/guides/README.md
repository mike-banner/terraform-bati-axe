# Guides d'utilisation et dossier juridique

Établis le 2026-11-18 sur la version de test du site (dev). À mettre à jour quand les parcours changent.

| Fichier | Public |
|---|---|
| `guide-particulier.pdf` | Particuliers : décrire un projet, suivre le dossier, choisir l'artisan |
| `guide-partenaire.pdf` | Partenaires prescripteurs : dépôt de dossier, convention, choix d'artisan, devis, « Mes dossiers » |
| `guide-artisan.pdf` | Artisans : compte, documents, leads, appels d'offres, abonnement |
| `points-a-valider-juriste.docx` | Dossier de relecture juridique (27 points, avec encadré de réponse). Complète `docs/legal/POINTS_A_VALIDER_AVEC_JURISTE.md` |

## Régénérer

Les sources sont dans `sources/` (Python + reportlab pour les PDF, Node + `docx` pour le fichier Word).
Les scripts attendent Windows (police Arial dans `C:/Windows/Fonts/`).

```bash
pip install reportlab pillow
python sources/guide_particuliers.py sources/captures sortie/guide-particulier.pdf
python sources/guide_partenaires.py  sources/captures sortie/guide-partenaire.pdf
python sources/guide_pros.py         sources/captures sortie/guide-artisan.pdf
npm install docx && node sources/juriste.js sortie/points-a-valider-juriste.docx
```

Les captures (`sources/captures/`) viennent des pages publiques du site de test. L'espace artisan connecté n'est décrit qu'en texte.

## Réserves

- Les parcours sont décrits d'après le code, pas d'après un test de bout en bout : relire les passages sur les commissions et les avenants avant diffusion.
- Les tarifs de l'abonnement (190 à 350 €/mois) viennent de la page Premium à la date d'édition.
- Le dossier juridique pose des questions, il ne conclut rien. Ne rien déclarer « conforme » dans le produit tant qu'un point reste ouvert.
