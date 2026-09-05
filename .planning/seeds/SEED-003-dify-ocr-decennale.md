---
id: SEED-003
status: dormant
planted: 2026-09-05
planted_during: v2.0 « Partenaires en scène » — Phase 7 (Formulaire AO & Modèle Multi-Lots)
trigger_when: quand la fonctionnalité OCR/IA de validation décennale (backlog 05.15) est reprise, ou plus largement si un besoin de pipeline RAG/agent IA apparaît côté produit
scope: medium
---

# SEED-003: Évaluer Dify comme backend pour une fonctionnalité IA produit

## Why This Matters

`langgenius/dify` (GitHub) est une plateforme open-source pour construire/héberger des apps LLM (orchestration de prompts, pipelines RAG, agents) via une interface visuelle plutôt que du code pur. Écarté comme outil de productivité personnelle quotidienne (Claude Code couvre déjà ce besoin), mais identifié comme piste concrète pour une fonctionnalité IA *dans* BÂTI-AXE elle-même.

Le cas d'usage le plus évident du backlog : **OCR/IA décennale** (05.15, actuellement différé post-lancement) — vérification automatique de l'attestation décennale uploadée par un artisan. C'est un pipeline document-in → extraction/validation-out, exactement le type de cas que Dify simplifie (self-host ou cloud, connexion à ses propres clés LLM).

## When to Surface

**Trigger:** quand la fonctionnalité OCR/IA décennale (backlog 05.15) est reprise, ou plus largement dès qu'un besoin de pipeline RAG/agent IA apparaît côté produit (ex. assistant particulier, analyse de devis).

Ce seed doit être présenté pendant `/gsd-new-milestone` quand le scope du milestone correspond à l'une de ces conditions :
- Reprise du chantier OCR/validation décennale automatisée
- Ajout de toute fonctionnalité produit nécessitant un pipeline LLM/RAG (pas juste un appel API direct)

## Scope Estimate

**Medium** — évaluation (self-host vs cloud, coût, maintenance) puis intégration si retenu. Pas un simple ajout de dépendance : implique une décision d'infra (héberger un service tiers Docker sur Cloudflare/VPS n'est pas trivial vu la stack actuelle 100% Cloudflare Workers/Pages).

## Breadcrumbs

- `.planning/STATE.md` — item **05.15** : "OCR/IA décennale reste dans le backlog Deferred (post-lancement)"
- Stack actuelle : Cloudflare Pages/Workers (ADR probable sur l'hébergement) — à vérifier si Dify (généralement déployé en Docker/VPS) est compatible avant de s'engager

## Notes

Discuté en session le 2026-09-05, question initiale de l'utilisateur portait sur un usage personnel quotidien (écarté) ; reformulé vers un usage produit potentiel pour BÂTI-AXE.
