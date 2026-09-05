---
id: SEED-002
status: dormant
planted: 2026-09-05
planted_during: v2.0 « Partenaires en scène » — Phase 7 (Formulaire AO & Modèle Multi-Lots)
trigger_when: quand une phase de "polish front" / refonte UI est planifiée sur les pages publiques existantes (post-Phase 7), ou au lancement d'un nouveau milestone touchant la landing/homepage
scope: medium
---

# SEED-002: Définir une vraie charte UI/design tokens avec taste-skill

## Why This Matters

Le projet n'a aucun fichier de tokens de design (pas de `DESIGN.md`, pas de variables CSS de palette). Chaque page improvise ses couleurs Tailwind au cas par cas (`bg-slate-800`, `bg-safety`, `text-slate-500`...). Exemple concret : la carte "bénéfices" en `bg-slate-800` du bento hero de la homepage (`app/pages/index.vue`) a été jugée "cheap"/slop par l'utilisateur — symptôme d'une palette non formalisée plutôt qu'un accident isolé.

Le workflow frontend défini dans le CLAUDE.md global (`taste-skill`/`brandkit`, étape 1 avant tout code) n'a jamais été exécuté sur ce projet.

Piste explorée et écartée : prototyper tout le front dans Lovable. Rejeté — ADR-008 verrouille Nuxt 4 comme stack unique (Astro/Next dépréciés), un prototype React devrait être intégralement retranscrit en Vue/Nuxt, et Lovable ignore les contraintes serveur du projet (masquage ADR-004, presigned URLs R2, RLS Supabase). Le vrai fix est d'auditer/raffiner directement le code Nuxt existant avec `taste-skill`/`impeccable`, sans changer de stack.

## When to Surface

**Trigger:** quand une phase de "polish front" / refonte UI est planifiée sur les pages publiques existantes, ou à l'ouverture d'un nouveau milestone touchant la landing/homepage.

Ce seed doit être présenté pendant `/gsd-new-milestone` quand le scope du milestone correspond à l'une de ces conditions :
- Un chantier de refonte/polish visuel du front public (homepage, landing, tunnel) est prévu
- Une charte de marque / design system devient une priorité produit

## Scope Estimate

**Medium** — audit taste-skill/impeccable sur les pages existantes + écriture d'un fichier de tokens réel (palette, typo, radius, spacing) + application aux pages concernées. Pas de changement de stack, pas de migration.

## Breadcrumbs

- `app/pages/index.vue` — bento hero homepage, carte `bg-slate-800` citée comme exemple
- Aucun `DESIGN.md` ni fichier de variables CSS de tokens trouvé dans le repo (hors `dist/` généré)
- CLAUDE.md global (`~/.claude/CLAUDE.md`) — section "Workflow Frontend Zero-Repasse & Design System (taste-skill, brandkit)"
- Skills disponibles : `taste-skill`, `impeccable`

## Notes

Discuté en session le 2026-09-05, en parallèle de l'exécution de la Phase 7 (Formulaire AO multi-lots). Décision : ne pas traiter maintenant (budget crédit limité), continuer l'exécution du planning en cours, traiter cette charte dans une phase dédiée ultérieure.
