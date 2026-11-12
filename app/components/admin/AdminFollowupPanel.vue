<script setup lang="ts">
// D-25 — parties à appeler dans l'ordre suggéré (demandeur puis artisan) et journal de suivi en ajout seul.
const props = defineProps<{ requestId: string }>()

interface Party {
  role: 'demandeur' | 'artisan'
  label: string
  name: string | null
  company: string | null
  phone: string | null
  email: string | null
  pour_le_compte_de?: string | null
  engagement_id?: string
  lot_id?: string
  pro_id?: string
  lot_label?: string | null
  status?: string
}
interface Followup {
  id: string; party: string; outcome: string; note: string | null; next_followup_on: string | null
  called_at: string; operator: string
}
interface Payload { request_ref: string; parties: Party[]; call_order: string[]; followups: Followup[] }

const PARTY_LABELS: Record<string, string> = { demandeur: 'Demandeur', partenaire: 'Partenaire', artisan: 'Artisan' }
const OUTCOME_LABELS: Record<string, string> = { joint: 'Joint', injoignable: 'Injoignable', rappel_prevu: 'Rappel prévu', debloque: 'Débloqué' }

const data = ref<Payload | null>(null)
const loadError = ref<string | null>(null)
const saveError = ref<string | null>(null)
const saved = ref(false)
const busy = ref(false)

const DAY = 86_400_000
const dayStr = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10)
const minDate = dayStr(1)
const maxDate = dayStr(365)

const form = reactive({ party: 'demandeur', proId: '', outcome: 'joint', note: '', nextOn: '' })
const operator = ref<string | null>(null)

const artisans = computed(() => (data.value?.parties ?? []).filter(p => p.role === 'artisan'))
const fmtDate = (iso: string) => new Date(iso).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' })
const fmtDay = (d: string | null) => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : ''

const canSave = computed(() =>
  !busy.value && !!operator.value
  && (form.party !== 'artisan' || !!form.proId)
  && (form.outcome !== 'rappel_prevu' || !!form.nextOn),
)

async function load() {
  loadError.value = null
  try {
    data.value = await $fetch<Payload>(`/api/v1/admin/b2b-requests/${props.requestId}/followups`)
  } catch (err: any) {
    loadError.value = err?.data?.statusMessage || 'Chargement impossible.'
  }
}

async function save() {
  if (!canSave.value) return
  busy.value = true
  saveError.value = null
  saved.value = false
  const artisan = artisans.value.find(a => a.pro_id === form.proId)
  try {
    await $fetch(`/api/v1/admin/b2b-requests/${props.requestId}/followups`, {
      method: 'POST',
      body: {
        party: form.party,
        outcome: form.outcome,
        ...(form.party === 'artisan' ? { pro_id: form.proId, lot_id: artisan?.lot_id ?? null } : {}),
        note: form.note || null,
        next_followup_on: form.nextOn || null,
        operator: operator.value,
      },
    })
    form.note = ''
    form.nextOn = ''
    saved.value = true
    await load()
    await refreshNuxtData('b2b-alerts')
  } catch (err: any) {
    saveError.value = err?.data?.statusMessage || 'Enregistrement impossible.'
  } finally {
    busy.value = false
  }
}

watch(() => props.requestId, load)
onMounted(load)
</script>

<template>
  <div data-testid="followup-panel" class="space-y-4 text-xs">
    <p v-if="loadError" role="alert" class="text-destructive">{{ loadError }}</p>
    <template v-else-if="data">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-foreground mb-1">Ordre d'appel suggéré</p>
        <ol class="space-y-2 list-decimal pl-5">
          <li v-for="(p, i) in data.parties" :key="p.engagement_id ?? `${p.role}-${i}`" class="text-muted-foreground">
            <span class="font-semibold text-foreground">{{ p.role === 'demandeur' ? 'Demandeur (partenaire)' : 'Artisan' }}</span>
            — {{ p.name || p.company || '—' }}<template v-if="p.company && p.name"> · {{ p.company }}</template>
            <template v-if="p.role === 'demandeur' && p.pour_le_compte_de === 'third_party'"> · pour le compte d'un tiers</template>
            <template v-if="p.lot_label"> · {{ p.lot_label }}</template>
            <template v-if="p.status"> · {{ p.status }}</template>
            <span class="block">
              <a v-if="p.phone" :href="`tel:${p.phone}`" class="text-safety hover:underline">{{ p.phone }}</a>
              <span v-else>Téléphone non renseigné</span>
              <template v-if="p.email"> · <a :href="`mailto:${p.email}`" class="text-safety hover:underline">{{ p.email }}</a></template>
            </span>
          </li>
        </ol>
      </div>

      <form class="space-y-2 border border-border rounded-sm p-3" @submit.prevent="save">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-foreground">Ajouter une note d'appel</p>
        <div class="flex flex-wrap gap-2">
          <select v-model="form.party" required aria-label="Partie appelée" class="h-8 px-2 rounded-sm border border-border bg-background">
            <option v-for="(label, k) in PARTY_LABELS" :key="k" :value="k">{{ label }}</option>
          </select>
          <select v-if="form.party === 'artisan'" v-model="form.proId" required aria-label="Artisan" class="h-8 px-2 rounded-sm border border-border bg-background">
            <option value="">— Artisan —</option>
            <option v-for="a in artisans" :key="a.pro_id" :value="a.pro_id">{{ a.company || a.name }} ({{ a.lot_label }})</option>
          </select>
          <select v-model="form.outcome" required aria-label="Résultat" class="h-8 px-2 rounded-sm border border-border bg-background">
            <option v-for="(label, k) in OUTCOME_LABELS" :key="k" :value="k">{{ label }}</option>
          </select>
          <input
            v-model="form.nextOn" type="date" aria-label="Prochaine relance" :min="minDate" :max="maxDate"
            :required="form.outcome === 'rappel_prevu'" class="h-8 px-2 rounded-sm border border-border bg-background"
          >
        </div>
        <textarea v-model="form.note" maxlength="1000" rows="2" aria-label="Note" placeholder="Note (facultatif)" class="w-full px-2 py-1 rounded-sm border border-border bg-background" />
        <AdminOperatorSelect v-model="operator" :id="`followup-operator-${requestId}`" />
        <button type="submit" :disabled="!canSave" class="h-8 px-3 rounded-sm bg-safety text-white font-semibold disabled:opacity-50">
          Enregistrer la note
        </button>
        <p v-if="saveError" role="alert" class="text-destructive">{{ saveError }}</p>
        <p v-if="saved" class="text-green-500">Note enregistrée.</p>
      </form>

      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-foreground mb-1">Suivi des appels</p>
        <p v-if="!data.followups.length" class="text-muted-foreground">Aucun appel enregistré.</p>
        <ul v-else class="space-y-1">
          <li v-for="f in data.followups" :key="f.id" class="border-t border-border pt-1 text-muted-foreground">
            {{ fmtDate(f.called_at) }} · {{ PARTY_LABELS[f.party] ?? f.party }} · {{ OUTCOME_LABELS[f.outcome] ?? f.outcome }} · {{ f.operator }}
            <template v-if="f.next_followup_on"> · relance le {{ fmtDay(f.next_followup_on) }}</template>
            <span v-if="f.note" class="block text-foreground">{{ f.note }}</span>
          </li>
        </ul>
      </div>
    </template>
    <p v-else class="text-muted-foreground">Chargement…</p>
  </div>
</template>
