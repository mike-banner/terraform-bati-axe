<script setup lang="ts">
// Carte AO (appel d'offres partenaire) — variante masquée/révélée du même pattern
// visuel que les cartes leads (index.vue). Purement présentationnel : elle émet,
// la page orchestre les appels réseau (claim/report).
defineProps<{
  tender: any
  canClaim: boolean
  claiming: boolean
}>()

defineEmits<{
  claim: [lotId: string]
  report: [lotId: string]
}>()

const CATEGORY_LABELS: Record<string, string> = {
  maconnerie:   'Maçonnerie & Gros Œuvre',
  toiture:      'Charpente & Toiture',
  electricite:  'Électricité',
  plomberie:    'Plomberie & Chauffage',
  peinture:     'Peinture & Finitions',
  isolation:    'Isolation & Cloisons',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch { /* silent */ }
}
</script>

<template>
  <div class="bento-card bg-white rounded-sm border border-slate-200 shadow-sm overflow-hidden">
    <!-- En-tête commun -->
    <div class="flex items-center justify-between px-5 py-3">
      <div class="space-y-1.5">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-sm font-bold text-slate-900">{{ CATEGORY_LABELS[tender.category] ?? tender.category }}</p>
          <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border border-copper/40 bg-copper/10 text-copper uppercase tracking-wide">
            AO Partenaire
          </span>
        </div>
        <div class="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <LeadAge v-if="tender.created_at" :created-at="tender.created_at" />
          <span v-if="tender.zone_name">{{ tender.zone_name }}</span>
          <span v-if="tender.budget_range">{{ tender.budget_range }}</span>
          <span v-if="tender.request_ref">réf. {{ tender.request_ref }}</span>
        </div>
      </div>
    </div>

    <!-- Badge de décision -->
    <div class="px-5 pb-2">
      <span
        v-if="tender.decision_status === 'confirme'"
        class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-emerald-300 text-emerald-700 bg-emerald-50"
      >
        Chantier confirmé · exclusif
      </span>
      <span
        v-else
        class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-slate-300 text-slate-600 bg-slate-50"
      >
        En attente de décision · jusqu'à 3 artisans
      </span>
    </div>

    <!-- ── Variant A: Locked ── -->
    <template v-if="tender.status === 'locked'">
      <div class="px-5 py-3 space-y-2">
        <p class="text-sm text-slate-600">{{ tender.description }}</p>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Contact</span>
          <span class="text-muted-foreground font-mono blur-[3px] select-none" aria-hidden="true">{{ tender.contact_name }}</span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Entreprise</span>
          <span class="text-muted-foreground font-mono blur-[3px] select-none" aria-hidden="true">{{ tender.contact_company }}</span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Tél.</span>
          <span class="text-muted-foreground font-mono blur-[3px] select-none" aria-hidden="true">{{ tender.contact_phone }}</span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Email</span>
          <span class="text-muted-foreground font-mono blur-[3px] select-none" aria-hidden="true">{{ tender.contact_email }}</span>
        </div>
      </div>
      <div class="px-5 py-3 space-y-1.5">
        <p v-if="tender.lot_status !== 'open'" class="text-xs text-muted-foreground text-center py-2">
          Cet appel d'offres est clos.
        </p>
        <template v-else>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 w-full h-11 px-4 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!canClaim || claiming"
            @click="$emit('claim', tender.lot_id)"
          >
            {{ claiming ? 'Envoi…' : 'Je suis intéressé' }}
          </button>
          <p v-if="!canClaim" class="text-xs text-muted-foreground text-center">
            Profil vérifié + attestation décennale valide requis pour vous positionner.
          </p>
        </template>
      </div>
    </template>

    <!-- ── Variant B: Claimed ── -->
    <template v-else>
      <div class="px-5 pb-2">
        <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full border-foreground/30 text-foreground">
          ✓ Vous êtes positionné
        </span>
        <span v-if="tender.claimed_at" class="ml-2 text-xs text-muted-foreground">{{ formatDate(tender.claimed_at) }}</span>
      </div>
      <div class="px-5 py-3 space-y-2">
        <p class="text-sm text-slate-600">{{ tender.description }}</p>
        <p v-if="tender.postal_code" class="text-xs text-muted-foreground">Code postal : {{ tender.postal_code }}</p>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Contact</span>
          <span class="text-foreground font-semibold flex items-center gap-2">
            {{ tender.contact_name }}
            <button type="button" title="Copier" class="text-muted-foreground hover:text-foreground transition-colors" @click="copyToClipboard(tender.contact_name)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/>
              </svg>
            </button>
          </span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Entreprise</span>
          <span class="text-foreground font-semibold flex items-center gap-2">
            {{ tender.contact_company }}
            <button type="button" title="Copier" class="text-muted-foreground hover:text-foreground transition-colors" @click="copyToClipboard(tender.contact_company)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/>
              </svg>
            </button>
          </span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Tél.</span>
          <span class="text-foreground font-semibold flex items-center gap-2">
            <a :href="`tel:${tender.contact_phone}`" class="hover:underline">{{ tender.contact_phone }}</a>
            <button type="button" title="Copier" class="text-muted-foreground hover:text-foreground transition-colors" @click="copyToClipboard(tender.contact_phone)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
              </svg>
            </button>
          </span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Email</span>
          <span class="text-foreground font-semibold flex items-center gap-2">
            <a :href="`mailto:${tender.contact_email}`" class="hover:underline">{{ tender.contact_email }}</a>
            <button type="button" title="Copier" class="text-muted-foreground hover:text-foreground transition-colors" @click="copyToClipboard(tender.contact_email)">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/>
              </svg>
            </button>
          </span>
        </div>
      </div>
    </template>

    <!-- Pied de carte -->
    <div class="px-5 pb-4">
      <button
        type="button"
        class="text-xs text-muted-foreground underline underline-offset-2 hover:text-destructive"
        @click="$emit('report', tender.lot_id)"
      >
        Signaler cet appel d'offres
      </button>
    </div>
  </div>
</template>
