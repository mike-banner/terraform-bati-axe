<script setup lang="ts">
import { QUALIFICATION_OPTIONS } from '~/utils/qualifications'

// Cases à cocher des qualifications exigées (formulaire partenaire + console admin).
// Le glossaire (<details>) explique chaque sigle pour les partenaires qui ne les connaissent pas.
const props = defineProps<{ modelValue: string[]; idPrefix?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

function toggle(value: string) {
  const next = props.modelValue.includes(value)
    ? props.modelValue.filter(v => v !== value)
    : [...props.modelValue, value]
  emit('update:modelValue', next)
}
const prefix = computed(() => props.idPrefix || 'qualif')
</script>

<template>
  <div data-testid="qualification-picker">
    <div class="flex flex-wrap gap-2">
      <label
        v-for="opt in QUALIFICATION_OPTIONS"
        :key="opt.value"
        :for="`${prefix}-${opt.value}`"
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-colors"
        :class="modelValue.includes(opt.value)
          ? 'border-copper bg-copper/10 text-copper'
          : 'border-border text-muted-foreground hover:border-muted-foreground/50'"
      >
        <input
          :id="`${prefix}-${opt.value}`"
          type="checkbox"
          class="sr-only"
          :checked="modelValue.includes(opt.value)"
          @change="toggle(opt.value)"
        >
        <span v-if="modelValue.includes(opt.value)" aria-hidden="true">✓</span>
        {{ opt.label }}
      </label>
    </div>

    <details class="mt-2 text-xs text-muted-foreground">
      <summary class="cursor-pointer select-none underline underline-offset-2 hover:text-foreground">
        Besoin d'aide ? Que signifient ces sigles ?
      </summary>
      <dl class="mt-2 space-y-1.5">
        <div v-for="opt in QUALIFICATION_OPTIONS" :key="opt.value">
          <dt class="inline font-semibold text-foreground">{{ opt.label }}</dt>
          <dd class="inline"> — {{ opt.help }}</dd>
        </div>
      </dl>
    </details>
  </div>
</template>
