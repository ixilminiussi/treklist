<template>
  <div class="cell-wrap" @click="cycle">
    <button v-if="status" class="status-btn" :style="style">{{ LABELS[status] }}</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: string }>()
const emit = defineEmits<{ change: [string] }>()

const CYCLE = ['need', 'got_it', 'shared', 'provided']

const LABELS: Record<string, string> = {
  need: 'Need it',
  got_it: 'Got it',
  shared: 'Shared',
  provided: 'Provided',
}

const COLORS: Record<string, { bg: string; border: string; text: string }> = {
  need:     { bg: '#2a1a1a', border: '#c0392b', text: '#e74c3c' },
  got_it:   { bg: '#1a2a1a', border: '#27ae60', text: '#4fcc8a' },
  shared:   { bg: '#231a2e', border: '#8e44ad', text: '#c97ff9' },
  provided: { bg: '#1a1f2e', border: '#2980b9', text: '#4f9cf9' },
}

const style = computed(() => {
  const c = COLORS[props.status]
  return c ? { background: c.bg, borderColor: c.border, color: c.text } : {}
})

function cycle() {
  const idx = CYCLE.indexOf(props.status)
  if (idx === -1) {
    emit('change', CYCLE[0])
  } else if (idx === CYCLE.length - 1) {
    emit('change', '')
  } else {
    emit('change', CYCLE[idx + 1])
  }
}
</script>

<style scoped>
.cell-wrap {
  width: 100%;
  height: 100%;
  min-height: 88px;
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
}

.status-btn {
  width: 100%;
  height: 60px;
  border-radius: 6px;
  border: 1px solid;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  pointer-events: none;
}
</style>
