# Spec Client : Architecture Stripe Connect & Split Payment (P10)

> 📅 **Date de réception** : 28 août 2026  
> 📌 **Rattaché à** : Item **P10 (Stripe Connect, Séquestre & Ventilation Tripartite)**  
> ⚖️ **Conformité Réglementaire** : ACPR / PSP Séquestre Marketplace (Stripe Connect Express/Custom)

---

## 🏦 1. Architecture Tripartite & Flux Financier (Split Payment)

```text
[ Client Final ] ── pays (Ex: Acompte 10 000 € HT) ──> [ Compte Séquestre Stripe Connect ]
                                                                   │
                                     ┌─────────────────────────────┼─────────────────────────────┐
                                     ▼                             ▼                             ▼
                        [ Solde Artisan BÂTI-AXE ]      [ Commission BÂTI-AXE ]       [ Rétrocession Prescripteur ]
                               (9 200 €)                        (500 €)                       (300 €)
                               8% déduits                     Marge 5% HT                     Apport 3% HT
```

### Ventilation du Paiement
- **Acompte initial** : Réglé par le client final via Stripe Hosted Payment Page (Carte / SEPA).
- **Artisan** : Reçoit sa part nette directement sur son compte Stripe Connect (`transfer_data`).
- **Prescripteur** : Reçoit sa commission d'apport d'affaires (`transfer_group` ou `Stripe Transfers API`).
- **BÂTI-AXE** : Reçoit sa marge de plateforme via l'**`application_fee_amount`**.

---

## 🗄️ 2. Structure de Données Supabase (`payment_accounts`)

```sql
CREATE TABLE IF NOT EXISTS public.payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL, -- ex: acct_1N...
  details_submitted BOOLEAN DEFAULT FALSE, -- KYC Validé par Stripe
  payouts_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 💻 3. Implementation Server Endpoint (`POST /api/v1/payments/create-deposit`)

```typescript
import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { totalAmount, artisanStripeId, prescripteurStripeId } = body

  const batiAxeFee = Math.round(totalAmount * 0.05)
  const prescripteurFee = Math.round(totalAmount * 0.03)
  const totalCommission = batiAxeFee + prescripteurFee

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount,
    currency: 'eur',
    payment_method_types: ['card', 'sepa_credit_transfer'],
    application_fee_amount: totalCommission,
    transfer_data: {
      destination: artisanStripeId,
    },
  })

  return { clientSecret: paymentIntent.client_secret }
})
```

---

## 📌 4. Positionnement dans le Plan de Vol GSD

- **Phase 1 (Pilote 78 v1.0)** : Rétrocession manuelle/facturation directe pour les premiers dossiers B2B (recommandation prioritaire).
- **Phase P10 (v2.0)** : Automatisation native Stripe Connect Express avec onboarding KYC automatisé et autofacturation (Self-Billing Factur-X / Pennylane).
