<template>
  <div v-if="provisions.length" class="chips">
    <template v-for="prov in provisions" :key="prov.id">
      <!-- provided: draggable chips for each unit -->
      <template v-if="prov.type === 'provided'">
        <div
          v-for="n in prov.quantity"
          :key="n"
          class="chip provided"
          :class="{
            claimed: isClaimed(prov, n),
            mine: claimedByMe(prov, n),
            draggable: editable && !isClaimed(prov, n),
          }"
          :draggable="editable && !isClaimed(prov, n)"
          :title="chipTitle(prov, n)"
          @click="onChipClick(prov, n)"
        >
          {{ isClaimed(prov, n) ? '✓' : '○' }}
        </div>
      </template>

      <!-- shared: slots to join/leave -->
      <template v-else>
        <div
          v-for="n in prov.quantity"
          :key="n"
          class="chip shared"
          :class="{ filled: isSlotFilled(prov, n), mine: isMySlot(prov, n) }"
          :title="slotTitle(prov, n)"
          @click="onSlotClick(prov, n)"
        >
          {{ isSlotFilled(prov, n) ? '◉' : '○' }}
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Provision } from '../stores/trek'

const props = defineProps<{
  provisions: Provision[]
  myTrekkerId: string
  itemName: string
  editable?: boolean
}>()

const emit = defineEmits<{
  claim: [provisionId: string]
  unclaim: [provisionId: string]
}>()

function isClaimed(prov: Provision, n: number) {
  return prov.claims.length >= n
}

function claimedByMe(prov: Provision, n: number) {
  return prov.claims.some(c => c.claimed_by === props.myTrekkerId) && prov.claims.findIndex(c => c.claimed_by === props.myTrekkerId) < n
}

function isSlotFilled(prov: Provision, n: number) {
  return prov.claims.length >= n
}

function isMySlot(prov: Provision, n: number) {
  return prov.claims[n - 1]?.claimed_by === props.myTrekkerId
}

function chipTitle(prov: Provision, n: number) {
  return isClaimed(prov, n) ? 'claimed' : 'click to claim'
}

function slotTitle(prov: Provision, n: number) {
  return isSlotFilled(prov, n) ? (isMySlot(prov, n) ? 'you — click to leave' : 'taken') : 'click to join'
}

function onChipClick(prov: Provision, n: number) {
  if (props.editable) return
  if (claimedByMe(prov, n)) emit('unclaim', prov.id)
  else if (!isClaimed(prov, n)) emit('claim', prov.id)
}

function onSlotClick(prov: Provision, n: number) {
  if (isMySlot(prov, n)) emit('unclaim', prov.id)
  else if (!isSlotFilled(prov, n)) emit('claim', prov.id)
}
</script>

<style scoped>
.chips { display: flex; flex-wrap: wrap; gap: 0.2rem; justify-content: center; }
.chip {
  width: 20px; height: 20px;
  border-radius: 3px;
  border: 1px solid #2a2d3e;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.65rem;
  cursor: pointer;
  transition: all 0.12s;
  color: #8b92a8;
}
.chip:hover { border-color: #4a4f6a; }
.chip.claimed, .chip.filled { background: #1e2d20; border-color: #4fcc8a55; color: #4fcc8a; }
.chip.mine { background: #1a2a3a; border-color: #4f9cf9; color: #4f9cf9; }
.chip.draggable { cursor: grab; }
</style>
