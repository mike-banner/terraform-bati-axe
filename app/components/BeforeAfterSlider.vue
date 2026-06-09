<script setup lang="ts">
withDefaults(defineProps<{
  beforeSrc: string
  afterSrc: string
  beforeLabel?: string
  afterLabel?: string
  beforeAlt?: string
  afterAlt?: string
}>(), {
  beforeLabel: 'Avant',
  afterLabel: 'Après',
  beforeAlt: 'Image avant',
  afterAlt: 'Image après',
})

const containerRef = ref<HTMLElement>()
const split = ref(50)
const isHovering = ref(false)

function getPosition(e: MouseEvent | Touch) {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  split.value = Math.max(4, Math.min(96, ((e.clientX - rect.left) / rect.width) * 100))
}

function onMouseEnter() { isHovering.value = true }
function onMouseMove(e: MouseEvent) { getPosition(e) }
function onMouseLeave() {
  isHovering.value = false
  split.value = 50
}
function onTouchMove(e: TouchEvent) { if (e.touches[0]) getPosition(e.touches[0]) }
</script>

<template>
  <div
    ref="containerRef"
    class="relative overflow-hidden rounded-xl select-none cursor-ew-resize"
    style="aspect-ratio: 16/9"
    role="img"
    :aria-label="`Comparaison avant/après : ${beforeAlt} et ${afterAlt}`"
    @mouseenter="onMouseEnter"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
    @touchmove.prevent="onTouchMove"
  >
    <!-- Before -->
    <img
      :src="beforeSrc"
      :alt="beforeAlt"
      class="absolute inset-0 w-full h-full object-cover"
      draggable="false"
    />

    <!-- After (clipped to the left of the split) -->
    <div
      class="absolute inset-0"
      :class="!isHovering ? 'transition-[clip-path] duration-500 ease-out' : ''"
      :style="{ clipPath: `inset(0 ${100 - split}% 0 0)` }"
    >
      <img
        :src="afterSrc"
        :alt="afterAlt"
        class="absolute inset-0 w-full h-full object-cover"
        draggable="false"
      />
    </div>

    <!-- Divider -->
    <div
      class="absolute top-0 bottom-0 w-px bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.4)] pointer-events-none"
      :class="!isHovering ? 'transition-[left] duration-500 ease-out' : ''"
      :style="{ left: `${split}%` }"
    >
      <!-- Handle -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-xl flex items-center justify-center">
        <svg class="w-4 h-4 text-neutral-700" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
        </svg>
      </div>
    </div>

    <!-- Labels -->
    <span class="absolute bottom-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded bg-black/55 text-white backdrop-blur-sm pointer-events-none">
      {{ beforeLabel }}
    </span>
    <span class="absolute bottom-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded bg-black/55 text-white backdrop-blur-sm pointer-events-none">
      {{ afterLabel }}
    </span>

    <!-- Hint (fades on hover) -->
    <div
      class="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300"
      :class="isHovering ? 'opacity-0' : 'opacity-100'"
    >
      <span class="text-xs font-medium px-3 py-1.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
        Passez la souris pour comparer
      </span>
    </div>
  </div>
</template>
