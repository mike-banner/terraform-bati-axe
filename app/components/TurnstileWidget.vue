<script setup lang="ts">
// Widget Cloudflare Turnstile (P2 anti-spam). Rendu explicite, réutilisable
// (simulateur, /partenaires…). Si la clé publique n'est pas configurée (dev),
// le widget ne s'affiche pas et le serveur bypass la vérification.
const emit = defineEmits<{ (e: 'success', token: string): void }>()

const config = useRuntimeConfig()
const siteKey = ((config.public as any).turnstileSiteKey as string) || ''
const container = ref<HTMLDivElement | null>(null)

function loadTurnstile(): Promise<any> {
  return new Promise((resolve) => {
    const w = window as any
    if (w.turnstile) return resolve(w.turnstile)
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.defer = true
    s.onload = () => resolve(w.turnstile)
    document.head.appendChild(s)
  })
}

onMounted(async () => {
  if (!siteKey || !container.value) return
  const turnstile = await loadTurnstile()
  turnstile?.render(container.value, {
    sitekey: siteKey,
    callback: (token: string) => emit('success', token),
  })
})
</script>

<template>
  <div v-if="siteKey" ref="container" />
</template>
