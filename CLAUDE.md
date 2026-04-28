# Treklist

Collaborative trek packing coordinator. Trekkers share a 5-letter code, mark item statuses, and coordinate who brings what.

## Architecture

| Layer | Location | Tech |
|---|---|---|
| Frontend | `frontend/` | Vue 3 + TypeScript + Vite |
| Backend | `worker/` | Cloudflare Worker (Hono) + D1 (SQLite) |
| Tests | `tests/` | Vitest, hits live production API |

**Frontend** is deployed to **Cloudflare Pages** (`treklist.pages.dev`).  
**Backend** is deployed as a **Cloudflare Worker** (`treklist-api.ixil-miniussi.workers.dev`).  
The worker uses a D1 database named `treklist` (id: `fd9c4605-f329-4ff7-8e10-3b4970d1a877`).

## Testing

Tests run against the **live production API** — no local mock. Each run creates isolated users/treks via unique suffixes so runs don't collide.

```bash
cd tests
npm install      # first time only
npm test         # run all 45 tests once
npm run test:watch  # watch mode
```

Test files:
- `01-auth.test.ts` — register, login, profile read/update
- `02-treks.test.ts` — create, read, list, close/archive
- `03-guests.test.ts` — guest join, resume, kick
- `04-items.test.ts` — statuses, provisions, annotations, custom items, weights

Test accounts (already registered on prod):
- `test1@treklist.dev` / `testpass123` (username: `test-1`, color: blue)
- `test2@treklist.dev` / `testpass123` (username: `test-2`, color: orange)

## Deploying

Always build the frontend before deploying it.

### Frontend only

```bash
cd frontend
npm run build
cd ../worker
npx wrangler pages deploy ../frontend/dist --project-name treklist
```

### Backend (worker) only

```bash
cd worker
npx wrangler deploy src/index.ts
```

### Both (full deploy)

```bash
cd frontend && npm run build && cd ../worker
npx wrangler deploy src/index.ts
npx wrangler pages deploy ../frontend/dist --project-name treklist
```

The `wrangler` binary lives in `worker/node_modules`. Always run wrangler commands from inside `worker/`.

## Committing

Standard flow — commit then push:

```bash
git add <files>
git commit -m "short description"
git push origin main
```

The Cloudflare Pages project has **no GitHub integration** — it does NOT auto-deploy on push. You must manually run the pages deploy command above after every push that changes the frontend.

The worker also does not auto-deploy — run `wrangler deploy` manually when the worker changes.

### What goes in a commit message

- One concise line describing the change (what + why if non-obvious)
- No need to list every file touched

## Key files

```
frontend/src/
  views/
    Home.vue          — lobby / profile page (logged-in) or hero (guest)
    Trek.vue          — main checklist view, identity gate for guests
    Profile.vue       — account settings
    Join.vue          — join by code (standalone route)
  components/
    StatusPicker.vue  — owner's status cell (cycles + SlotCapsule)
    StatusBadge.vue   — other trekkers' status cell (read-only + SlotCapsule)
    StatusCell.vue    — legacy simple cycle cell (no longer used in Trek.vue)
    SlotCapsule.vue   — provision slot cards with +/- and drag-to-claim
  stores/
    trek.ts           — trek state, polling, session token per-trek persistence
    auth.ts           — user auth state
  api/
    treks.ts          — all trek/item API calls
    auth.ts           — auth API calls
    client.ts         — axios instance, attaches X-Session-Token header

worker/src/
  index.ts            — Hono app, all route registrations
  handlers/
    treks.ts          — trek CRUD, guest resume, user trek list
    items.ts          — statuses, provisions, claims, annotations, weights
    auth.ts           — register, login, profile
```

## Session token behaviour

Session tokens are **per-trek per-trekker** (not global). The store persists:
- `session_token` — active token (global, overwritten on navigation)
- `session_token_<code>` — per-trek token (localStorage, survives refresh)
- `my_trekker_<code>` — per-trek trekker identity (sessionStorage)

`loadTrek(code)` automatically restores both from the per-trek keys so close/kick/status-set always use the right token.

## Database migrations

Migration SQL lives in `migrations/`. To apply to the remote D1:

```bash
cd worker
npx wrangler d1 execute treklist --remote --file=../migrations/<file>.sql
```
