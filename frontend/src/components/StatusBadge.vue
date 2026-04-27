<template>
  <div class="badge-wrap">
    <span v-if="status" class="badge" :style="badgeStyle">{{ LABELS[status] ?? status }}</span>
    <span v-else class="badge empty">—</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: string; color: string }>()

const LABELS: Record<string, string> = {
  need: 'Need', will_get: 'Will get', got_it: 'Got it',
  provided: 'Provided', shared: 'Shared', dont_need: 'Skip',
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '':         { bg: 'transparent',  border: '#2a2d3e', text: '#8b92a8' },
  need:       { bg: '#2a1a1a',      border: '#c0392b', text: '#e74c3c' },
  will_get:   { bg: '#2a2200',      border: '#b8860b', text: '#f9cf4f' },
  got_it:     { bg: '#1a2a1a',      border: '#27ae60', text: '#4fcc8a' },
  provided:   { bg: '#1a1f2e',      border: '#2980b9', text: '#4f9cf9' },
  shared:     { bg: '#231a2e',      border: '#8e44ad', text: '#c97ff9' },
  dont_need:  { bg: '#1a1a1a',      border: '#555',    text: '#666'    },
}

const badgeStyle = computed(() => {
  const s = STATUS_COLORS[props.status] ?? STATUS_COLORS['']
  return { background: s.bg, borderColor: s.border, color: s.text }
})
</script>

<style scoped>
.badge-wrap { width: 100%; display: flex; justify-content: center; }
.badge {
  display: block;
  width: 100%;
  height: 60px;
  line-height: 60px;
  text-align: center;
  border-radius: 6px;
  border: 1px solid;
  font-size: 0.88rem;
  font-weight: 600;
}
.badge.empty { border-color: #1e2030; color: #333; }
</style>
