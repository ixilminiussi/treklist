<template>
  <SlotCapsule
    v-if="provision && (status === 'provided' || status === 'shared') && provision.quantity > 0"
    :provision="provision"
    :trekker-colors="trekkerColors"
    :my-trekker-id="myTrekkerId"
    :is-owner="true"
    @add-slot="$emit('addSlot')"
    @remove-slot="$emit('removeSlot')"
    @claim="$emit('claim', $event)"
    @unclaim="$emit('unclaim', $event)"
  />
  <div
    v-else
    class="cycle-wrap"
    :class="{ 'has-slots-ctrl': status === 'provided' || status === 'shared' }"
  >
    <div v-if="status === 'provided' || status === 'shared'" class="slot-controls">
      <button class="ctrl-btn" @click.stop="$emit('addSlot')">+</button>
      <button class="ctrl-btn" @click.stop="$emit('removeSlot')">−</button>
    </div>
    <button
      class="cycle-btn"
      :style="activeStyle"
      :class="{ 'is-dont-need': status === 'dont_need' || status === '' }"
      @click="cycle"
    >{{ label }}</button>
  </div>
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
  '': "don't need",
  need: 'Need', will_get: 'Will get', got_it: 'Got it',
  provided: 'Provided', shared: 'Shared', dont_need: "don't need",
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '':         { bg: '#1a1a1a', border: '#333', text: '#555e78' },
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
.cycle-wrap {
  position: relative;
  width: 100%;
  height: 60px;
}

.slot-controls {
  position: absolute;
  top: -12px;
  right: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s;
}
.cycle-wrap.has-slots-ctrl:hover .slot-controls {
  opacity: 1;
  pointer-events: all;
}
.ctrl-btn {
  width: 20px; height: 20px;
  border-radius: 4px;
  border: 1px solid #3a3f5a;
  background: #1a1d2e;
  color: #8b92a8;
  font-size: 0.85rem; line-height: 1;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.12s;
}
.ctrl-btn:hover { border-color: #e8eaf0; color: #e8eaf0; background: #2a2d3e; }

.cycle-btn {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  border: 1px solid #2a2d3e;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s;
}
.cycle-btn:hover { filter: brightness(1.3); }
.cycle-btn.is-dont-need { text-decoration: line-through; font-size: 0.78rem; }
</style>
