<script setup lang="ts">
import { CATEGORY_LABELS } from '~~/server/utils/categoryLabels'

// « Mes projets » : appels d'offres où le pro s'est positionné, classés selon la réponse du partenaire.
// Présentationnel : un clic sur une ligne demande l'ouverture de la fiche, la page orchestre.
const props = defineProps<{
  pending: any[]
  won: any[]
  lost: any[]
}>()

defineEmits<{ open: [lotId: string] }>()

const groups = computed(() => [
  { key: 'pending', title: 'En attente du partenaire', rows: props.pending, always: true,
    empty: 'Aucune demande en attente.', hint: 'Votre demande est transmise : le partenaire ne l\'a pas encore validée.' },
  { key: 'won', title: 'Validés par le partenaire', rows: props.won, always: true,
    empty: 'Aucun projet validé pour l\'instant.', hint: null },
  { key: 'lost', title: 'Non retenus', rows: props.lost, always: false, empty: '', hint: null },
].filter(g => g.always || g.rows.length))

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
</script>

<template>
  <div data-testid="project-list" class="space-y-8">
    <section v-for="group in groups" :key="group.key" :data-testid="`projects-${group.key}`">
      <h2 class="text-base font-semibold text-foreground mb-1">
        {{ group.title }} <span class="text-muted-foreground font-normal tabular-nums">({{ group.rows.length }})</span>
      </h2>
      <p v-if="group.hint && group.rows.length" class="text-sm text-muted-foreground mb-2 max-w-prose">{{ group.hint }}</p>

      <p v-if="!group.rows.length" class="py-4 text-sm text-muted-foreground border-t border-border">{{ group.empty }}</p>

      <ul v-else class="border-t border-border divide-y divide-border">
        <li v-for="p in group.rows" :key="p.lot_id">
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
                <template v-if="p.engagement?.signed_at"> · demande du {{ formatDate(p.engagement.signed_at) }}</template>
              </span>
            </span>
            <span v-if="p.engagement?.status === 'quote_submitted'" class="shrink-0 text-xs font-semibold text-foreground">
              Devis à confirmer
            </span>
            <svg class="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 4.5 13 10l-5.5 5.5" />
            </svg>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
