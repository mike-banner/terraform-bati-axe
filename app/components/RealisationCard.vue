<script setup lang="ts">
import { ref, type PropType } from 'vue'
import { Heart } from '@lucide/vue'

interface Project {
  id: string
  title: string
  city: string
  image_urls: string[]
  likes?: { count: number }[]
}

const props = defineProps({
  project: { type: Object as PropType<Project>, required: true }
})

const storageKey = `liked_${props.project.id}`
const liked = ref(typeof localStorage !== 'undefined' && !!localStorage.getItem(storageKey))
const likeCount = ref(props.project.likes?.[0]?.count ?? 0)

async function toggleLike() {
  if (liked.value) return

  // Optimiste : on remplit le cœur et incrémente avant la réponse serveur
  liked.value = true
  likeCount.value += 1
  localStorage.setItem(storageKey, '1')

  try {
    await $fetch(`/api/v1/projects/${props.project.id}/like`, { method: 'POST' })
  } catch {
    // Rollback silencieux (contrat copywriting : pas de toast pour un like raté)
    liked.value = false
    likeCount.value -= 1
    localStorage.removeItem(storageKey)
  }
}
</script>

<template>
  <div class="bento-card rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
    <div class="relative aspect-[4/3]">
      <img
        :src="project.image_urls[0]"
        :alt="`${project.title} — ${project.city}`"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <button
        type="button"
        aria-label="Aimer cette réalisation"
        class="absolute bottom-3 right-3 inline-flex items-center gap-1 h-11 px-3 rounded-full bg-white/90 shadow-lg"
        @click="toggleLike"
      >
        <Heart class="w-5 h-5" :class="liked ? 'fill-[#F97316] text-[#F97316]' : 'text-slate-500'" />
        <span class="text-xs font-semibold tabular-nums">{{ likeCount }}</span>
      </button>
    </div>
    <div class="p-6">
      <h3 class="text-lg font-semibold text-slate-900">{{ project.title }}</h3>
      <p class="text-sm text-slate-500 mt-1">{{ project.city }}</p>
    </div>
  </div>
</template>
