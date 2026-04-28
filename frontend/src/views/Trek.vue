<template>
  <div v-if="loading" class="center-msg">loading trek…</div>
  <div v-else-if="!store.trek" class="center-msg">trek not found</div>
  <div v-else class="trek-layout">

  <!-- identity gate — shown when we don't know who the user is -->
  <transition name="fade">
    <div v-if="needsIdentity" class="id-overlay">
      <div class="id-modal">
        <h2>who are you?</h2>
        <p class="id-sub">{{ store.trek.name }}</p>

        <!-- existing guests -->
        <template v-if="guestTrekkers.length > 0">
          <div class="id-section-label">returning guest</div>
          <div class="id-guest-list">
            <button
              v-for="gt in guestTrekkers" :key="gt.id"
              class="id-guest-btn" :class="{ selected: selectedGuestId === gt.id }"
              @click="selectedGuestId = gt.id"
            >
              <span class="id-dot" :style="{ background: gt.color }" />
              {{ gt.display_name }}
            </button>
          </div>
          <button class="btn btn-primary" :disabled="idLoading" @click="resumeAsGuest">
            {{ idLoading ? 'loading…' : 'continue as selected' }}
          </button>
          <div class="id-divider">or create a new profile</div>
        </template>

        <!-- new guest form -->
        <div class="id-form">
          <div class="field"><label>name</label><input v-model="guestName" placeholder="Trail name" /></div>
          <div class="field"><label>color</label>
            <div class="color-row">
              <button v-for="c in COLORS" :key="c" class="id-swatch"
                :class="{ active: guestColor === c }" :style="{ background: c }"
                @click="guestColor = c" />
            </div>
          </div>
          <div class="grid-2">
            <div class="field"><label>weight (kg)</label><input v-model.number="guestWeight" type="number" min="20" max="300" placeholder="70" /></div>
            <div class="field"><label>sex</label>
              <div class="radio-row">
                <label v-for="opt in SEX_OPTS" :key="opt.v" class="radio-label">
                  <input type="radio" :value="opt.v" v-model="guestSex" />{{ opt.l }}
                </label>
              </div>
            </div>
          </div>
          <div class="field"><label>date of birth <span class="opt">optional</span></label>
            <input v-model="guestBirthday" type="date" />
          </div>
          <div v-if="idError" class="error">{{ idError }}</div>
          <button class="btn btn-primary" :disabled="idLoading" @click="joinAsNewGuest">
            {{ idLoading ? 'joining…' : 'join trek' }}
          </button>
        </div>
      </div>
    </div>
  </transition>

    <!-- top header -->
    <header class="trek-header">
      <div class="trek-info">
        <span class="trek-name">{{ store.trek.name }}</span>
        <span class="trek-meta">{{ store.trek.trek_type }} · {{ store.trek.camping || 'any camp' }} · {{ store.trek.weather }}</span>
      </div>
      <div class="trek-code" @click="copyCode" title="click to copy">{{ store.trek.code }}</div>
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
            >
              {{ t.display_name }}
              <button
                v-if="isCreator && t.id !== store.myTrekker?.id"
                class="kick-btn"
                @click="kick(t.id)"
                title="kick"
              >✕</button>
            </th>
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
                @dragover.prevent
                @drop="onDropClaim($event)"
              >
                <StatusPicker
                  v-if="t.id === store.myTrekker?.id"
                  :item="entry.name"
                  :status="store.myStatuses[entry.name] ?? ''"
                  :my-trekker-id="store.myTrekker!.id"
                  :trekker-colors="trekkerColors"
                  :provision="myProvision(entry.name)"
                  @change="onStatusChange(entry.name, $event)"
                  @add-slot="onAddSlot(entry.name)"
                  @remove-slot="onRemoveSlot(entry.name)"
                  @claim="onClaim"
                  @unclaim="onUnclaim"
                />
                <StatusBadge
                  v-else
                  :status="statusOf(t.id, entry.name)"
                  :my-trekker-id="t.id"
                  :trekker-colors="trekkerColors"
                  :provision="provisionFor(t.id, entry.name)"
                  @claim="onClaim"
                  @unclaim="onUnclaim"
                />
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
import { treksApi } from '../api/treks'
import { useTrekStore } from '../stores/trek'
import { useAuthStore } from '../stores/auth'
import StatusPicker from '../components/StatusPicker.vue'
import StatusBadge from '../components/StatusBadge.vue'

const route = useRoute()
const router = useRouter()
const store = useTrekStore()
const auth = useAuthStore()

const COLORS = ['#4f9cf9','#f97f4f','#4fcc8a','#c97ff9','#f9cf4f','#f94f7f','#4ff9f0','#a0aec0']
const SEX_OPTS = [{ v: 'M', l: 'M' }, { v: 'F', l: 'F' }, { v: 'X', l: 'X' }]

const loading = ref(true)
const tab = ref<'checklist' | 'bag'>('checklist')
const bagTab = ref('')
const annotationItem = ref<string | null>(null)
const newAnnotation = ref('')
const newItemName = ref('')

// identity gate
const needsIdentity = ref(false)
const guestTrekkers = ref<{ id: string; display_name: string; color: string }[]>([])
const selectedGuestId = ref<string | null>(null)
const guestName = ref('')
const guestColor = ref(COLORS[0])
const guestWeight = ref<number | undefined>()
const guestSex = ref('')
const guestBirthday = ref('')
const idLoading = ref(false)
const idError = ref('')

const code = route.params.code as string

onUnmounted(() => store.stopPolling())

onMounted(async () => {
  try {
    await store.loadTrek(code)
    if (store.trekkers.length) bagTab.value = store.trekkers[0].id
    // if no recognised trekker for this trek, show identity gate
    const myId = store.myTrekker?.id
    const recognised = myId && store.trekkers.some(t => t.id === myId)
    if (!recognised && !auth.user) {
      guestTrekkers.value = store.trekkers.filter(t => !t.user_id)
      needsIdentity.value = true
    }
  } finally {
    loading.value = false
  }
})

async function resumeAsGuest() {
  if (!selectedGuestId.value) return
  idLoading.value = true; idError.value = ''
  try {
    const res = await treksApi.resumeGuest(code, selectedGuestId.value)
    store.persistMyTrekker(res.trekker, res.session_token)
    needsIdentity.value = false
  } catch { idError.value = 'could not resume — try joining fresh' }
  finally { idLoading.value = false }
}

async function joinAsNewGuest() {
  if (!guestName.value) { idError.value = 'name required'; return }
  idLoading.value = true; idError.value = ''
  try {
    await store.joinTrek(code, {
      guest_name: guestName.value,
      color: guestColor.value,
      weight_kg: guestWeight.value,
      sex: guestSex.value || undefined,
      birthday: guestBirthday.value || undefined,
    })
    needsIdentity.value = false
  } catch (e: any) { idError.value = e?.response?.data?.error ?? 'failed to join' }
  finally { idLoading.value = false }
}

const isCreator = computed(() => !!auth.user && store.trek?.creator_id === auth.user.id)
const bagTabColor = computed(() => store.trekkers.find(t => t.id === bagTab.value)?.color ?? '#4f9cf9')
const trekkerColors = computed(() =>
  Object.fromEntries(store.trekkers.map(t => [t.id, t.color]))
)

function myProvision(itemName: string) {
  return store.provisions.find(
    p => p.item_name === itemName && p.trekker_id === store.myTrekker?.id
  ) ?? null
}
function provisionFor(trekkerId: string, itemName: string) {
  return store.provisions.find(
    p => p.item_name === itemName && p.trekker_id === trekkerId
  ) ?? null
}

const LABELS: Record<string, string> = {
  need: 'Need it', got_it: 'Got it', shared: 'Shared', provided: 'Provided',
}
const STATUS_BG: Record<string, { bg: string; border: string; text: string }> = {
  need:     { bg: '#2a1a1a', border: '#c0392b', text: '#e74c3c' },
  got_it:   { bg: '#1a2a1a', border: '#27ae60', text: '#4fcc8a' },
  shared:   { bg: '#231a2e', border: '#8e44ad', text: '#c97ff9' },
  provided: { bg: '#1a1f2e', border: '#2980b9', text: '#4f9cf9' },
}

function otherLabel(trekkerId: string, itemName: string) {
  const status = statusOf(trekkerId, itemName)
  if (status === 'provided') {
    const provision = store.provisions.find(p => p.item_name === itemName && p.trekker_id === trekkerId)
    if (provision && provision.quantity > 0) {
      const name = store.trekkerMap[trekkerId]?.display_name
      return name ? `${name}'s` : 'Provided'
    }
  }
  return LABELS[status] ?? ''
}
function otherStyle(trekkerId: string, itemName: string) {
  return STATUS_BG[statusOf(trekkerId, itemName)] ?? {}
}

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
  // when switching to provided/shared with no provision yet, create one with 1 slot
  if ((status === 'provided' || status === 'shared') && !myProvision(itemName)) {
    const { treksApi } = await import('../api/treks')
    const res = await treksApi.upsertProvision(code, itemName, status, 0)
    store.provisions.push({ id: res.provision_id, trekker_id: res.trekker_id, item_name: res.item_name, type: res.type, quantity: res.quantity, claims: [] })
  }
}

async function onAddSlot(itemName: string) {
  const p = myProvision(itemName)
  if (!p) return
  const { treksApi } = await import('../api/treks')
  const res = await treksApi.upsertProvision(code, itemName, p.type, p.quantity + 1)
  const idx = store.provisions.findIndex(x => x.id === p.id)
  if (idx >= 0) store.provisions[idx] = { ...store.provisions[idx], quantity: res.quantity }
}

async function onRemoveSlot(itemName: string) {
  const p = myProvision(itemName)
  if (!p) return
  const { treksApi } = await import('../api/treks')
  const newQty = Math.max(0, p.quantity - 1)
  const res = await treksApi.upsertProvision(code, itemName, p.type, newQty)
  const idx = store.provisions.findIndex(x => x.id === p.id)
  if (idx >= 0) store.provisions[idx] = { ...store.provisions[idx], quantity: res.quantity }
}

async function onClaim(provisionId: string) {
  const { treksApi } = await import('../api/treks')
  await treksApi.claimProvision(code, provisionId)
}

async function onUnclaim(provisionId: string) {
  const { treksApi } = await import('../api/treks')
  await treksApi.unclaimProvision(code, provisionId)
}

function onDropClaim(e: DragEvent) {
  const action = e.dataTransfer?.getData('action')
  const pid = e.dataTransfer?.getData('provision_id')
  if (action === 'claim' && pid) onClaim(pid)
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

.kick-btn {
  background: none; border: none; color: transparent;
  cursor: pointer; font-size: 0.7rem; padding: 0 0.2rem; line-height: 1;
  transition: color 0.12s;
}
.th-trekker:hover .kick-btn { color: #8b92a8; }
.kick-btn:hover { color: #e05252 !important; }

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
  padding: 0;
  border-bottom: 1px solid #141620;
  border-left: 1px solid #141620;
  vertical-align: middle;
}
.td-status.mine { background: #0a0d1a; }

.other-status {
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 14px 0.75rem;
  width: calc(100% - 1.5rem);
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 0.88rem;
  font-weight: 600;
}

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
.modal-backdrop { position: fixed; inset: 0; background: #00000088; display: flex; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
.modal { background: #141620; border: 1px solid #1e2030; border-radius: 12px; padding: 1.5rem; width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 1rem; }
.modal h3 { font-size: 1rem; font-weight: 600; }
.annotation-list { display: flex; flex-direction: column; gap: 0.75rem; max-height: 240px; overflow-y: auto; }
.annotation { display: flex; align-items: flex-start; gap: 0.5rem; }
.ann-author { font-size: 0.75rem; font-weight: 600; min-width: 60px; }
.ann-body { flex: 1; font-size: 0.9rem; }
.ann-empty { color: #8b92a8; font-size: 0.85rem; }
.ann-compose { display: flex; gap: 0.5rem; }
.ann-compose input { flex: 1; }

/* mobile */
@media (max-width: 700px) {
  .trek-header {
    padding: 0.5rem 0.75rem;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .trek-code { font-size: 0.95rem; letter-spacing: 0.15em; }

  .header-actions { margin-left: 0; width: 100%; justify-content: flex-end; }

  /* checklist: touch scroll */
  .checklist-area {
    -webkit-overflow-scrolling: touch;
    overflow: auto;
  }
  .th-trekker { min-width: 180px; width: 180px; }
  .td-status { padding: 0.35rem 0.4rem; }

  /* cycle button touch-friendly height */
}

/* ── Identity gate ─────────────────────────────────────── */
.id-overlay {
  position: fixed; inset: 0;
  background: rgba(10,11,18,0.85);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; backdrop-filter: blur(4px);
}
.id-modal {
  background: #141620; border: 1px solid #1e2030; border-radius: 14px;
  padding: 2rem; width: 100%; max-width: 460px;
  display: flex; flex-direction: column; gap: 1.1rem;
  max-height: 90vh; overflow-y: auto;
}
.id-modal h2 { font-size: 1.2rem; font-weight: 800; }
.id-sub { font-size: 0.85rem; color: #555e78; margin-top: -0.5rem; }
.id-section-label { font-size: 0.72rem; color: #555e78; text-transform: uppercase; letter-spacing: 0.06em; }
.id-guest-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.id-guest-btn {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.4rem 0.85rem; border-radius: 20px;
  border: 1px solid #2a2d3e; background: #1a1d2e;
  font-size: 0.88rem; cursor: pointer; transition: border-color 0.12s;
  color: #c8ccd8;
}
.id-guest-btn:hover { border-color: #4a4f6a; }
.id-guest-btn.selected { border-color: #4f9cf9; background: #1a2a3e; color: #e8eaf0; }
.id-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.id-divider {
  text-align: center; font-size: 0.75rem; color: #555e78;
  border-top: 1px solid #1e2030; padding-top: 0.75rem; margin-top: 0.25rem;
}
.id-form { display: flex; flex-direction: column; gap: 0.85rem; }
.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field label { font-size: 0.75rem; color: #8b92a8; text-transform: uppercase; letter-spacing: 0.05em; }
.field input, .field select { width: 100%; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
.color-row { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.id-swatch { width: 24px; height: 24px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: border-color 0.12s, transform 0.12s; }
.id-swatch.active { border-color: #fff; transform: scale(1.2); }
.radio-row { display: flex; gap: 0.75rem; flex-wrap: wrap; padding-top: 0.2rem; }
.radio-label { display: flex; align-items: center; gap: 0.3rem; font-size: 0.88rem; cursor: pointer; }
.opt { font-size: 0.7rem; color: #555e78; text-transform: none; letter-spacing: 0; font-weight: 400; }
.error { color: #f97f4f; font-size: 0.82rem; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
