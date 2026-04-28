/**
 * Auth: register, login, profile read + update
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { post, get, patch, uid } from './helpers'

const suffix = uid()
const EMAIL    = `auth-${suffix}@treklist.test`
const USERNAME = `auth-${suffix}`
const PASSWORD = 'testpass123'

let userId: string

describe('auth', () => {
  describe('registration', () => {
    it('creates a new user', async () => {
      const res = await post('/api/auth/register', {
        email: EMAIL,
        username: USERNAME,
        password: PASSWORD,
        color: '#4fcc8a',
      })
      expect(res.id).toBeTruthy()
      expect(res.username).toBe(USERNAME)
      userId = res.id
    })

    it('rejects duplicate email', async () => {
      await expect(
        post('/api/auth/register', { email: EMAIL, username: `other-${uid()}`, password: PASSWORD })
      ).rejects.toMatchObject({ status: 409 })
    })

    it('rejects duplicate username', async () => {
      await expect(
        post('/api/auth/register', { email: `other-${uid()}@treklist.test`, username: USERNAME, password: PASSWORD })
      ).rejects.toMatchObject({ status: 409 })
    })

    it('requires email, username, password', async () => {
      await expect(post('/api/auth/register', { email: EMAIL })).rejects.toMatchObject({ status: 400 })
    })
  })

  describe('login', () => {
    it('returns user on correct credentials', async () => {
      const res = await post('/api/auth/login', { email: EMAIL, password: PASSWORD })
      expect(res.id).toBe(userId)
      expect(res.username).toBe(USERNAME)
    })

    it('rejects wrong password', async () => {
      await expect(
        post('/api/auth/login', { email: EMAIL, password: 'wrongpassword' })
      ).rejects.toMatchObject({ status: 401 })
    })

    it('rejects unknown email', async () => {
      await expect(
        post('/api/auth/login', { email: 'nobody@treklist.test', password: PASSWORD })
      ).rejects.toMatchObject({ status: 401 })
    })
  })

  describe('profile', () => {
    it('reads own profile', async () => {
      const res = await get(`/api/users/${userId}`)
      expect(res.username).toBe(USERNAME)
      expect(res.email).toBe(EMAIL)
    })

    it('updates weight, sex, birthday', async () => {
      await patch(`/api/users/${userId}`, { weight_kg: 72, sex: 'M', birthday: '1990-06-15' })
      const res = await get(`/api/users/${userId}`)
      expect(res.weight_kg).toBe(72)
      expect(res.sex).toBe('M')
      expect(res.birthday).toBe('1990-06-15')
    })

    it('updates color', async () => {
      await patch(`/api/users/${userId}`, { color: '#f97f4f' })
      const res = await get(`/api/users/${userId}`)
      expect(res.color).toBe('#f97f4f')
    })

    it('profile persists across separate fetches', async () => {
      const a = await get(`/api/users/${userId}`)
      const b = await get(`/api/users/${userId}`)
      expect(a.weight_kg).toBe(b.weight_kg)
      expect(a.color).toBe(b.color)
    })
  })
})
