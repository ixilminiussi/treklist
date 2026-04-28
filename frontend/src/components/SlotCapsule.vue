<template>
  <div class="capsule-wrap" :class="{ 'is-owner': isOwner }">
    <div
      class="capsule"
      :class="{ provided: provision.type === 'provided', shared: provision.type === 'shared' }"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <div
        v-for="n in provision.quantity"
        :key="n"
        class="slot"
        :class="{
          empty: !claimerAt(n),
          filled: !!claimerAt(n),
          mine: isMineAt(n),
          draggable: isMineAt(n),
        }"
        :style="slotStyle(n)"
        :draggable="isMineAt(n)"
        @click="onSlotClick(n)"
        @dragstart="onDragStart(n, $event)"
        @dragend="onDragEnd"
      />
    </div>

    <!-- +/- on the right, hover-only, owner-only -->
    <div v-if="isOwner" class="slot-controls">
      <button class="ctrl-btn" @click.stop="$emit('addSlot')">+</button>
      <button class="ctrl-btn" @click.stop="$emit('removeSlot')">−</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Provision } from '../stores/trek'

const props = defineProps<{
  provision: Provision
  trekkerColors: Record<string, string>  // trekker_id → color
  myTrekkerId: string
  isOwner: boolean
}>()

const emit = defineEmits<{
  addSlot: []
  removeSlot: []
  claim: [provisionId: string]
  unclaim: [provisionId: string]
}>()

function claimerAt(n: number): string | null {
  return props.provision.claims[n - 1]?.claimed_by ?? null
}

function isMineAt(n: number) {
  return claimerAt(n) === props.myTrekkerId
}

function hasMyClaim() {
  return props.provision.claims.some(c => c.claimed_by === props.myTrekkerId)
}

function slotStyle(n: number) {
  const claimer = claimerAt(n)
  if (!claimer) return {}
  const color = props.trekkerColors[claimer] ?? '#4a4f6a'
  return { background: color, borderColor: color }
}

function onSlotClick(n: number) {
  if (isMineAt(n)) {
    emit('unclaim', props.provision.id)
  } else if (!claimerAt(n) && !hasMyClaim()) {
    emit('claim', props.provision.id)
  }
}

let draggingSlot = -1

function onDragStart(n: number, e: DragEvent) {
  if (!isMineAt(n)) return
  draggingSlot = n
  e.dataTransfer!.setData('provision_id', props.provision.id)
  e.dataTransfer!.setData('action', 'unclaim')
  e.dataTransfer!.effectAllowed = 'move'
}

function onDragEnd() { draggingSlot = -1 }

function onDrop(e: DragEvent) {
  const action = e.dataTransfer?.getData('action')
  const pid = e.dataTransfer?.getData('provision_id')
  if (action === 'claim' && pid === props.provision.id && !hasMyClaim()) {
    emit('claim', props.provision.id)
  }
  if (action === 'unclaim' && pid === props.provision.id) {
    emit('unclaim', props.provision.id)
  }
}
</script>

<style scoped>
.capsule-wrap {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  width: 100%;
  position: relative;
}

/* +/- controls — hidden, shown on hover, on the right side */
.slot-controls {
  display: flex;
  flex-direction: column;
  gap: 3px;
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}
.capsule-wrap.is-owner:hover .slot-controls {
  opacity: 1;
  pointer-events: all;
}

.ctrl-btn {
  width: 24px; height: 24px;
  border-radius: 4px;
  border: 1px solid #2a2d3e;
  background: #1a1d2e;
  color: #8b92a8;
  font-size: 1rem; line-height: 1;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.12s;
}
.ctrl-btn:hover { border-color: #4a4f6a; color: #e8eaf0; }

/* capsule */
.capsule {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #2a2d3e;
  background: #141620;
  justify-content: center;
  min-width: 48px;
  transition: border-color 0.15s;
}
.capsule:empty { display: none; }

/* slots */
.slot {
  width: 28px; height: 28px;
  border-radius: 8px;
  border: 2px solid #2a2d3e;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.slot.empty:not(:disabled):hover {
  border-color: #4a4f6a;
  background: #1e2030;
}
.slot.filled { cursor: default; }
.slot.mine { cursor: grab; box-shadow: 0 0 0 2px #0f1117, 0 0 0 4px currentColor; }
.slot.mine:active { cursor: grabbing; }
.slot.draggable { cursor: grab; }
</style>
