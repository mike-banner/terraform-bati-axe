<script setup lang="ts">
interface KpiResult {
  value: number | null
  status: 'green' | 'orange' | 'red' | 'unknown'
  label: string
  detail: string
  recommendation?: string
}

interface KpiResponse {
  period: { start: string; end: string }
  kpis: {
    cac: KpiResult
    ltv_cac: KpiResult
    churn: KpiResult
    matching: KpiResult
    retention: KpiResult
    supplier: KpiResult
  }
  raw: {
    totalPaidArtisans: number
    newPaidArtisans: number
    canceledArtisans: number
    totalProjects: number
    matchedProjects: number
    totalLeads: number
    unlockedLeads: number
    totalMarketingSpend: number
    avgSubscription: number
  }
}

const isLoading = ref(true)
const data = ref<KpiResponse | null>(null)
const period = ref<'7d' | '30d' | 'month' | 'ytd'>('30d')

async function fetchKpis() {
  isLoading.value = true
  try {
    const now = new Date()
    let start: string

    switch (period.value) {
      case '7d':
        start = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10)
        break
      case '30d':
        start = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
        break
      case 'month':
        start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        break
      case 'ytd':
        start = `${now.getFullYear()}-01-01`
        break
      default:
        start = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
    }

    const end = now.toISOString().slice(0, 10)
    data.value = await $fetch<KpiResponse>(`/api/v1/admin/kpi-engine?start=${start}&end=${end}`)
  } catch (err: any) {
    console.error('KPI fetch error:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchKpis)
watch(period, fetchKpis)

const STATUS_CONFIG = {
  green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Scalable' },
  orange: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-400', label: 'Alerte' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-400', label: 'Danger' },
  unknown: { bg: 'bg-muted/50', border: 'border-border', text: 'text-muted-foreground', dot: 'bg-muted-foreground', label: 'N/A' },
}

function statusConf(status: keyof typeof STATUS_CONFIG) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.unknown
}

const kpiCards = computed(() => {
  if (!data.value) return []
  const k = data.value.kpis
  return [k.cac, k.ltv_cac, k.churn, k.matching, k.retention, k.supplier]
})
</script>

<template>
  <div v-if="isLoading" class="flex justify-center py-16">
    <svg class="w-6 h-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
  </div>

  <template v-else-if="data">
    <!-- Period filter -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1">
        <button
          v-for="p in ([{ key: '7d', label: '7 jours' }, { key: '30d', label: '30 jours' }, { key: 'month', label: 'Mois' }, { key: 'ytd', label: 'Année' }] as const)"
          :key="p.key"
          @click="period = p.key"
          class="h-8 px-3 text-xs font-medium rounded-sm border transition-colors"
          :class="period === p.key
            ? 'bg-safety text-white border-safety'
            : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'"
        >
          {{ p.label }}
        </button>
      </div>
      <span class="text-xs text-muted-foreground">
        {{ data.period.start }} → {{ data.period.end }}
      </span>
    </div>

    <!-- KPI Cards grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="(kpi, idx) in kpiCards"
        :key="idx"
        class="bg-card border rounded-sm p-5"
        :class="statusConf(kpi.status).border"
      >
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">{{ kpi.label }}</p>
          <span
            class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            :class="[statusConf(kpi.status).bg, statusConf(kpi.status).text]"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="statusConf(kpi.status).dot" />
            {{ statusConf(kpi.status).label }}
          </span>
        </div>
        <p class="text-3xl font-bold" :class="statusConf(kpi.status).text">
          {{ kpi.value !== null ? (typeof kpi.value === 'number' && kpi.value > 100 ? kpi.value.toFixed(0) : kpi.value) : '—' }}
        </p>
        <p class="text-xs text-muted-foreground mt-2">{{ kpi.detail }}</p>
        <p v-if="kpi.recommendation" class="text-xs text-amber-400 mt-2 flex items-start gap-1.5">
          <svg class="w-3 h-3 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/></svg>
          {{ kpi.recommendation }}
        </p>
      </div>
    </div>

    <!-- Red Lines Matrix -->
    <div class="bg-card border border-border rounded-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-border">
        <h3 class="text-sm font-semibold text-foreground">Matrice des lignes rouges</h3>
        <p class="text-xs text-muted-foreground mt-0.5">État du pilote 78 — vert/orange/rouge selon les seuils PM</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">KPI</th>
              <th class="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Valeur</th>
              <th class="text-center px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</th>
              <th class="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Recommandation</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(kpi, idx) in kpiCards"
              :key="idx"
              class="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td class="px-5 py-3 font-medium text-foreground">{{ kpi.label }}</td>
              <td class="px-5 py-3 text-right font-mono text-foreground">
                {{ kpi.value !== null ? (kpi.label.includes('CAC') || kpi.label.includes('LTV') ? kpi.value + (kpi.label.includes('CAC') ? ' €' : 'x') : kpi.value + '%') : '—' }}
              </td>
              <td class="px-5 py-3 text-center">
                <span
                  class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                  :class="[statusConf(kpi.status).bg, statusConf(kpi.status).text]"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="statusConf(kpi.status).dot" />
                  {{ statusConf(kpi.status).label }}
                </span>
              </td>
              <td class="px-5 py-3 text-xs text-muted-foreground hidden md:table-cell">
                {{ kpi.recommendation || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Raw stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-card border border-border rounded-sm p-4">
        <p class="text-xs text-muted-foreground">Artisans payants</p>
        <p class="text-xl font-bold text-foreground mt-1">{{ data.raw.totalPaidArtisans }}</p>
      </div>
      <div class="bg-card border border-border rounded-sm p-4">
        <p class="text-xs text-muted-foreground">Projets total</p>
        <p class="text-xl font-bold text-foreground mt-1">{{ data.raw.totalProjects }}</p>
      </div>
      <div class="bg-card border border-border rounded-sm p-4">
        <p class="text-xs text-muted-foreground">Leads débloqués</p>
        <p class="text-xl font-bold text-foreground mt-1">{{ data.raw.unlockedLeads }} / {{ data.raw.totalLeads }}</p>
      </div>
      <div class="bg-card border border-border rounded-sm p-4">
        <p class="text-xs text-muted-foreground">Spend marketing</p>
        <p class="text-xl font-bold text-foreground mt-1">{{ data.raw.totalMarketingSpend }} €</p>
      </div>
    </div>
  </template>

  <div v-else class="py-16 text-center border border-dashed border-border rounded-sm">
    <p class="text-sm text-muted-foreground">Impossible de charger les KPIs.</p>
  </div>
</template>
