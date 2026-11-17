<script setup lang="ts">
import { CATEGORY_LABELS } from '~~/server/utils/categoryLabels'
import { NOT_AWARDED_REASON_LABELS } from '~/utils/b2bCommissionRules'

// Journal des appels d'offres perdus, avec le motif. Un clic ouvre la fiche (demandé à la page).
defineProps<{ lost: any[] }>()
defineEmits<{ open: [lotId: string] }>()

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
</script>

<template>
  <section data-testid="tenders-lost">
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
</template>
