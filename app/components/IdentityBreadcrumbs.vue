<template>
  <nav aria-label="Breadcrumb" class="mb-6 flex items-center gap-2 text-sm text-slate-500">
    <template v-for="(item, index) in items" :key="index">
      <NuxtLink 
        v-if="item.to" 
        :to="item.to"
        class="hover:text-cyan-700 transition-colors duration-200"
      >
        {{ item.label }}
      </NuxtLink>
      <span v-else class="text-cyan-800 font-semibold">
        {{ item.label }}
      </span>
      
      <!-- Separator Chevron -->
      <svg v-if="index < items.length - 1" class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </template>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  items: { label: string; to?: string }[]
}>()
</script>
