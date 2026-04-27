<template>
  <div class="prov-wrap">
    <div class="prov-type">{{ provision.type === 'shared' ? 'shared' : 'providing' }}</div>
    <div class="slots">
      <button
        v-for="n in provision.quantity"
        :key="n"
        class="slot"
        :class="slotClass(n)"
        :title="slotTitle(n)"
        :disabled="isDisabled(n)"
        @click="onSlotClick(n)"
      >
        <span class="slot-inner" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Provision } from '../stores/trek'

const props = defineProps<{
  provision: Provision
  myTrekkerId: string
  color: string
}>()

const emit = defineEmits<{
  claim: [provisionId: string]
  unclaim: [provisionId: string]
}>()

function claimAtSlot(n: number) {
  return props.provision.claims[n - 1] ?? null
}

function isMineAtSlot(n: number) {
  return claimAtSlot(n)?.claimed_by === props.myTrekkerId
}

function isFilled(n: number) {
  return !!claimAtSlot(n)
}

function myClaimedSlot() {
  return props.provision.claims.findIndex(c => c.claimed_by === props.myTrekkerId) + 1
}

function slotClass(n: number) {
  return {
    'filled': isFilled(n),
    'mine': isMineAtSlot(n),
    'empty': !isFilled(n),
  }
}

function slotTitle(n: number) {
  if (isMineAtSlot(n)) return 'yours — click to leave'
  if (isFilled(n)) return 'taken'
  return props.provision.type === 'provided' ? 'click to take' : 'click to join'
}

function isDisabled(n: number) {
  // Can't claim if already have one (for shared: can only occupy 1 slot)
  const mine = myClaimedSlot()
  if (mine > 0 && !isMineAtSlot(n)) return true
  // Can't claim a filled slot that isn't mine
  if (isFilled(n) && !isMineAtSlot(n)) return true
  return false
}

function onSlotClick(n: number) {
  if (isMineAtSlot(n)) {
    emit('unclaim', props.provision.id)
  } else if (!isFilled(n)) {
    emit('claim', props.provision.id)
  }
}
</script>

<style scoped>
.prov-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
}

.prov-type {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8b92a8;
}

.slots {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.slot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #2a2d3e;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 0;
}

.slot.empty:not(:disabled):hover {
  border-color: v-bind(color);
  background: v-bind('color + "22"');
}

.slot.filled {
  border-color: #2a2d3e;
  background: #1e2030;
  cursor: default;
}

.slot.mine {
  border-color: v-bind(color);
  background: v-bind('color + "33"');
  cursor: pointer;
}

.slot:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.slot-inner {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #2a2d3e;
  transition: background 0.15s;
}
.slot.filled .slot-inner { background: #4a4f6a; }
.slot.mine .slot-inner { background: v-bind(color); }
</style>
