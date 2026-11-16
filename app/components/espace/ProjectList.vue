<script setup lang="ts">
import { CATEGORY_LABELS } from '~~/server/utils/categoryLabels'

// « Mes projets » : liste des appels d'offres où le pro s'est positionné, séparés selon l'avenant.
// Présentationnel : un clic sur une ligne demande l'ouverture de la fiche, la page orchestre.
defineProps<{
  signed: any[]
  unsigned: any[]
}>()

defineEmits<{ open: [lotId: string] }>()

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
</script>

<template>
  <div data-testid="project-list" class="space-y-8">
    <section v-for="group in [
      { key: 'unsigned', title: 'Avenant à signer', rows: unsigned, hint: 'Vous vous êtes positionné, mais les coordonnées du partenaire restent masquées tant que l\'avenant n\'est pas signé.' },
      { key: 'signed', title: 'Avenant signé', rows: signed, hint: null },
    ]" :key="group.key" :data-testid="`projects-${group.key}`">
      <div class="flex items-baseline justify-between gap-4 mb-1">
        <h2 class="text-base font-semibold text-foreground">{{ group.title }} <span class="text-muted-foreground font-normal tabular-nums">({{ group.rows.length }})</span></h2>
      </div>
      <p v-if="group.hint && group.rows.length" class="text-sm text-muted-foreground mb-2 max-w-prose">{{ group.hint }}</p>

      <p v-if="!group.rows.length" class="py-4 text-sm text-muted-foreground border-t border-border">
        {{ group.key === 'signed' ? 'Aucun avenant signé pour l\'instant.' : 'Aucun avenant en attente de signature.' }}
      </p>

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
                <template v-if="p.engagement?.signed_at"> · signé le {{ formatDate(p.engagement.signed_at) }}</template>
              </span>
            </span>
            <span v-if="group.key === 'signed' && p.engagement?.status === 'quote_submitted'" class="shrink-0 text-xs font-semibold text-foreground">
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
