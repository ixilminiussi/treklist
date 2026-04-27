<template>
  <div v-if="loading" class="center-msg">loading trek…</div>
  <div v-else-if="!store.trek" class="center-msg">trek not found</div>
  <div v-else class="trek-layout">

    <!-- top header -->
    <header class="trek-header">
      <div class="trek-info">
        <span class="trek-name">{{ store.trek.name }}</span>
        <span class="trek-meta">{{ store.trek.trek_type }} · {{ store.trek.camping || 'any camp' }} · {{ store.trek.weather }}</span>
      </div>
      <div class="trek-code" @click="copyCode" title="click to copy">{{ store.trek.code }}</div>
      <div class="trekkers-pills">
        <div v-for="t in store.trekkers" :key="t.id" class="trekker-pill" :class="{ me: t.id === store.myTrekker?.id }">
          <span class="trekker-dot" :style="{ background: t.color }" />
          <span>{{ t.display_name }}</span>
          <span class="trekker-weight">{{ (store.bagWeight(t.id) / 1000).toFixed(1) }}kg</span>
          <button v-if="isCreator && t.id !== store.myTrekker?.id" class="kick-btn" @click="kick(t.id)">✕</button>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost btn-sm" @click="tab = tab === 'bag' ? 'checklist' : 'bag'">
          {{ tab === 'bag' ? '← checklist' : 'bag view' }}
        </button>
        <button v-if="isCreator" class="btn btn-danger btn-sm" @click="closeTrek">close trek</button>
      </div>
    </header>

    <!-- checklist -->
    <div v-if="tab === 'checklist'" class="checklist-area">
      <table class="checklist-table">
        <thead>
          <tr>
            <th class="th-name">item</th>
            <th
              v-for="t in store.trekkers" :key="t.id"
              class="th-trekker"
              :class="{ mine: t.id === store.myTrekker?.id }"
              :style="{ borderBottom: `3px solid ${t.color}` }"
            >{{ t.display_name }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="entry in allRows" :key="entry.key">
            <tr v-if="entry.type === 'category'" class="category-row">
              <td :colspan="1 + store.trekkers.length" class="category-label">{{ entry.name }}</td>
            </tr>
            <tr v-else-if="entry.type === 'custom-add'" class="add-row">
              <td :colspan="1 + store.trekkers.length" class="add-custom-cell">
                <input v-model="newItemName" placeholder="add an item…" @keyup.enter="addCustom" />
                <button class="btn btn-ghost btn-sm" @click="addCustom">add</button>
              </td>
            </tr>
            <tr v-else class="item-row">
              <td class="td-name">
                <div class="td-name-inner">
                  <span class="item-name">{{ entry.name }}</span>
                  <span v-if="itemGrams(entry.name)" class="item-grams">{{ itemGrams(entry.name) }}g</span>
                  <button class="ann-btn" @click="openAnnotation(entry.name)">
                    <span v-if="annotationsFor(entry.name).length" class="ann-dot" />💬
                  </button>
                </div>
              </td>
              <td
                v-for="t in store.trekkers" :key="t.id"
                class="td-status"
                :class="{ mine: t.id === store.myTrekker?.id }"
              >
                <StatusPicker
                  v-if="t.id === store.myTrekker?.id"
                  :item="entry.name"
                  :status="store.myStatuses[entry.name] ?? ''"
                  :color="t.color"
                  :quantity="myProvisionQty(entry.name)"
                  @change="onStatusChange(entry.name, $event)"
                  @quantity-change="onQuantityChange(entry.name, $event)"
                />
                <StatusBadge v-else :status="statusOf(t.id, entry.name)" :color="t.color" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- bag view -->
    <div v-else-if="tab === 'bag'" class="bag-area">
      <div class="bag-title">
        <h2>bag weights</h2>
        <div class="wip-badge">WIP · animated bag coming soon</div>
      </div>
      <div class="trekker-tabs">
        <button v-for="t in store.trekkers" :key="t.id" class="trekker-tab" :class="{ active: bagTab === t.id }" :style="bagTab === t.id ? { borderColor: t.color, color: t.color } : {}" @click="bagTab = t.id">
          {{ t.display_name }} · {{ (store.bagWeight(t.id)/1000).toFixed(1) }}kg
        </button>
      </div>
      <div v-if="bagTab" class="treemap">
        <div v-for="item in bagItems(bagTab)" :key="item.name" class="treemap-cell" :style="{ flexBasis: item.pct + '%', background: bagTabColor + '22', borderColor: bagTabColor }">
          <span class="treemap-name">{{ item.name }}</span>
          <span class="treemap-g">{{ item.grams }}g</span>
          <input v-if="bagTab === store.myTrekker?.id" type="number" class="weight-input" :value="item.grams" @change="setWeight(item.name, +($event.target as HTMLInputElement).value)" min="0" />
        </div>
      </div>
    </div>

    <!-- annotation modal -->
    <div v-if="annotationItem" class="modal-backdrop" @click.self="annotationItem = null">
      <div class="modal">
        <h3>notes on {{ annotationItem }}</h3>
        <div class="annotation-list">
          <div v-for="a in annotationsFor(annotationItem)" :key="a.id" class="annotation">
            <span class="ann-author" :style="{ color: trekkerColor(a.trekker_id) }">{{ trekkerName(a.trekker_id) }}</span>
            <span class="ann-body">{{ a.body }}</span>
            <button v-if="a.trekker_id === store.myTrekker?.id" class="btn btn-ghost btn-sm" @click="deleteAnnotation(a.id)">✕</button>
          </div>
          <div v-if="!annotationsFor(annotationItem).length" class="ann-empty">no notes yet</div>
        </div>
        <div class="ann-compose">
          <input v-model="newAnnotation" placeholder="add a note…" @keyup.enter="submitAnnotation" />
          <button class="btn btn-primary btn-sm" @click="submitAnnotation">post</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrekStore } from '../stores/trek'
import { useAuthStore } from '../stores/auth'
import StatusPicker from '../components/StatusPicker.vue'
import StatusBadge from '../components/StatusBadge.vue'

const route = useRoute()
const router = useRouter()
const store = useTrekStore()
const auth = useAuthStore()

const loading = ref(true)
const tab = ref<'checklist' | 'bag'>('checklist')
const bagTab = ref('')
const annotationItem = ref<string | null>(null)
const newAnnotation = ref('')
const newItemName = ref('')

const code = route.params.code as string

onUnmounted(() => store.stopPolling())

onMounted(async () => {
  try {
    await store.loadTrek(code)
    if (store.trekkers.length) bagTab.value = store.trekkers[0].id
  } finally {
    loading.value = false
  }
})

const isCreator = computed(() => !!auth.user && store.trek?.creator_id === auth.user.id)
const bagTabColor = computed(() => store.trekkers.find(t => t.id === bagTab.value)?.color ?? '#4f9cf9')

// flat list of rows for both columns to iterate in sync
const allRows = computed(() => {
  const rows: { key: string; type: string; name: string }[] = []
  for (const entry of store.filteredChecklist()) {
    rows.push({ key: entry.name, type: entry.type, name: entry.name })
  }
  rows.push({ key: '__custom_cat', type: 'category', name: 'Custom' })
  for (const ci of store.customItems) {
    rows.push({ key: ci.id, type: 'item', name: ci.name })
  }
  rows.push({ key: '__add', type: 'custom-add', name: '' })
  return rows
})

function statusOf(trekkerId: string, itemName: string) {
  return store.statuses.find(s => s.trekker_id === trekkerId && s.item_name === itemName)?.status ?? ''
}

function annotationsFor(itemName: string) {
  return store.annotations.filter(a => a.item_name === itemName)
}

function trekkerName(id: string) { return store.trekkerMap[id]?.display_name ?? '?' }
function trekkerColor(id: string) { return store.trekkerMap[id]?.color ?? '#8b92a8' }

function itemGrams(itemName: string) {
  return store.trekkerWeights.find(w => w.trekker_id === store.myTrekker?.id && w.item_name === itemName)?.custom_grams
    ?? store.defaultWeights[itemName]
    ?? 0
}

function myProvisionQty(itemName: string) {
  return store.provisions.find(p => p.item_name === itemName && p.trekker_id === store.myTrekker?.id)?.quantity
}

function bagItems(trekkerId: string) {
  const active = store.statuses.filter(s =>
    s.trekker_id === trekkerId && ['got_it', 'provided', 'will_get'].includes(s.status)
  )
  const total = store.bagWeight(trekkerId) || 1
  return active.map(s => {
    const grams = store.trekkerWeights.find(w => w.trekker_id === trekkerId && w.item_name === s.item_name)?.custom_grams
      ?? store.defaultWeights[s.item_name] ?? 0
    return { name: s.item_name, grams, pct: Math.max((grams / total) * 100, 3) }
  }).filter(i => i.grams > 0).sort((a, b) => b.grams - a.grams)
}

async function onStatusChange(itemName: string, status: string) {
  await store.setStatus(itemName, status)
  // If cycling away from provided/shared, remove the provision
  if (status !== 'provided' && status !== 'shared') {
    const existing = store.provisions.find(p => p.item_name === itemName && p.trekker_id === store.myTrekker?.id)
    if (existing) {
      store.provisions.splice(store.provisions.indexOf(existing), 1)
    }
  }
}

async function onQuantityChange(itemName: string, quantity: number) {
  const { treksApi } = await import('../api/treks')
  const status = store.myStatuses[itemName]
  const type = status === 'shared' ? 'shared' : 'provided'
  const res = await treksApi.upsertProvision(code, itemName, type, quantity)
  const idx = store.provisions.findIndex(p => p.item_name === itemName && p.trekker_id === store.myTrekker?.id)
  if (idx >= 0) store.provisions[idx].quantity = quantity
  else store.provisions.push({ id: res.provision_id, trekker_id: store.myTrekker!.id, item_name: itemName, type, quantity, claims: [] })
}

function openAnnotation(itemName: string) { annotationItem.value = itemName }

async function submitAnnotation() {
  if (!newAnnotation.value || !annotationItem.value) return
  const { treksApi } = await import('../api/treks')
  await treksApi.annotate(code, annotationItem.value, newAnnotation.value)
  newAnnotation.value = ''
}

async function deleteAnnotation(id: string) {
  const { treksApi } = await import('../api/treks')
  await treksApi.deleteAnnotation(code, id)
}

async function addCustom() {
  if (!newItemName.value) return
  const { treksApi } = await import('../api/treks')
  await treksApi.addCustomItem(code, newItemName.value)
  newItemName.value = ''
}

async function setWeight(itemName: string, grams: number) {
  const { treksApi } = await import('../api/treks')
  await treksApi.setWeight(code, itemName, grams)
  const idx = store.trekkerWeights.findIndex(w => w.trekker_id === store.myTrekker?.id && w.item_name === itemName)
  if (idx >= 0) store.trekkerWeights[idx].custom_grams = grams
  else store.trekkerWeights.push({ trekker_id: store.myTrekker!.id, item_name: itemName, custom_grams: grams })
}

async function kick(trekkerId: string) {
  const { treksApi } = await import('../api/treks')
  await treksApi.kick(code, trekkerId)
}

async function closeTrek() {
  if (!confirm('Close this trek? It will be archived.')) return
  const { treksApi } = await import('../api/treks')
  await treksApi.close(code)
  router.push('/')
}

function copyCode() { navigator.clipboard.writeText(store.trek?.code ?? '') }
</script>

<style scoped>
.center-msg { text-align: center; padding: 4rem; color: #8b92a8; }

.trek-layout {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px);
  overflow: hidden;
}

/* top header */
.trek-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.6rem 1.25rem;
  border-bottom: 1px solid #1e2030;
  background: #0f1117;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.trek-info { display: flex; flex-direction: column; gap: 0.1rem; }
.trek-name { font-weight: 700; font-size: 0.95rem; }
.trek-meta { font-size: 0.72rem; color: #8b92a8; }

.trek-code {
  font-family: monospace;
  font-size: 1.1rem;
  letter-spacing: 0.2em;
  color: #4f9cf9;
  cursor: pointer;
  user-select: all;
  flex-shrink: 0;
}

.trekkers-pills {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex: 1;
}
.trekker-pill {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
  border: 1px solid #2a2d3e;
  font-size: 0.8rem;
}
.trekker-pill.me { background: #1a1d2e; border-color: #3a3f5a; }
.trekker-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.trekker-weight { font-size: 0.72rem; color: #8b92a8; }
.kick-btn { background: none; border: none; color: #8b92a8; cursor: pointer; font-size: 0.7rem; padding: 0 0.1rem; line-height: 1; }
.kick-btn:hover { color: #e05252; }

.header-actions { display: flex; gap: 0.5rem; align-items: center; margin-left: auto; }

/* checklist table */
.checklist-area { flex: 1; overflow: auto; min-height: 0; }

.checklist-table {
  border-collapse: collapse;
  table-layout: auto;
}

/* header */
.th-name {
  position: sticky; top: 0; left: 0; z-index: 20;
  background: #0f1117;
  text-align: right;
  white-space: nowrap;
  padding: 0.6rem 0.5rem;
  font-size: 0.72rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: #8b92a8;
  border-bottom: 1px solid #1e2030;
}

.th-trekker {
  position: sticky; top: 0; z-index: 10;
  background: #0f1117;
  width: 300px;
  min-width: 300px;
  text-align: center;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem; font-weight: 600;
  border-bottom: 1px solid #1e2030;
}
.th-trekker.mine { background: #0a0d1a; }

/* category rows */
.category-row td { background: #0f1117; }
.category-label {
  padding: 0.5rem 0.5rem 0.25rem;
  font-size: 0.7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: #8b92a8;
  border-bottom: 1px solid #1a1d2e;
}

/* item rows */
.item-row:hover .td-name { background: #141620; }

.td-name {
  position: sticky; left: 0; z-index: 5;
  background: #0f1117;
  white-space: nowrap;
  text-align: right;
  padding: 0.5rem 0.5rem;
  border-bottom: 1px solid #141620;
  height: 88px;
}
.item-row:hover .td-name { background: #141620; }

.td-name-inner {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 0.4rem; height: 100%;
}

.item-name { font-size: 0.88rem; }
.item-grams { font-size: 0.7rem; color: #444; white-space: nowrap; }

.ann-btn {
  background: none; border: none; cursor: pointer;
  font-size: 0.75rem; position: relative;
  opacity: 0.3; transition: opacity 0.12s; padding: 0.15rem;
  flex-shrink: 0;
}
.ann-btn:hover { opacity: 1; }
.ann-dot {
  position: absolute; top: 0; right: 0;
  width: 5px; height: 5px; border-radius: 50%; background: #f97f4f;
}

.td-status {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #141620;
  border-left: 1px solid #141620;
  vertical-align: middle;
}
.td-status.mine { background: #0a0d1a; }

/* add row */
.add-row td { border-top: 1px solid #1e2030; }
.add-custom-cell {
  display: flex; gap: 0.5rem;
  padding: 0.75rem 0.5rem;
}
.add-custom-cell input { flex: 1; min-width: 0; }

/* bag view */
.bag-area { flex: 1; overflow-y: auto; padding: 1.5rem; min-height: 0; }
.bag-title { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.bag-title h2 { font-size: 1.1rem; font-weight: 700; }
.wip-badge { font-size: 0.75rem; color: #f9cf4f; background: #2a2200; border: 1px solid #f9cf4f44; border-radius: 4px; padding: 0.2rem 0.5rem; }
.trekker-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
.trekker-tab { background: transparent; border: 1px solid #2a2d3e; border-radius: 20px; padding: 0.35rem 0.85rem; font-size: 0.8rem; color: #8b92a8; cursor: pointer; transition: all 0.15s; }
.trekker-tab.active { color: inherit; }
.treemap { display: flex; flex-wrap: wrap; gap: 0.5rem; align-content: flex-start; }
.treemap-cell { border: 1px solid; border-radius: 6px; padding: 0.5rem 0.75rem; display: flex; flex-direction: column; gap: 0.25rem; min-width: 80px; }
.treemap-name { font-size: 0.8rem; font-weight: 600; }
.treemap-g { font-size: 0.7rem; color: #8b92a8; }
.weight-input { width: 60px; background: transparent; border: 1px solid #2a2d3e; border-radius: 4px; padding: 0.15rem 0.3rem; font-size: 0.75rem; color: #e8eaf0; }

/* modals */
.modal-backdrop { position: fixed; inset: 0; background: #00000088; display: flex; align-items: center; justify-content: center; z-index: 200; }
.modal { background: #141620; border: 1px solid #1e2030; border-radius: 12px; padding: 1.5rem; min-width: 340px; max-width: 480px; display: flex; flex-direction: column; gap: 1rem; }
.modal h3 { font-size: 1rem; font-weight: 600; }
.annotation-list { display: flex; flex-direction: column; gap: 0.75rem; max-height: 240px; overflow-y: auto; }
.annotation { display: flex; align-items: flex-start; gap: 0.5rem; }
.ann-author { font-size: 0.75rem; font-weight: 600; min-width: 60px; }
.ann-body { flex: 1; font-size: 0.9rem; }
.ann-empty { color: #8b92a8; font-size: 0.85rem; }
.ann-compose { display: flex; gap: 0.5rem; }
.ann-compose input { flex: 1; }
</style>
