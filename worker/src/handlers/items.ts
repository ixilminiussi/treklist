import { Context } from 'hono'
import { Env } from '../index'

async function resolveTrekker(c: Context<{ Bindings: Env }>, code: string) {
  const token = c.req.header('X-Session-Token') ?? ''
  return c.env.DB.prepare(
    `SELECT * FROM trekkers WHERE session_token = ? AND trek_code = ? AND kicked_at IS NULL`
  ).bind(token, code).first<any>()
}

export async function getTrekItems(c: Context<{ Bindings: Env }>) {
  const code = c.req.param('code').toUpperCase()

  const [statuses, provisions, claims, annotations, customItems, weights] = await Promise.all([
    c.env.DB.prepare(
      `SELECT s.* FROM item_statuses s JOIN trekkers t ON s.trekker_id = t.id
       WHERE t.trek_code = ? AND t.kicked_at IS NULL`
    ).bind(code).all(),
    c.env.DB.prepare(
      `SELECT p.* FROM item_provisions p JOIN trekkers t ON p.trekker_id = t.id WHERE t.trek_code = ?`
    ).bind(code).all(),
    c.env.DB.prepare(
      `SELECT c.* FROM provision_claims c
       JOIN item_provisions p ON c.provision_id = p.id
       JOIN trekkers t ON p.trekker_id = t.id WHERE t.trek_code = ?`
    ).bind(code).all(),
    c.env.DB.prepare(
      `SELECT a.* FROM annotations a JOIN trekkers t ON a.trekker_id = t.id WHERE t.trek_code = ?`
    ).bind(code).all(),
    c.env.DB.prepare(`SELECT * FROM custom_items WHERE trek_code = ?`).bind(code).all(),
    c.env.DB.prepare(
      `SELECT tw.* FROM trekker_weights tw JOIN trekkers t ON tw.trekker_id = t.id WHERE t.trek_code = ?`
    ).bind(code).all(),
  ])

  // Attach claims to provisions
  const claimMap: Record<string, any[]> = {}
  for (const claim of claims.results) {
    const pid = (claim as any).provision_id
    if (!claimMap[pid]) claimMap[pid] = []
    claimMap[pid].push(claim)
  }
  const provisionsWithClaims = provisions.results.map(p => ({
    ...p,
    claims: claimMap[(p as any).id] ?? [],
  }))

  return c.json({
    statuses: statuses.results,
    provisions: provisionsWithClaims,
    annotations: annotations.results,
    custom_items: customItems.results,
    weights: weights.results,
  })
}

export async function setItemStatus(c: Context<{ Bindings: Env }>) {
  const code = c.req.param('code').toUpperCase()
  const trekker = await resolveTrekker(c, code)
  if (!trekker) return c.json({ error: 'unauthorized' }, 401)

  const { item_name, status } = await c.req.json<any>()

  if (!status) {
    await c.env.DB.prepare(
      `DELETE FROM item_statuses WHERE trekker_id = ? AND item_name = ?`
    ).bind(trekker.id, item_name).run()
    return c.json({ trekker_id: trekker.id, item_name, status: '' })
  }

  await c.env.DB.prepare(
    `INSERT INTO item_statuses (trekker_id, item_name, status, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(trekker_id, item_name) DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at`
  ).bind(trekker.id, item_name, status, new Date().toISOString()).run()

  return c.json({ trekker_id: trekker.id, item_name, status })
}

export async function upsertProvision(c: Context<{ Bindings: Env }>) {
  const code = c.req.param('code').toUpperCase()
  const trekker = await resolveTrekker(c, code)
  if (!trekker) return c.json({ error: 'unauthorized' }, 401)

  const { item_name, type, quantity } = await c.req.json<any>()
  if (quantity < 0 || quantity > 20) return c.json({ error: 'quantity must be 0-20' }, 400)

  const existing = await c.env.DB.prepare(
    `SELECT id FROM item_provisions WHERE trekker_id = ? AND item_name = ?`
  ).bind(trekker.id, item_name).first<any>()

  let provisionID: string
  if (existing) {
    provisionID = existing.id
    await c.env.DB.prepare(`UPDATE item_provisions SET type = ?, quantity = ? WHERE id = ?`)
      .bind(type, quantity, provisionID).run()
  } else {
    provisionID = crypto.randomUUID()
    await c.env.DB.prepare(
      `INSERT INTO item_provisions (id, trekker_id, item_name, type, quantity) VALUES (?, ?, ?, ?, ?)`
    ).bind(provisionID, trekker.id, item_name, type, quantity).run()
  }

  return c.json({ provision_id: provisionID, trekker_id: trekker.id, item_name, type, quantity })
}

export async function claimProvision(c: Context<{ Bindings: Env }>) {
  const code = c.req.param('code').toUpperCase()
  const trekker = await resolveTrekker(c, code)
  if (!trekker) return c.json({ error: 'unauthorized' }, 401)

  const { provision_id } = await c.req.json<any>()
  const prov = await c.env.DB.prepare(`SELECT quantity FROM item_provisions WHERE id = ?`)
    .bind(provision_id).first<any>()
  if (!prov) return c.json({ error: 'provision not found' }, 404)

  const { results: claims } = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM provision_claims WHERE provision_id = ?`
  ).bind(provision_id).all()
  const claimed = (claims[0] as any)?.cnt ?? 0
  if (claimed >= prov.quantity) return c.json({ error: 'no slots available' }, 409)

  const claimID = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO provision_claims (id, provision_id, claimed_by) VALUES (?, ?, ?)`
  ).bind(claimID, provision_id, trekker.id).run()

  return c.json({ claim_id: claimID })
}

export async function unclaimProvision(c: Context<{ Bindings: Env }>) {
  const code = c.req.param('code').toUpperCase()
  const trekker = await resolveTrekker(c, code)
  if (!trekker) return c.json({ error: 'unauthorized' }, 401)

  const provisionID = c.req.param('provisionID')
  await c.env.DB.prepare(`DELETE FROM provision_claims WHERE provision_id = ? AND claimed_by = ?`)
    .bind(provisionID, trekker.id).run()
  return c.json({ unclaimed: provisionID })
}

export async function addAnnotation(c: Context<{ Bindings: Env }>) {
  const code = c.req.param('code').toUpperCase()
  const trekker = await resolveTrekker(c, code)
  if (!trekker) return c.json({ error: 'unauthorized' }, 401)

  const { item_name, body } = await c.req.json<any>()
  if (!body) return c.json({ error: 'body required' }, 400)

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await c.env.DB.prepare(
    `INSERT INTO annotations (id, trekker_id, item_name, body, created_at) VALUES (?, ?, ?, ?, ?)`
  ).bind(id, trekker.id, item_name, body, now).run()

  return c.json({ id, trekker_id: trekker.id, item_name, body, created_at: now }, 201)
}

export async function deleteAnnotation(c: Context<{ Bindings: Env }>) {
  const code = c.req.param('code').toUpperCase()
  const trekker = await resolveTrekker(c, code)
  if (!trekker) return c.json({ error: 'unauthorized' }, 401)

  const annotationID = c.req.param('annotationID')
  await c.env.DB.prepare(`DELETE FROM annotations WHERE id = ? AND trekker_id = ?`)
    .bind(annotationID, trekker.id).run()
  return c.json({ deleted: annotationID })
}

export async function addCustomItem(c: Context<{ Bindings: Env }>) {
  const code = c.req.param('code').toUpperCase()
  const trekker = await resolveTrekker(c, code)
  if (!trekker) return c.json({ error: 'unauthorized' }, 401)

  const { name, category } = await c.req.json<any>()
  if (!name) return c.json({ error: 'name required' }, 400)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO custom_items (id, trek_code, trekker_id, name, category) VALUES (?, ?, ?, ?, ?)`
  ).bind(id, code, trekker.id, name, category ?? null).run()

  return c.json({ id, trek_code: code, trekker_id: trekker.id, name, category }, 201)
}

export async function setItemWeight(c: Context<{ Bindings: Env }>) {
  const code = c.req.param('code').toUpperCase()
  const trekker = await resolveTrekker(c, code)
  if (!trekker) return c.json({ error: 'unauthorized' }, 401)

  const { item_name, custom_grams } = await c.req.json<any>()
  await c.env.DB.prepare(
    `INSERT INTO trekker_weights (trekker_id, item_name, custom_grams) VALUES (?, ?, ?)
     ON CONFLICT(trekker_id, item_name) DO UPDATE SET custom_grams=excluded.custom_grams`
  ).bind(trekker.id, item_name, custom_grams).run()

  return c.json({ trekker_id: trekker.id, item_name, custom_grams })
}

export async function getItemWeights(c: Context<{ Bindings: Env }>) {
  const { results } = await c.env.DB.prepare(`SELECT item_name, default_grams FROM item_weights`).all()
  return c.json(results)
}
