<script setup lang="ts">
import { CATEGORY_LABELS } from '~~/server/utils/categoryLabels'
import { NOT_AWARDED_REASON_LABELS } from '~/utils/b2bCommissionRules'

// Appels d'offres remportés (liste) et journal des offres perdues (toujours visible, avec le motif).
// Présentationnel : un clic sur une ligne demande l'ouverture de la fiche, la page orchestre.
defineProps<{
  won: any[]
  lost: any[]
}>()

defineEmits<{ open: [lotId: string] }>()

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
</script>

<template>
  <div data-testid="project-list" class="space-y-8">
    <section data-testid="projects-won">
      <p v-if="!won.length" class="py-4 text-sm text-muted-foreground border-t border-border max-w-prose">
        Aucun appel d'offres remporté pour l'instant. Quand un partenaire vous retient, le projet apparaît ici.
      </p>
      <ul v-else class="border-t border-b border-border divide-y divide-border">
        <li v-for="p in won" :key="p.lot_id">
          <button
            type="button"
            class="group w-full flex items-center gap-3 py-3 px-1 text-left rounded-sm hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground transition-colors"
            @click="$emit('open', p.lot_id)"
          >
            <span class="mt-0.5 size-1.5 shrink-0 rounded-full bg-foreground" aria-hidden="true" />
            <span class="flex-1 min-w-0">
              <span class="block text-sm font-semibold text-foreground truncate">
                {{ (CATEGORY_LABELS as Record<string, string>)[p.category] ?? p.category }}
                <span class="font-normal text-muted-foreground tabular-nums"> · réf. {{ p.request_ref }}</span>
              </span>
              <span class="block text-xs text-muted-foreground truncate">
                <template v-if="p.department">{{ p.department }}</template>
                <template v-if="p.zone_name"> · {{ p.zone_name }}</template>
                <template v-if="p.engagement?.signed_at"> · avenant signé le {{ formatDate(p.engagement.signed_at) }}</template>
              </span>
            </span>
            <span v-if="p.engagement?.status === 'quote_submitted'" class="shrink-0 text-xs font-semibold text-foreground">Devis à confirmer</span>
            <svg class="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 4.5 13 10l-5.5 5.5" />
            </svg>
          </button>
        </li>
      </ul>
    </section>

    <section data-testid="projects-lost">
      <h2 class="text-sm font-semibold text-foreground mb-2">
        Offres perdues <span class="font-normal text-muted-foreground tabular-nums">({{ lost.length }})</span>
      </h2>
      <p v-if="!lost.length" class="py-4 text-sm text-muted-foreground border-t border-border max-w-prose">Aucune offre perdue pour l'instant.</p>
      <ul v-else class="border-t border-b border-border divide-y divide-border">
        <li v-for="p in lost" :key="p.lot_id">
          <button type="button" class="w-full flex items-start gap-3 py-3 px-1 text-left rounded-sm hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground transition-colors" @click="$emit('open', p.lot_id)">
            <span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="block text-sm text-foreground truncate">
                {{ (CATEGORY_LABELS as Record<string, string>)[p.category] ?? p.category }}
                <span class="text-muted-foreground tabular-nums"> · réf. {{ p.request_ref }}</span>
              </span>
              <span class="block text-xs text-muted-foreground truncate first-letter:uppercase">
                {{ p.engagement?.status === 'commission_cancelled' ? 'Commission annulée' : (NOT_AWARDED_REASON_LABELS[p.engagement?.not_awarded_reason] ?? 'Non retenu par le partenaire') }}
                <template v-if="p.department"> · {{ p.department }}</template>
                <template v-if="p.engagement?.signed_at"> · avenant signé le {{ formatDate(p.engagement.signed_at) }}</template>
              </span>
            </span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
