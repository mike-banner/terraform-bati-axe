<script setup lang="ts">
import { CATEGORY_LABELS } from '~~/server/utils/categoryLabels'

// Appels d'offres remportés (liste) et non retenus (repliés, simple historique).
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
      <ul v-else class="border-t border-border divide-y divide-border">
        <li v-for="p in won" :key="p.lot_id">
          <button
            type="button"
            class="group w-full flex items-center gap-4 py-3 px-1 text-left rounded-sm hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground transition-colors"
            @click="$emit('open', p.lot_id)"
          >
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

    <details v-if="lost.length" data-testid="projects-lost" class="group/lost">
      <summary class="cursor-pointer text-sm font-semibold text-foreground py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground rounded-sm">
        Non retenus <span class="font-normal text-muted-foreground tabular-nums">({{ lost.length }})</span>
      </summary>
      <ul class="border-t border-border divide-y divide-border">
        <li v-for="p in lost" :key="p.lot_id">
          <button type="button" class="w-full py-3 px-1 text-left rounded-sm hover:bg-muted/50 transition-colors" @click="$emit('open', p.lot_id)">
            <span class="block text-sm text-foreground truncate">
              {{ (CATEGORY_LABELS as Record<string, string>)[p.category] ?? p.category }}
              <span class="text-muted-foreground tabular-nums"> · réf. {{ p.request_ref }}</span>
            </span>
            <span class="block text-xs text-muted-foreground truncate">{{ p.engagement?.status === 'commission_cancelled' ? 'Commission annulée' : 'Non retenu par le partenaire' }}</span>
          </button>
        </li>
      </ul>
    </details>
  </div>
</template>
