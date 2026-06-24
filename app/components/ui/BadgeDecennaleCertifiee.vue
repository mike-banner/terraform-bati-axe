<template>
  <span class="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100/80 border border-green-200 text-sm font-bold text-green-800 shadow-sm overflow-hidden group">
    <!-- Shimmer effect overlay -->
    <span class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent group-hover:animate-shimmer" aria-hidden="true"></span>

    <!-- Icône bouclier shield-check -->
    <svg class="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
    <slot>Décennale Certifiée BÂTI-AXE</slot>
  </span>
</template>

<style scoped>
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
.animate-shimmer {
  animation: shimmer 1.5s infinite;
}
@media (prefers-reduced-motion: reduce) {
  .animate-shimmer {
    animation: none;
  }
}
</style>
