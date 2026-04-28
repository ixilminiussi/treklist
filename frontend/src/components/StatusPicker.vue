<template>
  <SlotCapsule
    v-if="provision && provision.quantity > 0 && (status === 'provided' || status === 'shared')"
    :provision="provision"
    :trekker-colors="trekkerColors"
    :my-trekker-id="myTrekkerId"
    :is-owner="true"
    @add-slot="$emit('addSlot')"
    @remove-slot="$emit('removeSlot')"
    @claim="$emit('claim', $event)"
    @unclaim="$emit('unclaim', $event)"
  />
  <button
    v-else
    class="cycle-btn"
    :style="activeStyle"
    :class="{ 'is-dont-need': status === 'dont_need' }"
    @click="cycle"
  >{{ label }}</button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SlotCapsule from './SlotCapsule.vue'
import type { Provision } from '../stores/trek'

const props = defineProps<{
  item: string
  status: string
  myTrekkerId: string
  trekkerColors: Record<string, string>
  provision?: Provision | null
}>()

const emit = defineEmits<{
  change: [string]
  addSlot: []
  removeSlot: []
  claim: [string]
  unclaim: [string]
}>()

const CYCLE = ['need', 'will_get', 'got_it', 'provided', 'shared', 'dont_need']

const LABELS: Record<string, string> = {
  need: 'Need', will_get: 'Will get', got_it: 'Got it',
  provided: 'Provided', shared: 'Shared', dont_need: 'Skip',
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '':         { bg: 'transparent', border: '#2a2d3e', text: '#8b92a8' },
  need:       { bg: '#2a1a1a',     border: '#c0392b', text: '#e74c3c' },
  will_get:   { bg: '#2a2200',     border: '#b8860b', text: '#f9cf4f' },
  got_it:     { bg: '#1a2a1a',     border: '#27ae60', text: '#4fcc8a' },
  provided:   { bg: '#1a1f2e',     border: '#2980b9', text: '#4f9cf9' },
  shared:     { bg: '#231a2e',     border: '#8e44ad', text: '#c97ff9' },
  dont_need:  { bg: '#1a1a1a',     border: '#555',    text: '#666'    },
}

const label = computed(() => LABELS[props.status] ?? '—')
const activeStyle = computed(() => {
  const s = STATUS_COLORS[props.status] ?? STATUS_COLORS['']
  return { background: s.bg, borderColor: s.border, color: s.text }
})

function cycle() {
  const idx = CYCLE.indexOf(props.status)
  const next = CYCLE[(idx + 1) % CYCLE.length]
  emit('change', next)
}
</script>

<style scoped>
.cycle-btn {
  width: 100%;
  height: 60px;
  border-radius: 6px;
  border: 1px solid #2a2d3e;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s;
}
.cycle-btn:hover { filter: brightness(1.2); }
.cycle-btn.is-dont-need { text-decoration: line-through; }
</style>
