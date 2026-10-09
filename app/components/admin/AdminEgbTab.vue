<script setup lang="ts">
import { PROFESSIONAL_CATEGORIES } from '~/utils/workTypeMatrix'

interface EgbRow {
  id: string
  company_name: string
  full_name: string | null
  email: string | null
  siret: string | null
  siret_status: string | null
  siret_naf_code: string | null
  created_at: string
  categories: string[] | null
  postal_code: string | null
  naf_coherent: boolean
}

const rows = ref<EgbRow[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const busy = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ egb: EgbRow[] }>('/api/v1/admin/egb')
    rows.value = res.egb
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Impossible de charger les entreprises générales.'
  } finally {
    loading.value = false
  }
}

async function decide(row: EgbRow, decision: 'approved' | 'rejected') {
  if (decision === 'rejected' && !confirm(`Refuser ${row.company_name} ? Elle ne recevra aucun chantier.`)) return
  busy.value = row.id
  error.value = null
  try {
    await $fetch(`/api/v1/admin/egb/${row.id}`, { method: 'PATCH', body: { decision } })
    rows.value = rows.value.filter(r => r.id !== row.id)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Décision non enregistrée.'
  } finally {
    busy.value = null
  }
}

const metiers = (r: EgbRow) =>
  (r.categories ?? []).map(c => PROFESSIONAL_CATEGORIES[c] ?? c).join(', ') || 'Aucun métier déclaré'

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-base font-bold text-foreground">Entreprises générales en attente</h2>
      <p class="text-xs text-muted-foreground">Le code NAF est un signal, pas une décision. Vérifiez que la décennale couvre les métiers déclarés.</p>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <svg class="w-6 h-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
    </div>

    <template v-else>
      <p v-if="error" role="alert" class="text-sm text-red-600 border border-red-300 rounded-sm px-4 py-2">{{ error }}</p>

      <div v-if="rows.length === 0" class="py-16 text-center border border-dashed border-border rounded-sm">
        <p class="text-sm text-muted-foreground">Aucune entreprise générale en attente.</p>
      </div>

      <div v-else class="space-y-3">
        <div v-for="row in rows" :key="row.id" class="bg-card border border-border rounded-sm px-5 py-4 space-y-2">
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div class="space-y-1 min-w-0">
              <p class="text-sm font-bold text-foreground">{{ row.company_name }}</p>
              <p class="text-xs text-muted-foreground">{{ row.full_name }} · {{ row.email }}</p>
              <p class="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <span class="font-mono">SIRET {{ row.siret }}</span>
                <span>{{ row.siret_status }}</span>
                <span>NAF {{ row.siret_naf_code || 'inconnu' }}</span>
                <span
                  v-if="row.naf_coherent"
                  class="px-2 py-0.5 rounded-full bg-green-100 text-green-800"
                >NAF cohérent</span>
                <span v-else class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">NAF à vérifier</span>
              </p>
              <p class="text-xs text-foreground">{{ metiers(row) }}</p>
              <p class="text-xs text-muted-foreground">
                Inscrite le {{ new Date(row.created_at).toLocaleDateString('fr-FR') }}<template v-if="row.postal_code"> · {{ row.postal_code }}</template>
              </p>
            </div>
            <div class="flex gap-2 shrink-0">
              <button
                type="button"
                :disabled="busy === row.id"
                class="px-3 py-1.5 text-xs font-bold rounded-sm bg-green-600 text-white disabled:opacity-40"
                @click="decide(row, 'approved')"
              >Approuver</button>
              <button
                type="button"
                :disabled="busy === row.id"
                class="px-3 py-1.5 text-xs font-bold rounded-sm border border-red-500 text-red-600 disabled:opacity-40"
                @click="decide(row, 'rejected')"
              >Refuser</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
