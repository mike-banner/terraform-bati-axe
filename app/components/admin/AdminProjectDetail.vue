<script setup lang="ts">
import { CATEGORY_LABELS, PRO_CATEGORY_LABELS, proCategories, leadAge } from '~/types/admin'

const props = defineProps<{ projectId: string }>()
defineEmits<{ (e: 'back'): void }>()

interface Actor {
  lead_id: string
  status: 'new' | 'claimed' | 'contacted' | 'won' | 'lost' | null
  customer_decision: 'pending' | 'refused' | 'selected'
  created_at: string | null
  unlocked_at: string | null
  pro: { id: string, company_name: string, full_name: string, email: string, phone: string, categories: string[] | null, professional_type: string | null, is_verified: boolean } | null
}
interface Detail {
  project: {
    id: string, customer_name: string, customer_email: string, customer_phone: string, category: string | null, status: string,
    description: string | null, budget_range: string | null, timeline_range: string | null, postal_code: string | null, created_at: string,
    works: string[], qualify_score: number | null, relaunch_count: number | null, last_relaunched_at: string | null,
  }
  actors: Actor[]
}

const detail = ref<Detail | null>(null)
const error = ref<string | null>(null)
const loading = ref(true)

// La fiche se relit à l'ouverture puis toutes les 30 s : elle suit la vie du projet sans recharger la console.
async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    detail.value = await $fetch<Detail>(`/api/v1/admin/projects/${props.projectId}`)
    error.value = null
  } catch (e: any) {
    if (!silent) error.value = e?.data?.statusMessage || e?.statusMessage || 'Projet introuvable.'
  } finally {
    if (!silent) loading.value = false
  }
}
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { load(); timer = setInterval(() => load(true), 30000) })
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
watch(() => props.projectId, () => load())

const fmt = (d: string | null | undefined) => d
  ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : null

const ROLE_LABEL: Record<string, string> = { new: 'Intéressé', claimed: 'Contact débloqué', contacted: 'Contacté', won: 'Chantier gagné', lost: 'Chantier perdu' }
const DECISION_LABEL: Record<string, string> = { pending: 'Pas encore de décision', selected: 'Retenu par le particulier', refused: 'Écarté par le particulier' }

const stateOf = (a: Actor) => a.status === 'won' ? 'won' : a.status === 'lost' ? 'lost' : a.customer_decision === 'selected' ? 'selected' : a.customer_decision === 'refused' ? 'refused' : 'open'
const stateCls: Record<string, string> = {
  won: 'border-emerald-400/40 text-emerald-300 bg-emerald-500/15',
  selected: 'border-emerald-400/40 text-emerald-300 bg-emerald-500/15',
  lost: 'border-destructive/40 text-destructive bg-destructive/10',
  refused: 'border-border text-muted-foreground bg-muted/30',
  open: 'border-sky-500/30 text-sky-300 bg-sky-500/15',
}

const retained = computed(() => (detail.value?.actors ?? []).filter(a => ['won', 'selected'].includes(stateOf(a))))
const phase = computed(() => {
  const d = detail.value
  if (!d) return ''
  if (d.actors.some(a => a.status === 'won')) return 'Chantier attribué'
  if (retained.value.length) return 'Artisan retenu'
  if (d.actors.length) return 'Artisans intéressés'
  return d.project.status === 'qualified' ? 'Qualifié, en attente d’artisans' : d.project.status === 'closed' ? 'Clos' : 'Reçu, à qualifier'
})

const names = (list: Actor[]) => list.map(a => a.pro?.company_name).filter(Boolean).join(', ') || null

// Étapes de la vie du projet : celles qui sont passées sont pleines, les suivantes creuses.
const steps = computed(() => {
  const d = detail.value
  if (!d) return []
  const p = d.project
  const n = d.actors.length
  const won = d.actors.filter(a => a.status === 'won')
  return [
    { label: 'Demande reçue', done: true, when: fmt(p.created_at), note: null as string | null },
    { label: 'Qualifiée', done: p.status !== 'pending', when: null, note: p.qualify_score != null ? `Score ${p.qualify_score}` : null },
    { label: 'Artisans intéressés', done: n > 0, when: null, note: n ? `${n} artisan${n > 1 ? 's' : ''}` : null },
    { label: 'Artisan retenu', done: retained.value.length > 0, when: null, note: names(retained.value) },
    { label: 'Chantier attribué', done: won.length > 0, when: null, note: names(won) },
  ]
})
</script>

<template>
  <div class="space-y-5" data-testid="admin-project-detail">
    <button type="button" class="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4" data-testid="admin-project-back" @click="$emit('back')">
      ← Retour aux projets
    </button>

    <div v-if="loading" class="py-16 text-center text-sm text-muted-foreground">Chargement du projet…</div>
    <div v-else-if="error" role="alert" class="p-3 border border-destructive/30 bg-destructive/10 rounded-sm text-sm text-destructive">{{ error }}</div>

    <template v-else-if="detail">
      <header class="flex items-start justify-between gap-3 flex-wrap">
        <div class="min-w-0">
          <h2 class="text-xl font-semibold text-foreground">
            {{ detail.project.works.length ? detail.project.works.slice(0, 2).join(', ') : (CATEGORY_LABELS[detail.project.category ?? ''] ?? detail.project.category ?? 'Projet') }}
            <span v-if="detail.project.works.length > 2" class="text-muted-foreground font-normal">+ {{ detail.project.works.length - 2 }}</span>
          </h2>
          <p class="text-sm text-muted-foreground">{{ detail.project.customer_name }} · {{ detail.project.postal_code }} · reçu {{ leadAge(detail.project.created_at).label }}</p>
        </div>
        <span class="text-xs font-semibold px-2.5 py-1 rounded-full border border-border text-foreground bg-muted/30" data-testid="admin-project-phase">{{ phase }}</span>
      </header>

      <!-- Vie du projet -->
      <section class="bg-card border border-border rounded-sm p-5">
        <h3 class="text-sm font-semibold text-foreground mb-4">Avancement</h3>
        <ol class="space-y-3" data-testid="admin-project-steps">
          <li v-for="s in steps" :key="s.label" class="flex items-start gap-3">
            <span class="mt-1 size-3 shrink-0 rounded-full border-2" :class="s.done ? 'bg-emerald-400 border-emerald-400' : 'border-border'" aria-hidden="true" />
            <div class="min-w-0">
              <p class="text-sm" :class="s.done ? 'text-foreground font-medium' : 'text-muted-foreground'">{{ s.label }}<span class="sr-only">{{ s.done ? ' (fait)' : ' (à venir)' }}</span></p>
              <p v-if="s.when || s.note" class="text-xs text-muted-foreground">{{ [s.when, s.note].filter(Boolean).join(' · ') }}</p>
            </div>
          </li>
        </ol>
      </section>

      <!-- Acteurs -->
      <section class="bg-card border border-border rounded-sm p-5">
        <h3 class="text-sm font-semibold text-foreground mb-4">Artisans ({{ detail.actors.length }})</h3>
        <p v-if="!detail.actors.length" class="text-sm text-muted-foreground" data-testid="admin-project-no-actors">Aucun artisan ne s’est encore positionné sur ce projet.</p>
        <ul v-else class="border-t border-b border-border divide-y divide-border" data-testid="admin-project-actors">
          <li v-for="a in detail.actors" :key="a.lead_id" class="py-3 flex items-start gap-3 flex-wrap">
            <div class="flex-1 min-w-[220px]">
              <p class="text-sm font-semibold text-foreground">
                {{ a.pro?.company_name ?? 'Artisan supprimé' }}
                <span v-if="a.pro?.professional_type === 'entreprise_generale'" class="ml-1 text-[11px] font-normal text-muted-foreground">Entreprise générale</span>
              </p>
              <p v-if="a.pro" class="text-xs text-muted-foreground">
                {{ proCategories({ category: null, categories: a.pro.categories }).map(c => PRO_CATEGORY_LABELS[c] ?? c).join(', ') }}
              </p>
              <p v-if="a.pro" class="text-xs text-muted-foreground">
                {{ a.pro.full_name }} ·
                <a :href="`mailto:${a.pro.email}`" class="hover:underline">{{ a.pro.email }}</a> ·
                <a :href="`tel:${a.pro.phone}`" class="hover:underline">{{ a.pro.phone }}</a>
              </p>
              <p class="text-xs text-muted-foreground mt-0.5">
                <template v-if="a.unlocked_at">Contact débloqué le {{ fmt(a.unlocked_at) }}</template>
                <template v-else-if="a.created_at">Positionné le {{ fmt(a.created_at) }}</template>
              </p>
            </div>
            <div class="flex flex-col items-end gap-1 shrink-0">
              <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full border" :class="stateCls[stateOf(a)]">{{ ROLE_LABEL[a.status ?? 'new'] }}</span>
              <span class="text-[11px] text-muted-foreground">{{ DECISION_LABEL[a.customer_decision] }}</span>
            </div>
          </li>
        </ul>
      </section>

      <!-- Le projet -->
      <section class="bg-card border border-border rounded-sm p-5 space-y-4">
        <h3 class="text-sm font-semibold text-foreground">Le projet</h3>
        <dl class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div><dt class="text-[10px] uppercase tracking-wide text-muted-foreground">Demandeur</dt><dd class="text-foreground">{{ detail.project.customer_name }}</dd></div>
          <div><dt class="text-[10px] uppercase tracking-wide text-muted-foreground">E-mail</dt><dd><a :href="`mailto:${detail.project.customer_email}`" class="text-safety hover:underline">{{ detail.project.customer_email }}</a></dd></div>
          <div><dt class="text-[10px] uppercase tracking-wide text-muted-foreground">Téléphone</dt><dd><a :href="`tel:${detail.project.customer_phone}`" class="text-foreground hover:underline">{{ detail.project.customer_phone }}</a></dd></div>
          <div v-if="detail.project.postal_code"><dt class="text-[10px] uppercase tracking-wide text-muted-foreground">Code postal</dt><dd class="text-foreground">{{ detail.project.postal_code }}</dd></div>
          <div v-if="detail.project.budget_range"><dt class="text-[10px] uppercase tracking-wide text-muted-foreground">Budget</dt><dd class="text-foreground">{{ detail.project.budget_range }}</dd></div>
          <div v-if="detail.project.timeline_range"><dt class="text-[10px] uppercase tracking-wide text-muted-foreground">Délai</dt><dd class="text-foreground">{{ detail.project.timeline_range }}</dd></div>
        </dl>
        <div v-if="detail.project.works.length">
          <p class="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Travaux</p>
          <ul class="list-disc pl-5 text-sm text-foreground">
            <li v-for="w in detail.project.works" :key="w">{{ w }}</li>
          </ul>
        </div>
        <div v-if="detail.project.description">
          <p class="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Description</p>
          <p class="text-sm text-foreground leading-relaxed whitespace-pre-line">{{ detail.project.description }}</p>
        </div>
        <p v-if="detail.project.relaunch_count" class="text-xs text-muted-foreground">
          Relancé {{ detail.project.relaunch_count }} fois<template v-if="detail.project.last_relaunched_at"> (dernière le {{ fmt(detail.project.last_relaunched_at) }})</template>.
        </p>
      </section>
    </template>
  </div>
</template>
