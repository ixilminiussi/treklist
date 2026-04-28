<template>
  <div class="capsule-wrap" :class="{ 'is-owner': isOwner }">
    <!-- +/- overlaid on top-right, owner-only, hover-only -->
    <div v-if="isOwner" class="slot-controls">
      <button class="ctrl-btn" @click.stop="$emit('addSlot')">+</button>
      <button class="ctrl-btn" @click.stop="$emit('removeSlot')">−</button>
    </div>

    <div
      class="capsule"
      :class="provision.type"
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
        }"
        :style="slotStyle(n)"
        :draggable="isMineAt(n)"
        @click="onSlotClick(n)"
        @dragstart="onDragStart(n, $event)"
        @dragend="onDragEnd"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Provision } from '../stores/trek'

const props = defineProps<{
  provision: Provision
  trekkerColors: Record<string, string>
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
function isMineAt(n: number) { return claimerAt(n) === props.myTrekkerId }
function hasMyClaim() { return props.provision.claims.some(c => c.claimed_by === props.myTrekkerId) }

function slotStyle(n: number) {
  const claimer = claimerAt(n)
  if (!claimer) return {}
  const color = props.trekkerColors[claimer] ?? '#4a4f6a'
  return { background: color, borderColor: color }
}

function onSlotClick(n: number) {
  if (isMineAt(n)) emit('unclaim', props.provision.id)
  else if (!claimerAt(n) && !hasMyClaim()) emit('claim', props.provision.id)
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
  if (action === 'claim' && pid === props.provision.id && !hasMyClaim()) emit('claim', props.provision.id)
  if (action === 'unclaim' && pid === props.provision.id) emit('unclaim', props.provision.id)
}
</script>

<style scoped>
/* wrapper — same footprint as the cycle-btn */
.capsule-wrap {
  position: relative;
  width: 100%;
  height: 60px;
}

/* +/- overlay — top-right corner, hidden until hover */
.slot-controls {
  position: absolute;
  top: -10px;
  right: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s;
}
.capsule-wrap.is-owner:hover .slot-controls {
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

/* capsule — identical shape to cycle-btn */
.capsule {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  border: 1px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 0.75rem;
  box-sizing: border-box;
  flex-wrap: wrap;
  transition: filter 0.12s;
}
.capsule:hover { filter: brightness(1.2); }

.capsule.provided { background: #1a1f2e; border-color: #2980b9; }
.capsule.shared   { background: #231a2e; border-color: #8e44ad; }

/* slots — small circles inside the button */
.slot {
  width: 14px; height: 14px;
  border-radius: 50%;
  border: 2px solid currentColor;
  cursor: pointer;
  transition: all 0.12s;
  flex-shrink: 0;
}
.capsule.provided .slot { color: #2980b9; }
.capsule.shared   .slot { color: #8e44ad; }

.slot.filled { border-color: transparent; }
.slot.mine   { box-shadow: 0 0 0 1px #0f1117, 0 0 0 2px currentColor; }
.slot.mine:hover { filter: brightness(1.3); }
.slot.empty:hover { background: currentColor; opacity: 0.5; }
.slot.filled { cursor: default; }
</style>
