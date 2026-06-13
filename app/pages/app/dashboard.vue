<script setup lang="ts">
definePageMeta({ layout: 'dynamic' })

interface Pro {
  id: string; company_name: string; full_name: string; phone: string
  postal_code: string; canonical_slug: string; short_id: string
  is_verified: boolean; is_claimed: boolean; decennal_status: string; created_at: string
  categories: string[]; subscription_status: string; bio?: string; logo_url?: string
}
interface Verif {
  document_type: string; status: string; expiry_date: string | null; created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  maconnerie: 'Maçonnerie', toiture: 'Toiture', electricite: 'Électricité',
  plomberie: 'Plomberie', peinture: 'Peinture', isolation: 'Isolation',
}

const supabase = useSupabaseClient()
const { user } = useRequireAuth()
useHead({ title: 'Mon profil — BÂTI-AXE' })

const pro    = ref<Pro | null>(null)
const verifs = ref<Verif[]>([])
const loading = ref(true)
const router = useRouter()

async function loadProData() {
  loading.value = true
  try {
    // Le token JWT doit être attaché au client Supabase AVANT la requête : sinon
    // elle part en `anon` et la policy RLS publique (is_verified=true) masque la
    // ligne d'un pro non encore vérifié → faux « Profil introuvable ».
    // getSession() force la restauration de la session et donc l'attache du token.
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id
    if (!uid) {
      loading.value = false
      return
    }
    const [{ data: proData, error: proErr }, { data: verifData, error: verifErr }] = await Promise.all([
      supabase.from('professionals')
        .select('id, company_name, full_name, phone, postal_code, canonical_slug, short_id, is_verified, is_claimed, decennal_status, created_at, categories, subscription_status, bio, logo_url')
        .eq('id', uid).maybeSingle(),
      supabase.from('verifications')
        .select('document_type, status, expiry_date, created_at')
        .eq('pro_id', uid).order('created_at', { ascending: false })
    ])
    if (proErr && proErr.code !== 'PGRST116') console.error('[dashboard] pro fetch:', proErr.message)
    if (verifErr) console.error('[dashboard] verif fetch:', verifErr.message)
    
    if (!proData) {
      console.warn('[dashboard] Profile missing, proData is null. Showing fallback UI.')
      return
    }

    pro.value    = proData as Pro | null
    verifs.value = (verifData || []) as Verif[]
  } catch (e) {
    console.error('Error loading pro data', e)
  } finally {
    loading.value = false
  }
}

watch(user, () => loadProData(), { immediate: true })

const kbis      = computed(() => verifs.value?.find(v => v.document_type === 'kbis'))
const decennale = computed(() => verifs.value?.find(v => v.document_type === 'decennale'))

const docStatus = (doc: any) => {
  if (!doc) return { label: 'Non envoyé', cls: 'text-muted-foreground border-border' }
  
  if (doc.status === 'approved') {
    if (doc.expiry_date) {
      const daysLeft = Math.ceil((new Date(doc.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
      if (daysLeft < 0) {
        return { label: 'Expiré ⚠️', cls: 'text-red-700 border-red-200 bg-red-50' }
      }
      const warningDays = doc.document_type === 'decennale' ? 30 : 14
      if (daysLeft <= warningDays) {
        return { label: 'Expire bientôt', cls: 'text-amber-700 border-amber-300 bg-amber-50' }
      }
    }
    return { label: 'Validé ✓', cls: 'text-foreground border-foreground/30' }
  }
  
  if (doc.status === 'rejected') return { label: 'Rejeté', cls: 'text-red-700 border-red-200 bg-red-50' }
  return { label: 'En attente', cls: 'text-amber-700 border-amber-300 bg-amber-50' }
}

// ─── Upload inline ─────────────────────────────────────────────────────────────
const uploads = reactive({
  kbis:      { file: null as File | null, status: 'idle' as 'idle'|'uploading'|'success'|'error', error: '' },
  decennale: { file: null as File | null, status: 'idle' as 'idle'|'uploading'|'success'|'error', error: '' },
})

function onFileSelect(e: Event, type: 'kbis' | 'decennale') {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) { uploads[type].file = f; uploads[type].status = 'idle'; uploads[type].error = '' }
}

async function uploadDoc(type: 'kbis' | 'decennale') {
  const file = uploads[type].file
  if (!file) return
  uploads[type].status = 'uploading'
  uploads[type].error  = ''
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id
    if (!uid) throw new Error('Utilisateur non connecté.')

    const presign = await $fetch<{ status: string; signedUrl: string; fileKey: string }>(
      '/api/v1/pro/documents/presign',
      { method: 'POST', body: { document_type: type, filename: file.name } }
    )
    if (presign.status !== 'SUCCESS') throw new Error('Erreur de signature.')
    const res = await fetch(presign.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
    if (!res.ok) throw new Error('Échec du transfert.')
    
    const { data: existing, error: selectErr } = await (supabase as any).from('verifications').select('id').eq('pro_id', uid).eq('document_type', type).maybeSingle()
    if (selectErr && selectErr.code !== 'PGRST116') console.error('Select error:', selectErr)

    if (existing) {
      const { error: updateErr } = await (supabase as any).from('verifications').update({ file_key: presign.fileKey, status: 'pending' }).eq('id', existing.id)
      if (updateErr) throw new Error(updateErr.message)
    } else {
      const { error: insertErr } = await (supabase as any).from('verifications').insert({ pro_id: uid, document_type: type, file_key: presign.fileKey, status: 'pending' })
      if (insertErr) throw new Error(insertErr.message)
    }
    uploads[type].status = 'success'
    await loadProData() // refresh badges
  } catch (err: any) {
    uploads[type].status = 'error'
    const errorMsg = err.data?.message || err.message || 'Erreur.'
    // Différencier l'erreur pour aider au debug
    if (errorMsg === 'Failed to fetch') {
      uploads[type].error = 'Erreur réseau (CORS ou blocage navigateur) lors du transfert vers R2.'
    } else {
      uploads[type].error = errorMsg
    }
  }
}

const steps = computed(() => [
  { label: 'Compte créé',       done: true,                    desc: user.value?.email || '' },
  { label: 'Profil entreprise', done: !!pro.value?.company_name, desc: pro.value?.company_name || 'Non renseigné',
    action: !pro.value?.company_name ? { label: 'Compléter mon profil', to: '/pro/claim' } : null },
  { label: 'Kbis envoyé',       done: !!kbis.value,            desc: kbis.value ? `Statut : ${docStatus(kbis.value).label}` : 'Document manquant' },
  { label: 'Décennale envoyée', done: !!decennale.value,        desc: decennale.value ? `Statut : ${docStatus(decennale.value).label}` : 'Document manquant' },
  { label: 'Profil vérifié',    done: pro.value?.is_verified === true,
    desc: pro.value?.is_verified ? 'Votre profil est actif et visible.' : 'En attente de validation par notre équipe (sous 24h ouvrées).' },
  { label: 'Mon profil public', done: !!(pro.value?.bio || pro.value?.logo_url),
    desc: "Bio, logo, zone d'intervention",
    action: { label: 'Éditer mon profil', to: '/espace/profil' } },
])

const currentStepIndex = computed(() => {
  const idx = steps.value.findIndex(s => !s.done)
  return idx === -1 ? steps.value.length - 1 : idx
})

const docsComplete = computed(() => !!kbis.value && !!decennale.value)
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-8">

    <!-- Loading -->
    <div v-if="loading" class="py-12 flex justify-center">
      <svg class="w-8 h-8 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
    </div>

    <!-- Main Dashboard -->
    <template v-else-if="pro">

      <!-- Header -->
      <div class="mb-10">
        <div class="flex items-center gap-2 mb-3">
          <span
            class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full"
            :class="pro.is_verified ? 'border-foreground/30 text-foreground' : 'border-amber-300 text-amber-700 bg-amber-50'"
          >
            <svg v-if="pro.is_verified" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {{ pro.is_verified ? 'Vérifié BÂTI-AXE' : 'Vérification en cours' }}
          </span>
          <span v-if="pro.categories && pro.categories.length > 0" class="inline-flex items-center text-xs font-medium px-3 py-1.5 border border-border rounded-full text-muted-foreground gap-1">
            <span v-for="cat in pro.categories" :key="cat">{{ CATEGORY_LABELS[cat] || cat }}</span>
          </span>
        </div>
        <h1 class="text-3xl font-semibold tracking-tight text-foreground" style="text-wrap: balance">{{ pro.company_name }}</h1>
        <p class="text-sm text-muted-foreground mt-1">{{ pro.full_name }} · {{ pro.postal_code }}</p>
      </div>

      <!-- ─── Documents (toujours visible pour permettre le renouvellement) ───── -->
      <div class="rounded-lg p-5 mb-8 border" :class="docsComplete ? 'border-border' : 'border-red-300 bg-red-50'">
        <div class="flex items-start gap-2 mb-3">
          <svg v-if="!docsComplete" class="w-4 h-4 text-red-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
          <div>
            <p class="text-sm font-semibold" :class="docsComplete ? 'text-foreground' : 'text-red-900'">Documents requis</p>
            <p v-if="!docsComplete" class="text-xs text-red-700 mt-0.5">Envoyez vos justificatifs pour valider votre profil et accéder aux leads (même gratuits).</p>
            <p v-else class="text-xs text-muted-foreground mt-0.5">Renouvelez-les en cas d'expiration ou de mise à jour.</p>
          </div>
        </div>

        <!-- KBIS -->
        <div v-if="!kbis" class="mb-4">
          <p class="text-xs font-semibold text-foreground mb-2">Extrait KBIS <span class="text-muted-foreground font-normal">(moins de 3 mois · PDF, JPG, PNG)</span></p>
          <div v-if="uploads.kbis.status !== 'success'" class="flex items-center gap-3 flex-wrap">
            <label class="cursor-pointer">
              <input type="file" @change="onFileSelect($event, 'kbis')" accept=".pdf,image/*" class="sr-only" />
              <span class="h-9 px-4 border border-border rounded-md text-xs font-medium bg-white hover:bg-muted transition-colors flex items-center gap-2">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"/></svg>
                Choisir
              </span>
            </label>
            <span class="text-xs text-muted-foreground truncate max-w-[180px]">{{ uploads.kbis.file ? uploads.kbis.file.name : 'Aucun fichier' }}</span>
            <button
              v-if="uploads.kbis.file"
              @click="uploadDoc('kbis')"
              :disabled="uploads.kbis.status === 'uploading'"
              class="h-9 px-4 bg-foreground text-background text-xs font-semibold rounded-md hover:opacity-80 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              <svg v-if="uploads.kbis.status === 'uploading'" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              {{ uploads.kbis.status === 'uploading' ? 'Envoi…' : 'Envoyer le KBIS' }}
            </button>
          </div>
          <p v-if="uploads.kbis.status === 'error'" class="text-xs text-red-600 mt-1">{{ uploads.kbis.error }}</p>
          <p v-if="uploads.kbis.status === 'success'" class="text-xs text-foreground font-semibold mt-1">✓ KBIS envoyé</p>
        </div>
        <div v-else class="mb-4 flex items-center gap-3 text-xs text-foreground flex-wrap">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-foreground" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            KBIS — <span :class="docStatus(kbis).cls" class="px-2 py-0.5 border rounded-full font-semibold">{{ docStatus(kbis).label }}</span>
          </div>
          <label class="cursor-pointer">
            <input type="file" @change="onFileSelect($event, 'kbis'); uploadDoc('kbis')" accept=".pdf,image/*" class="sr-only" />
            <span class="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
              {{ uploads.kbis.status === 'uploading' ? 'Envoi...' : 'Modifier' }}
            </span>
          </label>
        </div>

        <!-- Décennale -->
        <div v-if="!decennale">
          <p class="text-xs font-semibold text-foreground mb-2">Attestation décennale <span class="text-muted-foreground font-normal">(PDF, JPG, PNG)</span></p>
          <div v-if="uploads.decennale.status !== 'success'" class="flex items-center gap-3 flex-wrap">
            <label class="cursor-pointer">
              <input type="file" @change="onFileSelect($event, 'decennale')" accept=".pdf,image/*" class="sr-only" />
              <span class="h-9 px-4 border border-border rounded-md text-xs font-medium bg-white hover:bg-muted transition-colors flex items-center gap-2">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"/></svg>
                Choisir
              </span>
            </label>
            <span class="text-xs text-muted-foreground truncate max-w-[180px]">{{ uploads.decennale.file ? uploads.decennale.file.name : 'Aucun fichier' }}</span>
            <button
              v-if="uploads.decennale.file"
              @click="uploadDoc('decennale')"
              :disabled="uploads.decennale.status === 'uploading'"
              class="h-9 px-4 bg-foreground text-background text-xs font-semibold rounded-md hover:opacity-80 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              <svg v-if="uploads.decennale.status === 'uploading'" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              {{ uploads.decennale.status === 'uploading' ? 'Envoi…' : 'Envoyer la décennale' }}
            </button>
          </div>
          <p v-if="uploads.decennale.status === 'error'" class="text-xs text-red-600 mt-1">{{ uploads.decennale.error }}</p>
          <p v-if="uploads.decennale.status === 'success'" class="text-xs text-foreground font-semibold mt-1">✓ Décennale envoyée</p>
        </div>
        <div v-else class="flex items-center gap-3 text-xs text-foreground flex-wrap">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            Décennale — <span :class="docStatus(decennale).cls" class="px-2 py-0.5 border rounded-full font-semibold">{{ docStatus(decennale).label }}</span>
          </div>
          <label class="cursor-pointer">
            <input type="file" @change="onFileSelect($event, 'decennale'); uploadDoc('decennale')" accept=".pdf,image/*" class="sr-only" />
            <span class="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
              {{ uploads.decennale.status === 'uploading' ? 'Envoi...' : 'Modifier' }}
            </span>
          </label>
        </div>

        <!-- Responsabilité -->
        <div class="mt-4 pt-4 border-t border-border/50">
          <p class="text-xs text-muted-foreground leading-relaxed">
            <span class="font-semibold">⚠️ Responsabilité :</span> Vous garantissez l'authenticité et la validité des documents envoyés. Toute fausse déclaration ou document falsifié peut entraîner la fermeture de votre compte et des poursuites légales. BÂTI-AXE décline toute responsabilité en cas de fraude documentaire.
          </p>
        </div>
      </div>

      <!-- Progress checklist -->
      <div class="border border-border rounded-lg divide-y divide-border mb-10">
        <div v-for="(step, i) in steps" :key="i" class="flex items-start gap-4 px-5 py-4">
          <div
            class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            :class="step.done ? 'bg-foreground text-background' : i === currentStepIndex ? 'border-2 border-foreground' : 'border border-border'"
          >
            <svg v-if="step.done" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
          </div>
          <div class="flex-1 min-w-0">
            <NuxtLink v-if="step.action" :to="step.action.to"
              class="text-sm font-semibold text-foreground hover:opacity-70 transition-opacity">
              {{ step.label }}
            </NuxtLink>
            <p v-else class="text-sm font-semibold text-foreground">{{ step.label }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">{{ step.desc }}</p>
            <NuxtLink
              v-if="step.action"
              :to="step.action.to"
              class="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              {{ step.action.label }}
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
            </NuxtLink>
          </div>
        </div>
      </div>



    </template>

    <!-- Fallback if pro is null and redirect fails -->
    <div v-else class="py-16 text-center space-y-4">
      <div class="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      </div>
      <h2 class="text-xl font-semibold text-foreground">Profil professionnel introuvable</h2>
      <p class="text-sm text-muted-foreground max-w-md mx-auto">
        Votre compte existe, mais les données de votre entreprise n'ont pas pu être chargées.
      </p>
      <NuxtLink to="/pro/claim" class="mt-6 inline-flex items-center justify-center h-10 px-6 rounded-md bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity">
        Créer ou vérifier mon profil
      </NuxtLink>
    </div>

  </div>
</template>
