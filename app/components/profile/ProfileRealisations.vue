<script setup lang="ts">
const props = defineProps<{
  zone: string
}>()

const showRealisationModal = ref(false)

const { data: realisations } = await useAsyncData('pro-realisations', async () => {
  try {
    const res = await $fetch<{ realisations: Record<string, unknown>[] }>('/api/v1/pro/realisations')
    return res.realisations
  } catch {
    return []
  }
}, { server: false, default: () => [] })

function onRealisationCreated(realisation: Record<string, unknown>) {
  if (realisations.value) {
    realisations.value.unshift(realisation)
  }
  showRealisationModal.value = false
}
</script>

<template>
  <div class="bento-card bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
    <div class="flex flex-col gap-3 mb-6">
      <h2 class="text-xs font-heading font-semibold text-text tracking-widest uppercase">Réalisations</h2>
      <button type="button" @click="showRealisationModal = true"
        class="inline-flex items-center justify-center gap-2 h-10 px-4 bg-safety text-white text-xs font-semibold rounded-full hover:scale-105 shadow-safety/20 transition-transform">
        Ajouter une réalisation
      </button>
    </div>

    <div v-if="!realisations || realisations.length === 0" class="text-sm text-muted-foreground">
      <p class="font-semibold text-text mb-1">Aucune réalisation pour l'instant</p>
      <p>Ajoutez vos chantiers terminés pour rassurer les futurs clients — photos avant/après, ville, description.</p>
    </div>

    <ul v-else class="grid grid-cols-1 gap-3">
      <li v-for="r in realisations" :key="r.id as string" class="flex items-center gap-3 border border-slate-200 rounded-xl p-3">
        <img v-if="(r.image_urls as string[])?.[0]" :src="(r.image_urls as string[])[0]" :alt="r.title as string" class="w-12 h-12 object-cover rounded-lg shrink-0" />
        <div class="min-w-0">
          <p class="text-xs font-semibold text-text truncate">{{ r.title }}</p>
          <p v-if="r.city" class="text-[10px] text-muted-foreground truncate mt-0.5">{{ r.city }}</p>
        </div>
      </li>
    </ul>

    <RealisationForm v-if="showRealisationModal" :zone="zone" @created="onRealisationCreated" @close="showRealisationModal = false" />
  </div>
</template>
