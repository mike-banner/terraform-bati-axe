<script setup lang="ts">
// IdentityBreadcrumbs — fil d'Ariane identitaire (charte Sketch 001 : gris industriel + orange sécurité).
interface Crumb { label: string; to?: string }
defineProps<{ items: Crumb[] }>()
</script>

<template>
  <nav aria-label="Fil d'Ariane" class="mb-6">
    <ol class="flex flex-wrap items-center gap-1.5 text-sm">
      <li v-for="(item, i) in items" :key="i" class="flex items-center gap-1.5">
        <NuxtLink
          v-if="item.to && i < items.length - 1"
          :to="item.to"
          class="text-[#64748B] hover:text-[#F97316] transition-colors duration-200"
        >
          {{ item.label }}
        </NuxtLink>
        <span
          v-else-if="i < items.length - 1"
          class="text-[#64748B]"
        >
          {{ item.label }}
        </span>
        <span v-else class="font-semibold text-[#F97316]">
          {{ item.label }}
        </span>

        <svg
          v-if="i < items.length - 1"
          class="w-3.5 h-3.5 text-[#94A3B8] shrink-0"
          fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </li>
    </ol>
  </nav>
</template>
