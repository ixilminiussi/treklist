import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { treksApi, type Trek, type Trekker, type ChecklistItem } from '../api/treks'
import { wsUrl } from '../api/client'

export interface ItemStatus {
  trekker_id: string
  item_name: string
  status: string
  updated_at: string
}

export interface Provision {
  id: string
  trekker_id: string
  item_name: string
  type: 'provided' | 'shared'
  quantity: number
  claims: { id: string; claimed_by: string }[]
}

export interface Annotation {
  id: string
  trekker_id: string
  item_name: string
  body: string
  created_at: string
}

export interface CustomItem {
  id: string
  trek_code: string
  trekker_id: string
  name: string
  category?: string
}

export interface TrekkerWeight {
  trekker_id: string
  item_name: string
  custom_grams: number
}

export const useTrekStore = defineStore('trek', () => {
  const trek = ref<Trek | null>(null)
  const trekkers = ref<Trekker[]>([])
  const myTrekker = ref<Trekker | null>(
    JSON.parse(sessionStorage.getItem('my_trekker') ?? 'null')
  )
  const checklist = ref<ChecklistItem[]>([])
  const defaultWeights = ref<Record<string, number>>({})
  const statuses = ref<ItemStatus[]>([])
  const provisions = ref<Provision[]>([])
  const annotations = ref<Annotation[]>([])
  const customItems = ref<CustomItem[]>([])
  const trekkerWeights = ref<TrekkerWeight[]>([])

  let socket: WebSocket | null = null

  const trekkerMap = computed(() =>
    Object.fromEntries(trekkers.value.map(t => [t.id, t]))
  )

  const myStatuses = computed(() =>
    Object.fromEntries(
      statuses.value
        .filter(s => s.trekker_id === myTrekker.value?.id)
        .map(s => [s.item_name, s.status])
    )
  )

  function persistMyTrekker(t: Trekker, token: string) {
    myTrekker.value = t
    sessionStorage.setItem('my_trekker', JSON.stringify(t))
    sessionStorage.setItem('session_token', token)
  }

  async function createTrek(data: any) {
    const res = await treksApi.create(data)
    trek.value = res.trek
    trekkers.value = [res.trekker]
    persistMyTrekker(res.trekker, res.session_token)
    return res
  }

  async function joinTrek(code: string, data: any) {
    const res = await treksApi.join(code, data)
    trek.value = res.trek
    persistMyTrekker(res.trekker, res.session_token)
    return res
  }

  async function loadTrek(code: string) {
    const [trekData, itemData, cl, wts] = await Promise.all([
      treksApi.get(code),
      treksApi.getItems(code),
      checklist.value.length ? Promise.resolve(checklist.value) : treksApi.getChecklist(),
      Object.keys(defaultWeights.value).length ? Promise.resolve(null) : treksApi.getDefaultWeights(),
    ])

    trek.value = trekData.trek
    trekkers.value = trekData.trekkers

    statuses.value = itemData.statuses ?? []
    provisions.value = groupProvisions(itemData.provisions ?? [])
    annotations.value = itemData.annotations ?? []
    customItems.value = itemData.custom_items ?? []
    trekkerWeights.value = itemData.weights ?? []

    if (Array.isArray(cl)) checklist.value = cl
    if (wts) {
      defaultWeights.value = Object.fromEntries(
        (wts as any[]).map((w: any) => [w.item_name, w.default_grams])
      )
    }

    connectWS(code)
  }

  function groupProvisions(raw: any[]): Provision[] {
    const map: Record<string, Provision> = {}
    for (const row of raw) {
      if (!map[row.id]) {
        map[row.id] = { id: row.id, trekker_id: row.trekker_id, item_name: row.item_name, type: row.type, quantity: row.quantity, claims: [] }
      }
      if (row.claim_id) {
        map[row.id].claims.push({ id: row.claim_id, claimed_by: row.claimed_by })
      }
    }
    return Object.values(map)
  }

  function connectWS(code: string) {
    if (socket) socket.close()
    socket = new WebSocket(wsUrl(code))
    socket.onmessage = (ev) => handleWSMessage(JSON.parse(ev.data))
    socket.onclose = () => {
      setTimeout(() => connectWS(code), 2000)
    }
  }

  function handleWSMessage(msg: { type: string; payload: any }) {
    switch (msg.type) {
      case 'status_update': {
        const idx = statuses.value.findIndex(
          s => s.trekker_id === msg.payload.trekker_id && s.item_name === msg.payload.item_name
        )
        if (idx >= 0) statuses.value[idx] = msg.payload
        else statuses.value.push(msg.payload)
        break
      }
      case 'provision_update': {
        const idx = provisions.value.findIndex(p => p.id === msg.payload.id)
        if (idx >= 0) provisions.value[idx] = msg.payload
        else provisions.value.push(msg.payload)
        break
      }
      case 'claim_update': {
        const prov = provisions.value.find(p => p.id === msg.payload.provision_id)
        if (prov) {
          if (msg.payload.action === 'add') prov.claims.push({ id: msg.payload.claim_id, claimed_by: msg.payload.claimed_by })
          else prov.claims = prov.claims.filter(c => c.claimed_by !== msg.payload.claimed_by)
        }
        break
      }
      case 'annotation_add':
        annotations.value.push(msg.payload)
        break
      case 'annotation_delete':
        annotations.value = annotations.value.filter(a => a.id !== msg.payload.id)
        break
      case 'custom_item_add':
        customItems.value.push(msg.payload)
        break
      case 'trekker_join':
        if (!trekkers.value.find(t => t.id === msg.payload.id))
          trekkers.value.push(msg.payload)
        break
      case 'trekker_kick':
        trekkers.value = trekkers.value.filter(t => t.id !== msg.payload.id)
        break
    }
  }

  async function setStatus(item_name: string, status: string) {
    if (!trek.value) return
    await treksApi.setStatus(trek.value.code, item_name, status)
    // Optimistic update — WS will confirm
    const idx = statuses.value.findIndex(
      s => s.trekker_id === myTrekker.value?.id && s.item_name === item_name
    )
    const row: ItemStatus = { trekker_id: myTrekker.value!.id, item_name, status, updated_at: new Date().toISOString() }
    if (idx >= 0) statuses.value[idx] = row
    else statuses.value.push(row)
  }

  function bagWeight(trekkerId: string): number {
    const myStatMap = Object.fromEntries(
      statuses.value
        .filter(s => s.trekker_id === trekkerId && ['got_it','provided','will_get'].includes(s.status))
        .map(s => [s.item_name, true])
    )
    const customMap = Object.fromEntries(
      trekkerWeights.value
        .filter(w => w.trekker_id === trekkerId)
        .map(w => [w.item_name, w.custom_grams])
    )
    return Object.keys(myStatMap).reduce((sum, name) => {
      return sum + (customMap[name] ?? defaultWeights.value[name] ?? 0)
    }, 0)
  }

  function filteredChecklist(): ChecklistItem[] {
    if (!trek.value) return []
    const t = trek.value
    return checklist.value.filter(item => {
      if (item.type === 'category') return true
      const f = item.filters
      if (f.trek_type && f.trek_type !== t.trek_type) return false
      if (f.food_source && f.food_source !== t.food_source) return false
      if (f.camping && f.camping !== t.camping) return false
      if (f.weather) {
        const matches = t.weather.toLowerCase().includes(f.weather.toLowerCase().split(' ')[0])
        if (!matches) return false
      }
      return true
    })
  }

  return {
    trek, trekkers, myTrekker, checklist, defaultWeights,
    statuses, provisions, annotations, customItems, trekkerWeights,
    trekkerMap, myStatuses,
    createTrek, joinTrek, loadTrek, setStatus, bagWeight, filteredChecklist,
  }
})
