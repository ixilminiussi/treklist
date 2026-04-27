<template>
  <div class="status-picker">
    <button
      v-for="s in statuses"
      :key="s.value"
      class="status-btn"
      :class="{ active: status === s.value }"
      :style="status === s.value ? { background: color + '33', borderColor: color, color } : {}"
      :title="s.label"
      @click="pick(s.value)"
    >{{ s.icon }}</button>
    <button v-if="status === 'provided' || status === 'shared'" class="status-btn provision-btn" :style="{ color }" @click="$emit('provision')">
      ⚙
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ item: string; status: string; color: string }>()
const emit = defineEmits<{ change: [string]; provision: [] }>()

const statuses = [
  { value: 'need',      icon: '?',  label: 'need' },
  { value: 'will_get',  icon: '→',  label: 'will get' },
  { value: 'got_it',   icon: '✓',  label: 'got it' },
  { value: 'provided', icon: '↗',  label: 'provided (to others)' },
  { value: 'shared',   icon: '⟳',  label: 'shared (group)' },
  { value: 'dont_need',icon: '✕',  label: "don't need" },
]

function pick(val: string) {
  if ((val === 'provided' || val === 'shared') && val !== undefined) {
    emit('change', val)
    emit('provision')
  } else {
    emit('change', val)
  }
}
</script>

<style scoped>
.status-picker { display: flex; gap: 0.2rem; flex-wrap: wrap; justify-content: center; }
.status-btn {
  width: 26px; height: 26px;
  border-radius: 4px;
  border: 1px solid #2a2d3e;
  background: transparent;
  color: #8b92a8;
  font-size: 0.75rem;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.12s;
}
.status-btn:hover { border-color: #4a4f6a; color: #e8eaf0; }
.status-btn.active { font-weight: 700; }
.provision-btn { font-size: 0.9rem; }
</style>
