<script setup lang="ts">
// « Mes contrats » : contrats signés du pro (liste fournie par GET /api/v1/engagements/pro).
defineProps<{ contracts: { id: string; type: string; template_version: string; signed_at: string; lot_label: string | null }[] }>()

const TYPE_LABELS: Record<string, string> = {
  framework_pro: 'Convention cadre BÂTI-AXE',
  lot_amendment: 'Avenant de mise en relation',
}
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
</script>

<template>
  <section data-testid="my-contracts" class="border border-border rounded-lg p-4 mb-4">
    <h2 class="text-sm font-bold text-foreground mb-2">Mes contrats</h2>
    <p v-if="!contracts.length" class="text-xs text-muted-foreground">Aucun contrat signé</p>
    <ul v-else class="divide-y divide-border">
      <li v-for="c in contracts" :key="c.id" class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
        <span>
          <span class="font-semibold">{{ TYPE_LABELS[c.type] ?? c.type }}</span>
          <span v-if="c.lot_label" class="text-muted-foreground"> · {{ c.lot_label }}</span>
          <span class="block text-xs text-muted-foreground">Signé le {{ formatDate(c.signed_at) }} · {{ c.template_version }}</span>
        </span>
        <a :href="`/api/v1/engagements/${c.id}/document`" target="_blank" rel="noopener" class="text-xs underline underline-offset-2 hover:opacity-70">
          Voir / imprimer
        </a>
      </li>
    </ul>
  </section>
</template>
