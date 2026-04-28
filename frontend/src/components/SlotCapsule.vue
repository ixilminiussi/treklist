<template>
  <div class="capsule-wrap" :class="{ 'is-owner': isOwner }">

    <!-- +/- overlaid above top-right, always visible for owner -->
    <div v-if="isOwner" class="slot-controls">
      <button class="ctrl-btn" @click.stop="$emit('addSlot')">+</button>
      <button class="ctrl-btn" @click.stop="$emit('removeSlot')">−</button>
    </div>

    <!-- the button shell — identical styling to cycle-btn -->
    <div
      class="capsule"
      :class="provision.type"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <div
        v-for="n in provision.quantity"
        :key="n"
        class="slot-card"
        :class="{
          empty: !claimerAt(n),
          filled: !!claimerAt(n),
          mine: isMineAt(n),
        }"
        :style="cardStyle(n)"
        :draggable="canDrag(n)"
        @click="onSlotClick(n)"
        @dragstart="onDragStart(n, $event)"
        @dragend="onDragEnd"
      />
      <span v-if="provision.quantity === 0" class="empty-label">no slots</span>
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

// owner can drag their claimed slot away; others can drag unclaimed slots to claim
function canDrag(n: number) {
  if (props.isOwner) return isMineAt(n)
  return !claimerAt(n) && !hasMyClaim()
}

function cardStyle(n: number) {
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
  draggingSlot = n
  e.dataTransfer!.setData('provision_id', props.provision.id)
  // owner dragging their slot = unclaim; others dragging empty slot = claim
  e.dataTransfer!.setData('action', isMineAt(n) ? 'unclaim' : 'claim')
  e.dataTransfer!.effectAllowed = 'move'
}
function onDragEnd() { draggingSlot = -1 }

function onDrop(e: DragEvent) {
  const action = e.dataTransfer?.getData('action')
  const pid = e.dataTransfer?.getData('provision_id')
  if (pid !== props.provision.id) return
  if (action === 'claim' && !hasMyClaim()) emit('claim', pid)
  if (action === 'unclaim') emit('unclaim', pid)
}
</script>

<style scoped>
.capsule-wrap {
  position: relative;
  width: 100%;
  height: 60px;
}

/* +/- overlay above top-right */
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

/* button shell — matches cycle-btn exactly */
.capsule {
  width: 100%; height: 100%;
  border-radius: 6px;
  border: 1px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  box-sizing: border-box;
  transition: filter 0.12s;
}
.capsule.provided { background: #1a1f2e; border-color: #2980b9; }
.capsule.shared   { background: #231a2e; border-color: #8e44ad; }

/* slot cards — tall, fill height */
.slot-card {
  flex: 1;
  max-width: 48px;
  height: 100%;
  border-radius: 5px;
  border: 2px solid;
  cursor: pointer;
  transition: filter 0.12s, background 0.12s;
  box-sizing: border-box;
}
.capsule.provided .slot-card { border-color: #2980b9; }
.capsule.shared   .slot-card { border-color: #8e44ad; }

.slot-card.filled  { cursor: default; border-color: transparent; }
.slot-card.mine    { cursor: grab; filter: brightness(1.2); }
.slot-card.mine:active { cursor: grabbing; }
.slot-card.empty:hover { filter: brightness(1.4); }
.slot-card[draggable="true"] { cursor: grab; }

.empty-label {
  font-size: 0.72rem;
  color: #555e78;
}
</style>
