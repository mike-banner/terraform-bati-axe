<template>
  <span class="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100/80 border border-cyan-200 text-sm font-bold text-cyan-800 shadow-sm overflow-hidden group">
    <!-- Shimmer effect overlay -->
    <span class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent group-hover:animate-shimmer" aria-hidden="true"></span>
    
    <!-- Checkmark Icon -->
    <svg class="w-4 h-4 text-cyan-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
    </svg>
    <slot>Artisan Certifié</slot>
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
