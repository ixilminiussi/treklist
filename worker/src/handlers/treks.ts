import { Context } from 'hono'
import { Env } from '../index'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(5)))
    .map(b => CODE_CHARS[b % CODE_CHARS.length])
    .join('')
}

function trekkerFromRow(row: any): any {
  return {
    id: row.id,
    trek_code: row.trek_code,
    user_id: row.user_id ?? undefined,
    guest_name: row.guest_name ?? undefined,
    display_name: row.username || row.guest_name || 'unknown',
    color: row.color || row.u_color || '#4f9cf9',
    joined_at: row.joined_at,
    kicked_at: row.kicked_at ?? undefined,
    weight_kg: row.weight_kg ?? undefined,
    sex: row.sex ?? undefined,
  }
}

export async function createTrek(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json<any>()
  const { name, trek_type, food_source, camping, weather, temperature, guest_name, user_id, color } = body
  if (!name || !trek_type) return c.json({ error: 'name and trek_type required' }, 400)

  const code = generateCode()
  const creatorID = user_id ?? ''
  await c.env.DB.prepare(
    `INSERT INTO treks (code, name, trek_type, food_source, camping, weather, temperature, creator_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
  ).bind(code, name, trek_type, food_source ?? '', camping ?? '', weather ?? '', temperature ?? '', creatorID, new Date().toISOString()).run()

  const trekkerID = crypto.randomUUID()
  const token = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO trekkers (id, trek_code, user_id, guest_name, session_token, color, joined_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(trekkerID, code, user_id ?? null, guest_name ?? null, token, color ?? '#4f9cf9', new Date().toISOString()).run()

  return c.json({
    trek: { code, name, trek_type, food_source, camping, weather, temperature, creator_id: creatorID, status: 'active' },
    trekker: { id: trekkerID, trek_code: code, display_name: guest_name ?? '', color: color ?? '#4f9cf9' },
    session_token: token,
  }, 201)
}

export async function joinTrek(c: Context<{ Bindings: Env }>) {
  const code = c.req.param('code').toUpperCase()
  const body = await c.req.json<any>()
  const { guest_name, user_id, color } = body

  const trek = await c.env.DB.prepare(`SELECT * FROM treks WHERE code = ?`).bind(code).first<any>()
  if (!trek) return c.json({ error: 'trek not found' }, 404)
  if (trek.status !== 'active') return c.json({ error: 'trek is no longer active' }, 410)

  const trekkerID = crypto.randomUUID()
  const token = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO trekkers (id, trek_code, user_id, guest_name, session_token, color, joined_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(trekkerID, code, user_id ?? null, guest_name ?? null, token, color ?? '#4f9cf9', new Date().toISOString()).run()

  return c.json({
    trek,
    trekker: { id: trekkerID, trek_code: code, display_name: guest_name ?? '', color: color ?? '#4f9cf9' },
    session_token: token,
  }, 201)
}

export async function getTrek(c: Context<{ Bindings: Env }>) {
  const code = c.req.param('code').toUpperCase()
  const trek = await c.env.DB.prepare(`SELECT * FROM treks WHERE code = ?`).bind(code).first()
  if (!trek) return c.json({ error: 'not found' }, 404)

  const { results: trekkers } = await c.env.DB.prepare(
    `SELECT t.*, u.username, u.weight_kg, u.sex, u.color as u_color
     FROM trekkers t LEFT JOIN users u ON t.user_id = u.id
     WHERE t.trek_code = ? AND t.kicked_at IS NULL`
  ).bind(code).all()

  return c.json({ trek, trekkers: trekkers.map(trekkerFromRow) })
}

export async function closeTrek(c: Context<{ Bindings: Env }>) {
  const code = c.req.param('code').toUpperCase()
  const token = c.req.header('X-Session-Token') ?? ''

  const trek = await c.env.DB.prepare(`SELECT creator_id FROM treks WHERE code = ?`).bind(code).first<any>()
  if (!trek) return c.json({ error: 'not found' }, 404)

  const caller = await c.env.DB.prepare(
    `SELECT user_id FROM trekkers WHERE session_token = ? AND trek_code = ?`
  ).bind(token, code).first<any>()
  if (!caller || caller.user_id !== trek.creator_id) return c.json({ error: 'forbidden' }, 403)

  await c.env.DB.prepare(`UPDATE treks SET status = 'archived', closed_at = ? WHERE code = ?`)
    .bind(new Date().toISOString(), code).run()
  return c.json({ status: 'archived' })
}

export async function kickTrekker(c: Context<{ Bindings: Env }>) {
  const code = c.req.param('code').toUpperCase()
  const trekkerID = c.req.param('trekkerID')
  const token = c.req.header('X-Session-Token') ?? ''

  const trek = await c.env.DB.prepare(`SELECT creator_id FROM treks WHERE code = ?`).bind(code).first<any>()
  if (!trek) return c.json({ error: 'not found' }, 404)

  const caller = await c.env.DB.prepare(
    `SELECT user_id FROM trekkers WHERE session_token = ? AND trek_code = ?`
  ).bind(token, code).first<any>()
  if (!caller || caller.user_id !== trek.creator_id) return c.json({ error: 'forbidden' }, 403)

  await c.env.DB.prepare(`UPDATE trekkers SET kicked_at = ? WHERE id = ? AND trek_code = ?`)
    .bind(new Date().toISOString(), trekkerID, code).run()
  return c.json({ kicked: trekkerID })
}
