<script setup lang="ts">
const supabase = useSupabaseClient()
const user     = useSupabaseUser()

useHead({ title: 'Mon espace — BÂTI-AXE' })

// Redirect to login if not authenticated
watchEffect(() => {
  if (user.value === null) navigateTo('/pro/claim')
})

// Fetch pro profile
const { data: pro, refresh } = await useAsyncData('pro-dashboard', async () => {
  if (!user.value) return null
  const { data } = await supabase
    .from('professionals')
    .select('id, company_name, full_name, phone, postal_code, canonical_slug, short_id, is_verified, is_claimed, decennal_status, created_at')
    .eq('id', user.value.id)
    .maybeSingle()
  return data
}, { server: false })

// Fetch verifications
const { data: verifs } = await useAsyncData('pro-verifs', async () => {
  if (!user.value) return []
  const { data } = await supabase
    .from('verifications')
    .select('document_type, status, expiry_date, created_at')
    .eq('pro_id', user.value.id)
    .order('created_at', { ascending: false })
  return data || []
}, { server: false })

const kbis = computed(() => verifs.value?.find(v => v.document_type === 'kbis'))
const decennale = computed(() => verifs.value?.find(v => v.document_type === 'decennale'))

const docStatus = (doc: any) => {
  if (!doc) return { label: 'Non envoyé', cls: 'text-muted-foreground border-border' }
  if (doc.status === 'approved') return { label: 'Validé', cls: 'text-foreground border-foreground/30' }
  if (doc.status === 'rejected') return { label: 'Rejeté', cls: 'text-red-700 border-red-200 bg-red-50' }
  return { label: 'En attente', cls: 'text-amber-700 border-amber-300 bg-amber-50' }
}

const steps = computed(() => [
  {
    label: 'Compte créé',
    done: true,
    desc: user.value?.email || '',
  },
  {
    label: 'Profil entreprise',
    done: !!pro.value?.company_name,
    desc: pro.value?.company_name || 'Non renseigné',
    action: !pro.value?.company_name ? { label: 'Compléter mon profil', to: '/pro/claim' } : null,
  },
  {
    label: 'Kbis envoyé',
    done: !!kbis.value,
    desc: kbis.value ? `Statut : ${docStatus(kbis.value).label}` : 'Document manquant',
    action: !kbis.value ? { label: 'Envoyer le Kbis', to: '/pro/claim' } : null,
  },
  {
    label: 'Décennale envoyée',
    done: !!decennale.value,
    desc: decennale.value ? `Statut : ${docStatus(decennale.value).label}` : 'Document manquant',
    action: !decennale.value ? { label: 'Envoyer la décennale', to: '/pro/claim' } : null,
  },
  {
    label: 'Profil vérifié',
    done: pro.value?.is_verified === true,
    desc: pro.value?.is_verified ? 'Votre profil est actif et visible.' : 'En attente de validation par notre équipe (sous 24h ouvrées).',
  },
])

const currentStepIndex = computed(() => {
  const idx = steps.value.findIndex(s => !s.done)
  return idx === -1 ? steps.value.length - 1 : idx
})
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-16">

    <!-- Not registered yet -->
    <div v-if="user && !pro" class="py-8">
      <h1 class="text-3xl font-black tracking-tight text-foreground mb-3">Mon espace</h1>
      <p class="text-sm text-muted-foreground mb-8">Votre profil artisan n'est pas encore créé.</p>
      <NuxtLink to="/pro/claim" class="inline-flex items-center gap-2 h-11 px-6 bg-foreground text-background text-sm font-semibold rounded-md hover:opacity-80 transition-opacity">
        Créer mon profil artisan
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
      </NuxtLink>
    </div>

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
        </div>
        <h1 class="text-3xl font-black tracking-tight text-foreground" style="text-wrap: balance">{{ pro.company_name }}</h1>
        <p class="text-sm text-muted-foreground mt-1">{{ pro.full_name }} · {{ pro.postal_code }}</p>
      </div>

      <!-- Progress checklist -->
      <div class="border border-border rounded-lg divide-y divide-border mb-10">
        <div
          v-for="(step, i) in steps"
          :key="i"
          class="flex items-start gap-4 px-5 py-4"
        >
          <div
            class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            :class="step.done ? 'bg-foreground text-background' : i === currentStepIndex ? 'border-2 border-foreground' : 'border border-border'"
          >
            <svg v-if="step.done" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-foreground">{{ step.label }}</p>
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

      <!-- Documents status -->
      <div class="border-t border-border pt-8 mb-10">
        <h2 class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">Documents</h2>
        <div class="grid grid-cols-2 gap-3">
          <div class="p-4 border border-border rounded-lg">
            <p class="text-xs text-muted-foreground mb-1">Kbis</p>
            <span class="inline-flex text-xs font-semibold px-2 py-0.5 rounded-full border" :class="docStatus(kbis).cls">
              {{ docStatus(kbis).label }}
            </span>
          </div>
          <div class="p-4 border border-border rounded-lg">
            <p class="text-xs text-muted-foreground mb-1">Décennale</p>
            <span class="inline-flex text-xs font-semibold px-2 py-0.5 rounded-full border" :class="docStatus(decennale).cls">
              {{ docStatus(decennale).label }}
            </span>
            <p v-if="decennale?.expiry_date" class="text-xs text-muted-foreground mt-1">
              Expire le {{ new Date(decennale.expiry_date).toLocaleDateString('fr-FR') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Public profile link (if verified) -->
      <div v-if="pro.is_verified && pro.canonical_slug" class="border-t border-border pt-8">
        <h2 class="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">Votre profil public</h2>
        <div class="flex items-center gap-3 p-4 border border-border rounded-lg">
          <code class="text-xs text-muted-foreground font-mono truncate flex-1">/pro/{{ pro.postal_code?.slice(0,2) }}/{{ pro.canonical_slug }}</code>
          <NuxtLink
            :to="`/pro/${pro.postal_code?.slice(0,2)}/${pro.canonical_slug}`"
            target="_blank"
            class="shrink-0 h-8 px-3 border border-border text-xs font-medium rounded-md hover:bg-muted transition-colors flex items-center gap-1.5"
          >
            Voir
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
          </NuxtLink>
        </div>
      </div>
    </template>

  </div>
</template>
