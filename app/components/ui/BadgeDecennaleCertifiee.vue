<template>
  <span class="premium-badge inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#64748B]/30 text-[#334155] bg-[#F8FAFC]">
    <!-- Icône bouclier shield-check -->
    <svg class="w-3.5 h-3.5 text-[#F97316] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
    <slot>Décennale Certifiée BÂTI-AXE</slot>
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
