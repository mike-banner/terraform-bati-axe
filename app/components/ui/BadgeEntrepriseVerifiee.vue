<template>
  <span class="premium-badge inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#64748B]/30 text-[#334155] bg-[#F8FAFC]">
    <!-- Icône bâtiment -->
    <svg class="w-3.5 h-3.5 text-[#F97316] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9" />
    </svg>
    <slot>Entreprise Vérifiée (API Gouv)</slot>
  </span>
</template>

<style scoped>
.premium-badge {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  transition: box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.premium-badge:hover {
  box-shadow: 0 8px 20px -6px rgba(100, 116, 139, 0.35);
  transform: translateY(-1px);
}

@media (prefers-reduced-motion: reduce) {
  .premium-badge:hover {
    transform: none;
  }
}
</style>
