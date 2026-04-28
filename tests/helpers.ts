export const BASE = 'https://treklist-api.ixil-miniussi.workers.dev'

export async function api(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['X-Session-Token'] = token
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json: any
  try { json = JSON.parse(text) } catch { json = { _raw: text } }
  if (!res.ok) throw Object.assign(new Error(json?.error ?? text), { status: res.status, body: json })
  return json
}

export const get  = (p: string, t?: string)              => api('GET',    p, undefined, t)
export const post = (p: string, b: unknown, t?: string)  => api('POST',   p, b, t)
export const patch = (p: string, b: unknown, t?: string) => api('PATCH',  p, b, t)
export const del  = (p: string, t?: string)              => api('DELETE', p, undefined, t)

/** Unique suffix to avoid collisions between test runs */
export const uid = () => Math.random().toString(36).slice(2, 8)
