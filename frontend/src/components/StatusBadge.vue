<template>
  <span v-if="status" class="badge" :style="{ background: color + '22', color, borderColor: color + '55' }">
    {{ icons[status] ?? status }}
  </span>
</template>

<script setup lang="ts">
defineProps<{ status: string; color: string }>()
const icons: Record<string, string> = {
  need: '?', will_get: '→', got_it: '✓', provided: '↗', shared: '⟳', dont_need: '✕',
}
</script>

<style scoped>
.badge {
  font-size: 0.75rem;
  border: 1px solid;
  border-radius: 4px;
  padding: 0.15rem 0.4rem;
  font-weight: 600;
}
</style>
