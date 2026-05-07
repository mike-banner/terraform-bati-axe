# 🗺️ FEUILLE DE ROUTE DÉTAILLÉE — BÂTI-AXE (PLAN BÉTON)

> **Mode d'emploi** : Chaque tâche atomique doit être cochée lors de sa fusion sur la branche `main`. Toute phase terminée bascule dans `docs/memory/history/`.

---

## Phase 1 : Infrastructure & Cœur de Données (Semaine 1)
*Objectif : Moteur de base de données opérationnel, RLS configuré, et injection des 7 000 contacts.*

### 1.1 Configuration Supabase & Base de Données
- [ ] Création du projet Supabase (Region: EU-West/Paris si possible, sinon Frankfurt).
- [ ] Création du schéma `profiles` : `id`, `role`, `company_name`, `phone`, `city`, `zip_code`, `is_claimed`.
- [ ] Création du schéma `projects` : `id`, `category`, `budget_range`, `zip_code`, `status`.
- [ ] Création du schéma `leads` (table de jointure) : `project_id`, `pro_id`, `unlocked_at`.
- [ ] Création de la table `audit_logs` pour tracer les consultations de leads.

### 1.2 Sécurité & Row Level Security (RLS)
- [ ] Activation de RLS sur toutes les tables.
- [ ] Politique `profiles` : Lecture publique (pour la vitrine), modification uniquement par l'owner (si `is_claimed=true`).
- [ ] Politique `projects` : Insertion anonyme autorisée (via Service Role API), lecture par owner ou admin.
- [ ] Politique `leads` : Lecture restreinte (floutée par l'API, détaillée dans l'ADR-004).

### 1.3 Importation de la Masse Critique (Les 7 000 Pros)
- [ ] Développement du script Node.js d'import CSV/JSON.
- [ ] Nettoyage des données (formatage numéros de téléphone, standardisation CP).
- [ ] Injection en base avec `is_claimed: false` et génération des slugs SEO (ex: `plombier-dupont-78955`).

### 1.4 Setup Cloudflare R2
- [ ] Création du bucket R2 `batiaxe-documents`.
- [ ] Configuration des politiques CORS pour l'upload depuis `app.batiaxe.fr`.
- [ ] Création des credentials API pour le backend Next.js.

---

## Phase 2 : Vitrine Astro & Capture Leads (Semaine 2)
*Objectif : Vitesse foudroyante, SEO local agressif, et tunnel de simulation sans friction.*

### 2.1 Architecture Front-End Astro
- [ ] Setup du projet Astro + Tailwind CSS.
- [ ] Configuration des routes dynamiques `/[metier]/[ville]` (Génération statique SSG pour le 78).
- [ ] Intégration du composant Annuaire affichant les pros importés avec le badge "À revendiquer".
- [ ] Optimisation Core Web Vitals (Score cible > 95).

### 2.2 Le Simulateur (Tunnel 6 Étapes)
- [ ] Développement du composant React/Preact intégré dans Astro pour le state management (Formulaire 6 étapes).
- [ ] Validation client stricte avec Zod.
- [ ] Étapes : 1. Métier -> 2. Description -> 3. CP/Ville -> 4. Budget -> 5. Délai -> 6. Contact.

### 2.3 Edge Ingestion
- [ ] Création d'un Cloudflare Worker (ou API Route Astro) agissant comme proxy.
- [ ] Réception du payload du simulateur -> Validation Serveur Zod -> Insertion sécurisée dans Supabase via Service Role Key.

---

## Phase 3 : Dashboard Pro & Le Verrou (Semaine 3)
*Objectif : Interface Next.js sécurisée, gestion des documents, et application du "Verrou" (Monétisation).*

### 3.1 Setup Application Next.js (`app.batiaxe.fr`)
- [ ] Initialisation Next.js 15 (App Router) + Supabase SSR Auth.
- [ ] Middleware Next.js pour protéger les routes `/dashboard` et forcer le login.
- [ ] Parcours de "Revendication" (Claim) d'un profil importé : Signup -> Link Profile -> Upload Documents.

### 3.2 Le Verrou (Application de l'ADR-004)
- [ ] Développement du Server Component listant les leads locaux.
- [ ] Logique de masque : Si `pro.subscription != 'active'` ET `lead.created_at > NOW() - 24h`, remplacer `{phone: "06 12...", email: "a***@gmail.com"}`.
- [ ] Job `pg_cron` dans Supabase pour mettre à jour les statuts de leads après 24h.

### 3.3 Intégration Stripe Billing
- [ ] Création des produits/prix dans Stripe (Abonnement PRO Mensuel).
- [ ] Intégration du Checkout Stripe via API Route Next.js.
- [ ] Webhook Stripe sécurisé pour mettre à jour `stripe_subscription_status` dans la table `profiles`.

### 3.4 Vérification des Décennales
- [ ] Formulaire d'upload des PDF vers Cloudflare R2 via Presigned URLs.
- [ ] Interface Admin basique pour visualiser le PDF sur R2 et valider le profil (passage de `is_verified` à `true`).

---

## Phase 4 : Automation & Messaging (Semaine 4)
*Objectif : La boucle de rétention via le SMS Teasing.*

### 4.1 Logique de Matching Géographique
- [ ] Création de la fonction Supabase (RPC) ou logique backend pour identifier les pros pertinents (Même métier, CP correspondant ou rayon de X km via PostGIS).

### 4.2 Pipeline d'Alertes (Twilio & Resend)
- [ ] Création d'une Supabase Edge Function ou Webhook déclenché à l'insertion d'un nouveau projet.
- [ ] Intégration Twilio : Formatage du SMS ("Projet 50k€ dispo à Lyon...").
- [ ] Logique d'envoi différencié : 
    - Instantané pour les pros `PREMIUM`.
    - Délai de 30 minutes pour les pros `BASIC` (Incentive à l'achat).
- [ ] Intégration Resend pour les emails récapitulatifs.

### 4.3 Tests Finaux & Déploiement Local
- [ ] Audit complet (Parcours client complet -> SMS reçu -> Connexion Pro -> Paiement -> Affichage contact).
- [ ] Déploiement en production ciblé sur Carrières-sous-Poissy (78).
