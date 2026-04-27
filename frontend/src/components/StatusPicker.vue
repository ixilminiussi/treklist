<template>
  <div class="cycle-wrap">
    <div class="cycle-row" :class="{ 'has-qty': hasQty }">
      <button v-if="hasQty" class="qty-btn" @click.stop="changeQty(-1)">−</button>

      <button
        class="cycle-btn"
        :class="statusClass"
        :style="activeStyle"
        @click="cycle"
      >{{ label }}</button>

      <button v-if="hasQty" class="qty-btn" @click.stop="changeQty(1)">+</button>
    </div>
    <span v-if="hasQty" class="qty-count" :style="{ color }">{{ quantity }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  item: string
  status: string
  color: string
  quantity?: number
}>()

const emit = defineEmits<{
  change: [string]
  quantityChange: [number]
}>()

const CYCLE = ['need', 'will_get', 'got_it', 'provided', 'shared', 'dont_need']

const LABELS: Record<string, string> = {
  '': '—',
  need: 'Need',
  will_get: 'Will get',
  got_it: 'Got it',
  provided: 'Provided',
  shared: 'Shared',
  dont_need: 'Skip',
}

// fixed status colours, independent of trekker colour
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '':         { bg: 'transparent',  border: '#2a2d3e', text: '#8b92a8' },
  need:       { bg: '#2a1a1a',      border: '#c0392b', text: '#e74c3c' },
  will_get:   { bg: '#2a2200',      border: '#b8860b', text: '#f9cf4f' },
  got_it:     { bg: '#1a2a1a',      border: '#27ae60', text: '#4fcc8a' },
  provided:   { bg: '#1a1f2e',      border: '#2980b9', text: '#4f9cf9' },
  shared:     { bg: '#231a2e',      border: '#8e44ad', text: '#c97ff9' },
  dont_need:  { bg: '#1a1a1a',      border: '#555',    text: '#666'    },
}

const hasQty = computed(() => props.status === 'provided' || props.status === 'shared')
const label = computed(() => LABELS[props.status] ?? props.status)
const quantity = computed(() => props.quantity ?? 1)

const activeStyle = computed(() => {
  const s = STATUS_COLORS[props.status] ?? STATUS_COLORS['']
  return { background: s.bg, borderColor: s.border, color: s.text }
})

const statusClass = computed(() => ({
  'is-empty': !props.status,
  'is-dont-need': props.status === 'dont_need',
}))

function cycle() {
  const idx = CYCLE.indexOf(props.status)
  const next = CYCLE[(idx + 1) % CYCLE.length]
  emit('change', next)
  if ((next === 'provided' || next === 'shared') && !props.quantity) {
    emit('quantityChange', 1)
  }
}

function changeQty(delta: number) {
  const next = Math.max(1, Math.min(20, quantity.value + delta))
  emit('quantityChange', next)
}
</script>

<style scoped>
.cycle-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
}

.cycle-row {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 2px;
}

.cycle-btn {
  flex: 1;
  height: 60px;
  border-radius: 6px;
  border: 1px solid #2a2d3e;
  font-size: 0.88rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: all 0.12s;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
}
.cycle-btn:hover { filter: brightness(1.2); }
.cycle-btn.is-empty { color: #8b92a8; }
.cycle-btn.is-dont-need { text-decoration: line-through; }

.qty-btn {
  width: 32px;
  height: 60px;
  border-radius: 4px;
  border: 1px solid #2a2d3e;
  background: #1a1d2e;
  color: #8b92a8;
  font-size: 0.9rem;
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.12s;
  cursor: pointer;
}
.qty-btn:hover { border-color: #4a4f6a; color: #e8eaf0; }

.qty-count {
  font-size: 0.72rem;
  font-weight: 600;
}
</style>
