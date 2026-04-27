import { Context } from 'hono'
import { Env } from '../index'

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key, 256
  )
  const combined = new Uint8Array(16 + 32)
  combined.set(salt, 0)
  combined.set(new Uint8Array(bits), 16)
  return btoa(String.fromCharCode(...combined))
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0))
  const salt = combined.slice(0, 16)
  const hash = combined.slice(16)
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key, 256
  )
  const newHash = new Uint8Array(bits)
  return hash.every((b, i) => b === newHash[i])
}

export async function register(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json<any>()
  const { email, username, password, birthday, weight_kg, sex, gender, color } = body
  if (!email || !username || !password) return c.json({ error: 'email, username, password required' }, 400)

  const id = crypto.randomUUID()
  const hash = await hashPassword(password)

  try {
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, username, password_hash, birthday, weight_kg, sex, gender, color, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, email, username, hash, birthday ?? null, weight_kg ?? null, sex ?? null, gender ?? null, color ?? '#4f9cf9', new Date().toISOString()).run()
    return c.json({ id, username }, 201)
  } catch {
    return c.json({ error: 'email or username already taken' }, 409)
  }
}

export async function login(c: Context<{ Bindings: Env }>) {
  const { email, password } = await c.req.json<any>()
  const row = await c.env.DB.prepare(`SELECT * FROM users WHERE email = ?`).bind(email).first<any>()
  if (!row) return c.json({ error: 'invalid credentials' }, 401)
  if (!(await verifyPassword(password, row.password_hash))) return c.json({ error: 'invalid credentials' }, 401)
  const { password_hash: _, ...safe } = row
  return c.json(safe)
}

export async function getProfile(c: Context<{ Bindings: Env }>) {
  const row = await c.env.DB.prepare(
    `SELECT id, username, email, color, sex, gender, weight_kg, birthday FROM users WHERE id = ?`
  ).bind(c.req.param('userID')).first()
  if (!row) return c.json({ error: 'not found' }, 404)
  return c.json(row)
}

export async function updateProfile(c: Context<{ Bindings: Env }>) {
  const userID = c.req.param('userID')
  const fields = await c.req.json<any>()
  const allowed = ['username', 'birthday', 'weight_kg', 'sex', 'gender', 'color']
  const sets = Object.keys(fields).filter(k => allowed.includes(k))
  if (!sets.length) return c.json({ error: 'no updatable fields' }, 400)
  const sql = `UPDATE users SET ${sets.map(k => `${k} = ?`).join(', ')} WHERE id = ?`
  await c.env.DB.prepare(sql).bind(...sets.map(k => fields[k]), userID).run()
  return c.json({ updated: userID })
}
