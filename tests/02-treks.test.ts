/**
 * Trek lifecycle: create, read, list, close (delete)
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { post, get, uid } from './helpers'

const suffix = uid()
const EMAIL    = `trek-${suffix}@treklist.test`
const USERNAME = `trek-${suffix}`
const PASSWORD = 'testpass123'

let userId: string
let trekCode: string
let sessionToken: string

beforeAll(async () => {
  const reg = await post('/api/auth/register', { email: EMAIL, username: USERNAME, password: PASSWORD, color: '#4f9cf9' })
  userId = reg.id
})

describe('trek lifecycle', () => {
  describe('creation', () => {
    it('creates a trek as registered user', async () => {
      const res = await post('/api/treks', {
        name: `Test Trek ${suffix}`,
        trek_type: 'Hike',
        food_source: '',
        camping: 'Tent',
        weather: 'Mixed',
        temperature: 'Mixed',
        user_id: userId,
        color: '#4f9cf9',
      })
      expect(res.trek.code).toHaveLength(5)
      expect(res.trek.name).toBe(`Test Trek ${suffix}`)
      expect(res.trek.status).toBe('active')
      expect(res.session_token).toBeTruthy()
      trekCode = res.trek.code
      sessionToken = res.session_token
    })

    it('requires name and trek_type', async () => {
      await expect(
        post('/api/treks', { user_id: userId, color: '#4f9cf9' })
      ).rejects.toMatchObject({ status: 400 })
    })
  })

  describe('persistence', () => {
    it('trek is readable immediately after creation', async () => {
      const res = await get(`/api/treks/${trekCode}`)
      expect(res.trek.code).toBe(trekCode)
      expect(res.trek.status).toBe('active')
    })

    it('creator appears in trekkers list', async () => {
      const res = await get(`/api/treks/${trekCode}`)
      const me = res.trekkers.find((t: any) => t.user_id === userId)
      expect(me).toBeTruthy()
    })

    it('trek appears in user trek list', async () => {
      const list = await get(`/api/users/${userId}/treks`)
      const found = list.find((t: any) => t.code === trekCode)
      expect(found).toBeTruthy()
      expect(found.name).toBe(`Test Trek ${suffix}`)
    })

    it('trek data is stable across multiple fetches', async () => {
      const a = await get(`/api/treks/${trekCode}`)
      const b = await get(`/api/treks/${trekCode}`)
      expect(a.trek.name).toBe(b.trek.name)
      expect(a.trek.trek_type).toBe(b.trek.trek_type)
      expect(a.trekkers.length).toBe(b.trekkers.length)
    })
  })

  describe('closure', () => {
    it('creator can close the trek', async () => {
      const res = await post(`/api/treks/${trekCode}/close`, {}, sessionToken)
      expect(res.status).toBe('archived')
    })

    it('closed trek shows archived status', async () => {
      const res = await get(`/api/treks/${trekCode}`)
      expect(res.trek.status).toBe('archived')
    })

    it('closed trek no longer appears in user active list', async () => {
      const list = await get(`/api/users/${userId}/treks`)
      const found = list.find((t: any) => t.code === trekCode)
      expect(found).toBeFalsy()
    })

    it('joining a closed trek is rejected', async () => {
      await expect(
        post(`/api/treks/${trekCode}/join`, { guest_name: 'Latebird', color: '#fff' })
      ).rejects.toMatchObject({ status: 410 })
    })
  })
})
