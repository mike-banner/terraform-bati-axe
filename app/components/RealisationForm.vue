<script setup lang="ts">
import { Upload, ImagePlus, X } from '@lucide/vue'

// Modale d'ajout de réalisation : upload multi-photos R2 en parallèle
// (une presign + un PUT progressif par fichier, jamais séquentiel),
// puis création de la réalisation. Réutilise verbatim putWithProgress
// et UploadProgress.vue (espace/profil.vue lignes 100-114).

const props = defineProps<{ zone?: string }>()
const emit = defineEmits<{ created: [realisation: Record<string, unknown>]; close: [] }>()

const title = ref('')
const description = ref('')
const city = ref(props.zone || '')

interface PendingFile {
  file: File
  progress: number
  publicUrl: string | null
  failed: boolean
}
const files = ref<PendingFile[]>([])
const uploading = ref(false)
const submitting = ref(false)
const formError = ref('')

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = Array.from(input.files || [])
  for (const file of selected) {
    files.value.push({ file, progress: 0, publicUrl: null, failed: false })
  }
  input.value = ''
}

function removeFile(index: number) {
  files.value.splice(index, 1)
}

// PUT avec progression réelle (copié verbatim depuis espace/profil.vue).
function putWithProgress(url: string, blob: Blob, contentType: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300)
      ? resolve()
      : reject(new Error('Échec du transfert.'))
    xhr.onerror = () => reject(new Error('Échec du transfert.'))
    xhr.send(blob)
  })
}

async function uploadOne(pending: PendingFile): Promise<void> {
  try {
    const presign = await $fetch<{ status: string; signedUrl: string; publicUrl: string }>(
      '/api/v1/pro/realisations/presign',
      { method: 'POST', body: { content_type: pending.file.type, filename: pending.file.name } }
    )
    await putWithProgress(presign.signedUrl, pending.file, pending.file.type, (pct) => { pending.progress = pct })
    pending.publicUrl = presign.publicUrl
  } catch {
    pending.failed = true
    formError.value = "L'envoi de la photo a échoué. Vérifiez votre connexion et réessayez."
  }
}

async function submit() {
  formError.value = ''
  const uploadedCount = files.value.filter(f => f.publicUrl).length
  if (!title.value.trim() || (files.value.length === 0 && uploadedCount === 0)) {
    formError.value = 'Merci de renseigner un titre et au moins une photo avant de publier.'
    return
  }

  // Upload en parallèle de tous les fichiers pas encore envoyés.
  uploading.value = true
  const toUpload = files.value.filter(f => !f.publicUrl && !f.failed)
  await Promise.all(toUpload.map(uploadOne))
  uploading.value = false

  const image_urls = files.value.filter(f => f.publicUrl).map(f => f.publicUrl as string)
  
  if (files.value.some(f => f.failed)) {
    // Si formError a déjà été rempli par uploadOne (ex: "L'envoi a échoué"), on ne l'écrase pas.
    if (!formError.value) {
      formError.value = "Certaines photos n'ont pas pu être envoyées. Veuillez vérifier."
    }
    return
  }

  if (!title.value.trim() || image_urls.length === 0) {
    formError.value = 'Merci de renseigner un titre et au moins une photo avant de publier.'
    return
  }

  submitting.value = true
  try {
    const res = await $fetch<{ status: string; realisation: Record<string, unknown> }>(
      '/api/v1/pro/realisations',
      { method: 'POST', body: { title: title.value.trim(), description: description.value?.trim() || null, city: city.value?.trim() || null, image_urls } }
    )
    emit('created', res.realisation)
  } catch (e: any) {
    formError.value = e?.data?.statusMessage || "L'envoi de la photo a échoué. Vérifiez votre connexion et réessayez."
  } finally {
    submitting.value = false
  }
}

function close() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
  <div class="modal-overlay flex items-center justify-center z-50" @click.self="close">
    <div class="modal">
      <h2 class="text-xl font-heading font-bold text-text mb-6">Ajouter une réalisation</h2>

      <div class="space-y-4">
        <div>
          <label class="text-xs font-semibold text-text uppercase tracking-widest mb-1.5 block">Titre</label>
          <input v-model="title" type="text" class="input w-full" placeholder="Ex: Rénovation toiture complète" maxlength="100" />
        </div>

        <div>
          <label class="text-xs font-semibold text-text uppercase tracking-widest mb-1.5 block">Description</label>
          <textarea v-model="description" rows="3" class="input w-full resize-none" placeholder="Décrivez le chantier réalisé…" maxlength="500" />
          <p class="text-xs text-muted-foreground mt-1 text-right">{{ description.length }} / 500</p>
        </div>

        <div>
          <label class="text-xs font-semibold text-text uppercase tracking-widest mb-1.5 block">Ville</label>
          <input v-model="city" type="text" class="input w-full" placeholder="Ex: Carrières-sous-Poissy" maxlength="100" />
        </div>

        <div>
          <label class="text-xs font-semibold text-text uppercase tracking-widest mb-1.5 block">Photos</label>
          <label class="inline-flex items-center gap-2 h-9 px-4 border border-slate-200 bg-white text-foreground text-xs font-semibold rounded-full hover:bg-muted transition-colors cursor-pointer">
            <Upload class="w-5 h-5" />
            Ajouter des photos
            <input type="file" accept="image/*" multiple class="sr-only" @change="onFilesSelected" :disabled="uploading || submitting" />
          </label>

          <ul v-if="files.length" class="mt-3 space-y-2">
            <li v-for="(pending, i) in files" :key="i" class="flex items-center gap-3">
              <ImagePlus class="w-5 h-5 text-muted-foreground shrink-0" />
              <span class="text-xs text-foreground truncate flex-1">{{ pending.file.name }}</span>
              <span v-if="pending.publicUrl" class="text-xs text-foreground font-semibold">OK</span>
              <span v-else-if="pending.failed" class="text-xs text-destructive font-semibold">Échec</span>
              <span v-else-if="uploading" class="text-xs text-muted-foreground tabular-nums">{{ pending.progress }}%</span>
              <button type="button" @click="removeFile(i)" :disabled="uploading || submitting" aria-label="Retirer la photo">
                <X class="w-5 h-5 text-red-600" />
              </button>
            </li>
          </ul>
        </div>

        <p v-if="formError" class="text-xs text-destructive">{{ formError }}</p>

        <div class="flex items-center justify-end gap-4 pt-2">
          <button type="button" @click="close" class="text-sm font-semibold text-muted-foreground hover:opacity-70 transition-opacity">
            Annuler
          </button>
          <button type="button" @click="submit" :disabled="uploading || submitting"
            class="inline-flex items-center justify-center gap-2 h-11 px-6 bg-safety text-white text-sm font-semibold rounded-full hover:scale-105 shadow-safety/20 transition-transform disabled:opacity-50">
            <span v-if="!uploading && !submitting">Publier la réalisation</span>
            <span v-else>Publication…</span>
          </button>
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>
