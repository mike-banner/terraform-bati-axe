<script setup lang="ts">
const props = defineProps<{
  canonicalSlug: string
}>()

const emit = defineEmits<{
  (e: 'update:logoUrl', url: string): void
}>()

const logoError = ref('')
const logoUploading = ref(false)
const logoProgress = ref(0)
const logoStage = ref<'compress' | 'upload'>('compress')
const logoName = ref('')
const logoVersion = ref(0)
const logoFailed = ref(false)

const logoSrc = computed(() =>
  props.canonicalSlug ? `/api/v1/pro/logo/${props.canonicalSlug}?v=${logoVersion.value}` : ''
)

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
const MAX_SIZE = 5_242_880

async function compressImage(file: File): Promise<{ blob: Blob; type: string; name: string }> {
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return { blob: file, type: file.type, name: file.name }
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error('Lecture du fichier impossible.'))
    r.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Image invalide.'))
    i.src = dataUrl
  })
  const MAX_DIM = 512
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return { blob: file, type: file.type, name: file.name }
  ctx.drawImage(img, 0, 0, w, h)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82))
  if (!blob || blob.size >= file.size) {
    return { blob: file, type: file.type, name: file.name }
  }
  const name = file.name.replace(/\.[^.]+$/, '') + '.webp'
  return { blob, type: 'image/webp', name }
}

function putWithProgress(url: string, blob: Blob, contentType: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) logoProgress.value = Math.round((e.loaded / e.total) * 100)
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error('Échec du transfert.'))
    xhr.onerror = () => reject(new Error('Échec du transfert.'))
    xhr.send(blob)
  })
}

async function handleLogoUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  logoError.value = ''
  if (!ALLOWED_MIME.includes(file.type)) { logoError.value = 'Format non supporté.'; input.value = ''; return }
  if (file.size > MAX_SIZE) { logoError.value = 'Logo trop volumineux (5 Mo max).'; input.value = ''; return }

  logoUploading.value = true
  logoProgress.value = 0
  logoStage.value = 'compress'
  try {
    const { blob, type, name } = await compressImage(file)
    logoStage.value = 'upload'
    const presign = await $fetch<{ status: string; signedUrl: string; publicUrl: string }>(
      '/api/v1/pro/profile/logo-presign',
      { method: 'POST', body: { content_type: type, filename: name } }
    )
    await putWithProgress(presign.signedUrl, blob, type)
    logoName.value = file.name
    logoFailed.value = false
    logoVersion.value++
    if (presign.publicUrl) {
      await $fetch('/api/v1/pro/profile/me', { method: 'PATCH', body: { logo_url: presign.publicUrl } })
      emit('update:logoUrl', presign.publicUrl)
    }
  } catch (e: any) {
    logoError.value = e?.message || 'Impossible de télécharger le logo. Réessayez.'
  } finally {
    logoUploading.value = false
    input.value = ''
  }
}
</script>

<template>
  <div class="bento-card bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-8">
    <h2 class="text-xs font-heading font-semibold text-text tracking-widest uppercase mb-4">Logo d'entreprise</h2>
    <div class="flex items-center gap-4">
      <div class="w-20 h-20 border border-border rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
        <img v-if="logoSrc && !logoFailed" :src="logoSrc" alt="Logo" class="w-full h-full object-cover" @error="logoFailed = true" />
        <svg v-else class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"/>
        </svg>
      </div>
      <div>
        <label class="inline-flex items-center gap-2 h-9 px-4 border border-slate-200 bg-white text-foreground text-xs font-semibold rounded-full hover:bg-muted transition-colors cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
          </svg>
          {{ logoUploading ? 'Téléchargement…' : "Choisir un logo d'entreprise" }}
          <input type="file" accept="image/*" class="sr-only" @change="handleLogoUpload" :disabled="logoUploading" />
        </label>
        <p class="text-xs text-muted-foreground mt-2">5 Mo max. JPG, PNG, WebP, GIF, SVG. L'image est compressée automatiquement.</p>

        <!-- Fichier actif -->
        <p v-if="logoName && !logoUploading" class="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1.5">
          <svg class="w-3 h-3 text-foreground" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
          <span class="font-mono">{{ logoName }}</span>
        </p>

        <!-- Progression -->
        <UploadProgress v-if="logoUploading" :stage="logoStage" :progress="logoProgress" class="mt-3" />
      </div>
    </div>
    <p v-if="logoError" class="text-xs text-destructive mt-2">{{ logoError }}</p>
  </div>
</template>
