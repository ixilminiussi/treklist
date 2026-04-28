/**
 * Item data persistence: statuses, provisions, annotations, custom items, weights
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { post, get, del, uid } from './helpers'

const suffix = uid()

let userId: string
let token: string
let trekCode: string
let trekkerAId: string  // creator
let trekkerBId: string  // second user

beforeAll(async () => {
  const suffixB = uid()

  // User A (creator)
  const regA = await post('/api/auth/register', {
    email: `items-a-${suffix}@treklist.test`,
    username: `items-a-${suffix}`,
    password: 'testpass123',
    color: '#4f9cf9',
  })
  userId = regA.id

  const trek = await post('/api/treks', {
    name: `Items Trek ${suffix}`,
    trek_type: 'Hike',
    food_source: '',
    camping: 'Tent',
    weather: 'Mixed',
    temperature: 'Mixed',
    user_id: userId,
    color: '#4f9cf9',
  })
  trekCode = trek.trek.code
  token = trek.session_token

  const trekData = await get(`/api/treks/${trekCode}`)
  trekkerAId = trekData.trekkers.find((t: any) => t.user_id === userId).id

  // User B (guest)
  const joinB = await post(`/api/treks/${trekCode}/join`, {
    guest_name: `Guest-B-${suffix}`,
    color: '#f97f4f',
  })
  trekkerBId = joinB.trekker.id
})

describe('item statuses', () => {
  it('sets a status for an item', async () => {
    await post(`/api/treks/${trekCode}/items/status`, { item_name: 'Tent', status: 'got_it' }, token)
    const items = await get(`/api/treks/${trekCode}/items`)
    const s = items.statuses.find((s: any) => s.item_name === 'Tent' && s.trekker_id === trekkerAId)
    expect(s?.status).toBe('got_it')
  })

  it('status persists across separate fetches', async () => {
    const a = await get(`/api/treks/${trekCode}/items`)
    const b = await get(`/api/treks/${trekCode}/items`)
    const sa = a.statuses.find((s: any) => s.item_name === 'Tent' && s.trekker_id === trekkerAId)
    const sb = b.statuses.find((s: any) => s.item_name === 'Tent' && s.trekker_id === trekkerAId)
    expect(sa?.status).toBe(sb?.status)
  })

  it('updates an existing status', async () => {
    await post(`/api/treks/${trekCode}/items/status`, { item_name: 'Tent', status: 'provided' }, token)
    const items = await get(`/api/treks/${trekCode}/items`)
    const s = items.statuses.find((s: any) => s.item_name === 'Tent' && s.trekker_id === trekkerAId)
    expect(s?.status).toBe('provided')
  })
})

describe('provisions', () => {
  it('creates a provision', async () => {
    await post(`/api/treks/${trekCode}/items/provision`, { item_name: 'Tent', type: 'provided', quantity: 2 }, token)
    const items = await get(`/api/treks/${trekCode}/items`)
    const p = items.provisions.find((p: any) => p.item_name === 'Tent')
    expect(p).toBeTruthy()
    expect(p.quantity).toBe(2)
    expect(p.type).toBe('provided')
  })

  it('provision persists across fetches', async () => {
    const a = await get(`/api/treks/${trekCode}/items`)
    const b = await get(`/api/treks/${trekCode}/items`)
    expect(a.provisions.length).toBe(b.provisions.length)
  })

  it('second trekker can claim a provision slot', async () => {
    const items = await get(`/api/treks/${trekCode}/items`)
    const p = items.provisions.find((p: any) => p.item_name === 'Tent')
    const joinBToken = (await post(`/api/treks/${trekCode}/resume-guest`, { trekker_id: trekkerBId })).session_token
    await post(`/api/treks/${trekCode}/items/claim`, { provision_id: p.id }, joinBToken)
    const after = await get(`/api/treks/${trekCode}/items`)
    const pAfter = after.provisions.find((p: any) => p.item_name === 'Tent')
    const claim = pAfter.claims?.find((c: any) => c.claimed_by === trekkerBId)
    expect(claim).toBeTruthy()
  })
})

describe('annotations', () => {
  let annotationId: string

  it('adds an annotation', async () => {
    await post(`/api/treks/${trekCode}/items/annotate`, { item_name: 'Tent', body: 'bring the 2-person one' }, token)
    const items = await get(`/api/treks/${trekCode}/items`)
    const a = items.annotations.find((a: any) => a.item_name === 'Tent')
    expect(a?.body).toBe('bring the 2-person one')
    annotationId = a.id
  })

  it('annotation persists', async () => {
    const items = await get(`/api/treks/${trekCode}/items`)
    const a = items.annotations.find((a: any) => a.id === annotationId)
    expect(a).toBeTruthy()
  })

  it('deletes an annotation', async () => {
    await del(`/api/treks/${trekCode}/annotations/${annotationId}`, token)
    const items = await get(`/api/treks/${trekCode}/items`)
    const a = items.annotations.find((a: any) => a.id === annotationId)
    expect(a).toBeFalsy()
  })
})

describe('custom items', () => {
  it('adds a custom item', async () => {
    await post(`/api/treks/${trekCode}/items/custom`, { name: `Cowbell-${suffix}`, category: 'Gear' }, token)
    const items = await get(`/api/treks/${trekCode}/items`)
    const c = items.custom_items.find((c: any) => c.name === `Cowbell-${suffix}`)
    expect(c).toBeTruthy()
    expect(c.category).toBe('Gear')
  })

  it('custom item persists', async () => {
    const a = await get(`/api/treks/${trekCode}/items`)
    const b = await get(`/api/treks/${trekCode}/items`)
    expect(a.custom_items.length).toBe(b.custom_items.length)
  })
})

describe('item weights', () => {
  it('sets a custom weight for an item', async () => {
    await post(`/api/treks/${trekCode}/items/weight`, { item_name: 'Tent', custom_grams: 1800 }, token)
    const items = await get(`/api/treks/${trekCode}/items`)
    const w = items.weights?.find((w: any) => w.item_name === 'Tent' && w.trekker_id === trekkerAId)
    expect(w?.custom_grams).toBe(1800)
  })

  it('weight persists', async () => {
    const a = await get(`/api/treks/${trekCode}/items`)
    const b = await get(`/api/treks/${trekCode}/items`)
    const wa = a.weights?.find((w: any) => w.item_name === 'Tent' && w.trekker_id === trekkerAId)
    const wb = b.weights?.find((w: any) => w.item_name === 'Tent' && w.trekker_id === trekkerAId)
    expect(wa?.custom_grams).toBe(wb?.custom_grams)
  })
})
