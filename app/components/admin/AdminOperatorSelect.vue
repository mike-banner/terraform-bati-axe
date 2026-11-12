<script setup lang="ts">
// D-29 — « Qui agit ? » : déclaratif tant que le compte admin est partagé ; validé côté serveur
// contre NUXT_ADMIN_OPERATORS. Le dernier choix est proposé, jamais appliqué sans clic explicite.
const props = defineProps<{ modelValue: string | null; id?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const operators = parseOperators(useRuntimeConfig().public.adminOperators as string)
const remembered = ref<string | null>(null)
const selectId = computed(() => props.id ?? 'admin-operator')

onMounted(() => {
  try {
    const last = sessionStorage.getItem('admin-operator')
    if (last && operators.includes(last)) remembered.value = last
  } catch { /* stockage indisponible : sans effet */ }
})

function choose(value: string) {
  emit('update:modelValue', value)
  if (!value) return
  try { sessionStorage.setItem('admin-operator', value) } catch { /* sans effet */ }
}
</script>

<template>
  <div class="space-y-1">
    <label :for="selectId" class="block text-xs font-semibold text-muted-foreground">Qui agit ?</label>
    <select
      :id="selectId"
      :value="modelValue ?? ''"
      required
      aria-label="Qui agit ?"
      :disabled="operators.length === 0"
      class="h-8 px-2 text-xs rounded-sm border border-border bg-background"
      @change="choose(($event.target as HTMLSelectElement).value)"
    >
      <option value="">— Qui agit ? —</option>
      <option v-for="o in operators" :key="o" :value="o">{{ o }}</option>
    </select>
    <button
      v-if="remembered && !modelValue"
      type="button"
      class="ml-2 text-xs underline text-muted-foreground"
      @click="choose(remembered)"
    >
      Dernier choix : {{ remembered }}
    </button>
    <p v-if="operators.length === 0" class="text-xs text-destructive">Aucun opérateur configuré (NUXT_ADMIN_OPERATORS).</p>
    <p v-else class="text-[11px] text-muted-foreground">Déclaratif : le compte admin est partagé.</p>
  </div>
</template>
