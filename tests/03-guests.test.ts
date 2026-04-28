/**
 * Guest flows: join, rejoin (resume), kick
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { post, get, del, uid } from './helpers'

const suffix = uid()
const HOST_EMAIL    = `host-${suffix}@treklist.test`
const HOST_USERNAME = `host-${suffix}`
const PASSWORD = 'testpass123'

let hostUserId: string
let hostToken: string
let trekCode: string

let guest1Id: string
let guest1Token: string
let guest2Id: string

beforeAll(async () => {
  // register host
  const reg = await post('/api/auth/register', {
    email: HOST_EMAIL, username: HOST_USERNAME, password: PASSWORD, color: '#c97ff9',
  })
  hostUserId = reg.id

  // create a trek
  const res = await post('/api/treks', {
    name: `Guest Test Trek ${suffix}`,
    trek_type: 'Hike',
    food_source: '',
    camping: '',
    weather: 'Mixed',
    temperature: 'Mixed',
    user_id: hostUserId,
    color: '#c97ff9',
  })
  trekCode = res.trek.code
  hostToken = res.session_token
})

describe('guest join', () => {
  it('guest can join an active trek', async () => {
    const res = await post(`/api/treks/${trekCode}/join`, {
      guest_name: `Hiker-${suffix}`,
      color: '#4fcc8a',
      weight_kg: 68,
      sex: 'F',
      birthday: '1995-03-20',
    })
    expect(res.trekker.display_name).toBe(`Hiker-${suffix}`)
    expect(res.session_token).toBeTruthy()
    guest1Id    = res.trekker.id
    guest1Token = res.session_token
  })

  it('guest appears in trek trekkers', async () => {
    const res = await get(`/api/treks/${trekCode}`)
    const g = res.trekkers.find((t: any) => t.id === guest1Id)
    expect(g).toBeTruthy()
    expect(g.display_name).toBe(`Hiker-${suffix}`)
  })

  it('second guest can also join', async () => {
    const res = await post(`/api/treks/${trekCode}/join`, {
      guest_name: `Sherpa-${suffix}`,
      color: '#f9cf4f',
    })
    guest2Id = res.trekker.id
    expect(guest2Id).toBeTruthy()
  })

  it('trek now has host + 2 guests', async () => {
    const res = await get(`/api/treks/${trekCode}`)
    expect(res.trekkers.length).toBe(3)
  })
})

describe('guest resume', () => {
  it('guest can resume their session with a new token', async () => {
    const res = await post(`/api/treks/${trekCode}/resume-guest`, { trekker_id: guest1Id })
    expect(res.trekker.id).toBe(guest1Id)
    expect(res.session_token).toBeTruthy()
    // token refreshes — old one still identifies same trekker
    guest1Token = res.session_token
  })

  it('resumed trekker still in trek', async () => {
    const res = await get(`/api/treks/${trekCode}`)
    const g = res.trekkers.find((t: any) => t.id === guest1Id)
    expect(g).toBeTruthy()
  })

  it('cannot resume a registered-user trekker as guest', async () => {
    // get host trekker id
    const res = await get(`/api/treks/${trekCode}`)
    const hostTrekker = res.trekkers.find((t: any) => t.user_id === hostUserId)
    await expect(
      post(`/api/treks/${trekCode}/resume-guest`, { trekker_id: hostTrekker.id })
    ).rejects.toMatchObject({ status: 404 })
  })

  it('resume requires trekker_id', async () => {
    await expect(
      post(`/api/treks/${trekCode}/resume-guest`, {})
    ).rejects.toMatchObject({ status: 400 })
  })
})

describe('kick', () => {
  it('host can kick a guest', async () => {
    await del(`/api/treks/${trekCode}/trekkers/${guest2Id}`, hostToken)
    const res = await get(`/api/treks/${trekCode}`)
    const kicked = res.trekkers.find((t: any) => t.id === guest2Id)
    expect(kicked).toBeFalsy()
  })

  it('non-host cannot kick', async () => {
    await expect(
      del(`/api/treks/${trekCode}/trekkers/${guest1Id}`, guest1Token)
    ).rejects.toMatchObject({ status: 403 })
  })

  it('kicked trekker cannot resume', async () => {
    // kick guest1 now
    await del(`/api/treks/${trekCode}/trekkers/${guest1Id}`, hostToken)
    await expect(
      post(`/api/treks/${trekCode}/resume-guest`, { trekker_id: guest1Id })
    ).rejects.toMatchObject({ status: 404 })
  })
})
