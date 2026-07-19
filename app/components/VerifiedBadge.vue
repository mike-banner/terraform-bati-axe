<script setup lang="ts">
// VerifiedBadge — badge "Profil vérifié" (charte Sketch 001 : gris industriel + orange sécurité).
// Indique une vérification manuelle (KBIS + décennale), sans rapport avec l'abonnement Premium payant.
// ponytail: props minimales, le libellé est quasi toujours fixe pour ce badge.
withDefaults(defineProps<{ label?: string }>(), { label: 'Profil vérifié' })
</script>

<template>
  <span class="premium-badge inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#64748B]/30 text-[#334155] bg-[#F8FAFC]">
    <svg class="w-3.5 h-3.5 text-[#F97316] shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.286 3.957c.3.922-.755 1.688-1.538 1.118l-3.367-2.445a1 1 0 00-1.175 0l-3.367 2.445c-.783.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.062 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.287-3.958z" clip-rule="evenodd" />
    </svg>
    {{ label }}
  </span>
</template>

<style scoped>
.premium-badge {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  transition: box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Shimmer : bande lumineuse qui traverse le badge en continu. */
.premium-badge::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    100deg,
    transparent 30%,
    rgba(249, 115, 22, 0.18) 45%,
    rgba(249, 115, 22, 0.32) 50%,
    rgba(249, 115, 22, 0.18) 55%,
    transparent 70%
  );
  background-size: 250% 100%;
  animation: premium-shimmer 3.2s linear infinite;
}

.premium-badge:hover {
  box-shadow: 0 8px 20px -6px rgba(100, 116, 139, 0.35);
  transform: translateY(-1px);
}

@keyframes premium-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -50% 0; }
}

/* Accessibilité : on coupe l'animation continue si l'utilisateur la refuse. */
@media (prefers-reduced-motion: reduce) {
  .premium-badge::before {
    animation: none;
  }
  .premium-badge:hover {
    transform: none;
  }
}
</style>
