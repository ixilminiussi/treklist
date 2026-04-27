import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { register, login, getProfile, updateProfile } from './handlers/auth'
import { createTrek, joinTrek, getTrek, closeTrek, kickTrekker } from './handlers/treks'
import {
  getTrekItems, setItemStatus, upsertProvision, claimProvision,
  unclaimProvision, addAnnotation, deleteAnnotation, addCustomItem,
  setItemWeight, getItemWeights,
} from './handlers/items'
import checklist from './data/checklist.json'

export interface Env {
  DB: D1Database
  ALLOWED_ORIGIN: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', async (c, next) => {
  const allowed = (c.env.ALLOWED_ORIGIN || '*').split(',').map(s => s.trim())
  const origin = (o: string) => {
    if (allowed.includes('*')) return o
    if (allowed.includes(o)) return o
    // allow any *.treklist.pages.dev preview URL
    if (o.endsWith('.treklist.pages.dev')) return o
    return allowed[0]
  }
  return cors({ origin, allowHeaders: ['Content-Type', 'X-Session-Token'], allowMethods: ['GET','POST','PATCH','DELETE','OPTIONS'] })(c, next)
})

// Auth
app.post('/api/auth/register', register)
app.post('/api/auth/login', login)

// Users
app.get('/api/users/:userID', getProfile)
app.patch('/api/users/:userID', updateProfile)

// Treks
app.post('/api/treks', createTrek)
app.get('/api/treks/:code', getTrek)
app.post('/api/treks/:code/join', joinTrek)
app.post('/api/treks/:code/close', closeTrek)
app.delete('/api/treks/:code/trekkers/:trekkerID', kickTrekker)

// Items
app.get('/api/treks/:code/items', getTrekItems)
app.post('/api/treks/:code/items/status', setItemStatus)
app.post('/api/treks/:code/items/provision', upsertProvision)
app.post('/api/treks/:code/items/claim', claimProvision)
app.delete('/api/treks/:code/items/provision/:provisionID/claim', unclaimProvision)
app.post('/api/treks/:code/items/annotate', addAnnotation)
app.delete('/api/treks/:code/annotations/:annotationID', deleteAnnotation)
app.post('/api/treks/:code/items/custom', addCustomItem)
app.post('/api/treks/:code/items/weight', setItemWeight)

// Static data
app.get('/api/checklist', (c) => c.json(checklist))
app.get('/api/weights', getItemWeights)

export default app
