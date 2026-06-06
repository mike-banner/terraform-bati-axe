<script setup lang="ts">
interface Pro {
  id: string; company_name: string; full_name: string; phone: string
  postal_code: string; canonical_slug: string; short_id: string
  is_verified: boolean; is_claimed: boolean; decennal_status: string; created_at: string
  category: string; subscription_status: string
}
interface Verif {
  document_type: string; status: string; expiry_date: string | null; created_at: string
}
interface Lead {
  id: string; status: string; unlocked_at: string | null; created_at: string
  category?: string; budget_range?: string; timeline_range?: string
  description?: string; customer_name?: string; customer_phone?: string
  customer_email?: string; postal_code?: string
  projects?: { category: string; budget_range: string }
}

const CATEGORY_LABELS: Record<string, string> = {
  maconnerie:   'Maçonnerie',
  toiture:      'Toiture',
  electricite:  'Électricité',
  plomberie:    'Plomberie',
  peinture:     'Peinture',
  isolation:    'Isolation',
}

const supabase = useSupabaseClient()
const user     = useSupabaseUser()

useHead({ title: 'Mon espace — BÂTI-AXE' })

watchEffect(() => {
  if (user.value === null) navigateTo('/pro/claim')
})

const pro    = ref<Pro | null>(null)
const verifs = ref<Verif[]>([])
onMounted(() => loadProData())

async function loadProData() {
  const { data: { session } } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) return
  const [{ data: proData, error: proErr }, { data: verifData, error: verifErr }] = await Promise.all([
    supabase
      .from('professionals')
      .select('id, company_name, full_name, phone, postal_code, canonical_slug, short_id, is_verified, is_claimed, decennal_status, created_at, category, subscription_status')
      .eq('id', uid)
      .maybeSingle(),
    supabase
      .from('verifications')
      .select('document_type, status, expiry_date, created_at')
      .eq('pro_id', uid)
      .order('created_at', { ascending: false })
  ])
  if (proErr)   console.error('[dashboard] pro fetch:', proErr.message)
  if (verifErr) console.error('[dashboard] verif fetch:', verifErr.message)
  pro.value    = proData as Pro | null
  verifs.value = (verifData || []) as Verif[]
}

watch(user, () => loadProData(), { immediate: true })

const kbis      = computed(() => verifs.value?.find(v => v.document_type === 'kbis'))
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

// --- Tabs ---
const activeTab = ref<'profil' | 'leads'>('profil')

// --- Leads tab ---
const leads        = ref<Lead[]>([])
const leadsLoading = ref(false)
const leadsLoaded  = ref(false)

async function loadLeads() {
  if (leadsLoaded.value) return
  leadsLoading.value = true
  try {
    const res = await $fetch<{ leads: Lead[] }>('/api/v1/leads')
    leads.value = res.leads ?? []
  } catch (e) {
    console.error('[dashboard] leads fetch:', e)
  } finally {
    leadsLoading.value = false
    leadsLoaded.value  = true
  }
}

watch(activeTab, (tab) => {
  if (tab === 'leads') loadLeads()
})

function leadCategory(lead: Lead): string {
  const cat = lead.category || lead.projects?.category || ''
  return CATEGORY_LABELS[cat] || cat
}

function leadStatusLabel(status: string): { label: string; cls: string } {
  if (status === 'unlocked') return { label: 'Déverrouillé', cls: 'text-foreground border-foreground/30' }
  if (status === 'claimed')  return { label: 'Pris', cls: 'text-muted-foreground border-border' }
  return { label: 'Verrouillé', cls: 'text-amber-700 border-amber-300 bg-amber-50' }
}

function timeUntilUnlock(unlocked_at: string | null): string {
  if (!unlocked_at) return ''
  const diff = new Date(unlocked_at).getTime() - Date.now()
  if (diff <= 0) return 'Déverrouillage imminent'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `Déverrouillage dans ${h}h${m > 0 ? m + 'min' : ''}`
  return `Déverrouillage dans ${m} min`
}
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
      <div class="mb-8">
        <div class="flex items-center gap-2 mb-3">
          <span
            class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-full"
            :class="pro.is_verified ? 'border-foreground/30 text-foreground' : 'border-amber-300 text-amber-700 bg-amber-50'"
          >
            <svg v-if="pro.is_verified" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {{ pro.is_verified ? 'Vérifié BÂTI-AXE' : 'Vérification en cours' }}
          </span>
          <span v-if="pro.category" class="inline-flex items-center text-xs font-medium px-3 py-1.5 border border-border rounded-full text-muted-foreground">
            {{ CATEGORY_LABELS[pro.category] || pro.category }}
          </span>
        </div>
        <h1 class="text-3xl font-black tracking-tight text-foreground" style="text-wrap: balance">{{ pro.company_name }}</h1>
        <p class="text-sm text-muted-foreground mt-1">{{ pro.full_name }} · {{ pro.postal_code }}</p>
      </div>

      <!-- Tab navigation -->
      <div class="flex border-b border-border mb-8">
        <button
          class="px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors"
          :class="activeTab === 'profil' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
          @click="activeTab = 'profil'"
        >
          Profil
        </button>
        <button
          class="px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors"
          :class="activeTab === 'leads' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
          @click="activeTab = 'leads'"
        >
          Leads
          <span v-if="leadsLoaded && leads.length" class="ml-1.5 text-xs font-medium bg-foreground text-background px-1.5 py-0.5 rounded-full">{{ leads.length }}</span>
        </button>
      </div>

      <!-- TAB: Profil -->
      <div v-show="activeTab === 'profil'">
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
      </div>

      <!-- TAB: Leads -->
      <div v-show="activeTab === 'leads'">
        <!-- Loading -->
        <div v-if="leadsLoading" class="py-12 flex justify-center">
          <svg class="w-5 h-5 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        </div>

        <!-- Empty state -->
        <div v-else-if="leadsLoaded && leads.length === 0" class="py-12 text-center">
          <p class="text-sm text-muted-foreground">Aucun lead disponible pour le moment.</p>
          <p class="text-xs text-muted-foreground mt-1">Vous serez notifié dès qu'un chantier correspond à votre activité.</p>
        </div>

        <!-- Lead cards -->
        <div v-else-if="leads.length" class="space-y-3">
          <div
            v-for="lead in leads"
            :key="lead.id"
            class="border border-border rounded-lg p-5"
          >
            <!-- Top row: category + status -->
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {{ leadCategory(lead) }}
              </span>
              <span
                class="inline-flex text-xs font-semibold px-2 py-0.5 rounded-full border"
                :class="leadStatusLabel(lead.status).cls"
              >
                {{ leadStatusLabel(lead.status).label }}
              </span>
            </div>

            <!-- Budget + postal -->
            <div class="flex items-center gap-4 mb-2">
              <p v-if="lead.budget_range" class="text-sm font-semibold text-foreground">{{ lead.budget_range }}</p>
              <p v-if="lead.postal_code && lead.status === 'unlocked'" class="text-sm text-muted-foreground">{{ lead.postal_code }}</p>
            </div>

            <!-- Description (unlocked) -->
            <p v-if="lead.description" class="text-sm text-muted-foreground mb-3 line-clamp-2">{{ lead.description }}</p>

            <!-- Customer info (unlocked) -->
            <div v-if="lead.status === 'unlocked'" class="pt-3 border-t border-border space-y-1">
              <p class="text-sm font-medium text-foreground">{{ lead.customer_name }}</p>
              <p class="text-xs text-muted-foreground">{{ lead.customer_phone }} · {{ lead.customer_email }}</p>
            </div>

            <!-- Unlock countdown (locked) -->
            <p v-if="lead.status === 'locked' && lead.unlocked_at" class="text-xs text-amber-700 mt-2">
              {{ timeUntilUnlock(lead.unlocked_at) }}
            </p>

            <!-- Date -->
            <p class="text-xs text-muted-foreground mt-3">
              Reçu le {{ new Date(lead.created_at).toLocaleDateString('fr-FR') }}
            </p>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>
