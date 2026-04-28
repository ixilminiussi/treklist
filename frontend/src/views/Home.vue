<template>
  <div class="home" :class="{ 'has-user': !!auth.user }">

    <!-- LOGGED-IN: lobby layout -->
    <template v-if="auth.user">
      <aside class="sidebar">
        <div class="account-card">
          <div class="account-avatar" :style="{ background: auth.user.color }">
            {{ auth.user.username[0].toUpperCase() }}
          </div>
          <div class="account-info">
            <div class="account-name">{{ auth.user.username }}</div>
            <div class="account-email">{{ auth.user.email }}</div>
          </div>
          <router-link to="/profile" class="edit-profile-btn" title="edit profile">✎</router-link>
        </div>

        <div class="sidebar-stats">
          <div class="stat">
            <span class="stat-val">{{ myTreks.length }}</span>
            <span class="stat-label">active treks</span>
          </div>
          <div class="stat">
            <span class="stat-val">{{ auth.user.trek_type ?? auth.user.sex ?? '—' }}</span>
            <span class="stat-label">{{ auth.user.weight_kg ? auth.user.weight_kg + ' kg' : 'no weight set' }}</span>
          </div>
        </div>

        <button class="btn btn-ghost btn-sm logout-btn" @click="auth.logout(); router.push('/')">log out</button>
      </aside>

      <main class="lobby">
        <header class="lobby-header">
          <h1>your treks</h1>
          <div class="lobby-ping" :class="{ live: !loadingTreks }">
            <span class="ping-dot" />{{ loadingTreks ? 'loading…' : 'live' }}
          </div>
        </header>

        <div v-if="loadingTreks" class="lobby-loading">
          <div class="loading-rows">
            <div class="skeleton-row" v-for="i in 3" :key="i" />
          </div>
        </div>

        <div v-else-if="myTreks.length === 0" class="lobby-empty">
          <div class="empty-icon">⛰</div>
          <p>no active treks — create or join one below</p>
        </div>

        <div v-else class="trek-list">
          <div
            v-for="trek in myTreks"
            :key="trek.code"
            class="trek-row"
            :class="{ 'is-creator': trek.creator_id === auth.user!.id }"
            @click="router.push(`/trek/${trek.code}`)"
          >
            <div class="trek-row-main">
              <div class="trek-row-top">
                <span class="trek-row-name">{{ trek.name }}</span>
                <span v-if="trek.creator_id === auth.user!.id" class="host-badge">host</span>
                <span class="trek-code-pill">{{ trek.code }}</span>
              </div>
              <div class="trek-row-meta">
                <span class="meta-tag">{{ trek.trek_type }}</span>
                <span v-if="trek.camping" class="meta-tag">{{ trek.camping }}</span>
                <span v-if="trek.weather" class="meta-tag">{{ trek.weather }}</span>
                <span v-if="trek.food_source" class="meta-tag">{{ trek.food_source }}</span>
              </div>
            </div>

            <div class="trek-row-players">
              <div
                v-for="t in trek.trekkers"
                :key="t.id"
                class="player-slot"
                :class="{ me: t.id === trek.my_trekker_id }"
                :title="t.display_name"
              >
                <div class="player-dot" :style="{ background: t.color }" />
                <span class="player-name">{{ t.display_name }}</span>
                <span v-if="t.id === trek.my_trekker_id" class="you-tag">you</span>
              </div>
            </div>

            <div class="trek-row-enter">
              <span class="enter-arrow">→</span>
            </div>
          </div>
        </div>

        <footer class="lobby-footer">
          <button class="btn btn-primary" @click="openPanel('create')">+ new trek</button>
          <button class="btn btn-ghost" @click="openPanel('join')">join by code</button>
        </footer>
      </main>
    </template>

    <!-- GUEST: simple hero -->
    <template v-else>
      <div class="hero">
        <h1>plan together.<br>pack smarter.</h1>
        <p>Create a trek, share a 5-letter code, coordinate who brings what.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" @click="openPanel('create')">new trek</button>
          <button class="btn btn-ghost" @click="openPanel('join')">join a trek</button>
        </div>
      </div>
    </template>

    <!-- Slide-over panel -->
    <transition name="panel-slide">
      <div v-if="mode !== 'none'" class="panel-overlay" @click.self="mode = 'none'">
        <div class="panel">
          <button class="panel-close" @click="mode = 'none'">✕</button>

          <template v-if="mode === 'create'">
            <h2>create trek</h2>
            <div class="field">
              <label>trek name</label>
              <input v-model="form.name" placeholder="Auvergne summer 2026" />
            </div>
            <div class="grid-2">
              <div class="field">
                <label>trek type</label>
                <select v-model="form.trek_type">
                  <option>Hike</option>
                  <option>Snow Hike</option>
                  <option>Snow</option>
                  <option>Bikepacking</option>
                </select>
              </div>
              <div class="field">
                <label>food source</label>
                <select v-model="form.food_source">
                  <option value="">Resupply</option>
                  <option>Self-sustaining</option>
                </select>
              </div>
              <div class="field">
                <label>camping</label>
                <select v-model="form.camping">
                  <option value="">Any</option>
                  <option>Tent</option>
                  <option>Hammock</option>
                </select>
              </div>
              <div class="field">
                <label>weather</label>
                <select v-model="form.weather">
                  <option>Mixed</option>
                  <option>Cold Mixed</option>
                  <option>Wet Mixed</option>
                  <option>Dry Mixed</option>
                </select>
              </div>
            </div>
            <div v-if="!auth.user" class="field">
              <label>your name</label>
              <input v-model="identity.name" placeholder="Trail name" />
            </div>
            <div v-if="!auth.user" class="field">
              <label>your color</label>
              <div class="color-row">
                <button v-for="c in COLORS" :key="c" class="color-swatch"
                  :class="{ active: identity.color === c }" :style="{ background: c }"
                  @click="identity.color = c" />
              </div>
            </div>
            <div v-if="error" class="error">{{ error }}</div>
            <button class="btn btn-primary" :disabled="loading" @click="create">
              {{ loading ? 'creating…' : 'create trek' }}
            </button>
          </template>

          <template v-else-if="mode === 'join'">
            <h2>join trek</h2>
            <div class="field">
              <label>trek code</label>
              <input v-model="joinCode" placeholder="ABCDE" maxlength="5"
                style="text-transform:uppercase;letter-spacing:0.2em;" />
            </div>
            <div v-if="!auth.user" class="field">
              <label>your name</label>
              <input v-model="identity.name" placeholder="Trail name" />
            </div>
            <div v-if="!auth.user" class="field">
              <label>your color</label>
              <div class="color-row">
                <button v-for="c in COLORS" :key="c" class="color-swatch"
                  :class="{ active: identity.color === c }" :style="{ background: c }"
                  @click="identity.color = c" />
              </div>
            </div>
            <div v-if="error" class="error">{{ error }}</div>
            <button class="btn btn-primary" :disabled="loading" @click="joinByCode">
              {{ loading ? 'joining…' : 'join trek' }}
            </button>
          </template>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useTrekStore } from '../stores/trek'
import { treksApi, type LobbyTrek } from '../api/treks'

const COLORS = ['#4f9cf9','#f97f4f','#4fcc8a','#c97ff9','#f9cf4f','#f94f7f','#4ff9f0','#a0aec0']

const router = useRouter()
const auth = useAuthStore()
const trekStore = useTrekStore()

const mode = ref<'none'|'create'|'join'>('none')
const loading = ref(false)
const error = ref('')
const joinCode = ref('')
const myTreks = ref<LobbyTrek[]>([])
const loadingTreks = ref(true)

const form = reactive({ name: '', trek_type: 'Hike', food_source: '', camping: '', weather: 'Mixed', temperature: 'Mixed' })
const identity = reactive({ name: auth.user?.username ?? '', color: auth.user?.color ?? COLORS[0] })

onMounted(async () => {
  if (auth.user) {
    try {
      myTreks.value = await treksApi.listForUser(auth.user.id)
    } catch { /* silent */ }
    loadingTreks.value = false
  }
})

function openPanel(p: 'create' | 'join') {
  error.value = ''
  mode.value = p
}

async function create() {
  if (!form.name) { error.value = 'trek name required'; return }
  if (!auth.user && !identity.name) { error.value = 'your name required'; return }
  loading.value = true; error.value = ''
  try {
    await trekStore.createTrek({
      ...form,
      guest_name: auth.user ? undefined : identity.name,
      user_id: auth.user?.id,
      color: auth.user?.color ?? identity.color,
    })
    router.push(`/trek/${trekStore.trek!.code}`)
  } catch (e: any) {
    error.value = e?.response?.data?.error ?? 'failed to create trek'
  } finally {
    loading.value = false
  }
}

async function joinByCode() {
  const code = joinCode.value.trim().toUpperCase()
  if (!code || code.length !== 5) { error.value = 'enter a 5-letter code'; return }
  if (!auth.user && !identity.name) { error.value = 'your name required'; return }
  loading.value = true; error.value = ''
  try {
    await trekStore.joinTrek(code, {
      guest_name: auth.user ? undefined : identity.name,
      user_id: auth.user?.id,
      color: auth.user?.color ?? identity.color,
    })
    router.push(`/trek/${code}`)
  } catch (e: any) {
    error.value = e?.response?.data?.error ?? 'failed to join trek'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ── Layout ───────────────────────────────────────────── */
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
}
.home.has-user {
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0;
  padding: 0;
  max-width: 1100px;
  margin: 0 auto;
  min-height: 100vh;
}

/* ── Sidebar ──────────────────────────────────────────── */
.sidebar {
  width: 240px;
  flex-shrink: 0;
  padding: 2rem 1.25rem;
  border-right: 1px solid #1e2030;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.account-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.account-avatar {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1.1rem; color: #0f1117;
  flex-shrink: 0;
}
.account-info { flex: 1; min-width: 0; }
.account-name { font-weight: 700; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.account-email { font-size: 0.72rem; color: #555e78; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.edit-profile-btn {
  color: #555e78; font-size: 1rem; text-decoration: none;
  padding: 4px; border-radius: 4px; transition: color 0.12s;
}
.edit-profile-btn:hover { color: #e8eaf0; }

.sidebar-stats { display: flex; flex-direction: column; gap: 0.75rem; }
.stat { display: flex; flex-direction: column; gap: 0.1rem; }
.stat-val { font-size: 1.5rem; font-weight: 800; line-height: 1; }
.stat-label { font-size: 0.72rem; color: #555e78; text-transform: uppercase; letter-spacing: 0.05em; }

.logout-btn { margin-top: auto; align-self: flex-start; }

/* ── Lobby main ───────────────────────────────────────── */
.lobby {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 2rem 2rem 1.5rem;
}

.lobby-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.lobby-header h1 { font-size: 1.4rem; font-weight: 800; }
.lobby-ping {
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.72rem; color: #555e78; text-transform: uppercase; letter-spacing: 0.06em;
}
.lobby-ping.live { color: #4fcc8a; }
.ping-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Loading skeletons */
.loading-rows { display: flex; flex-direction: column; gap: 0.75rem; }
.skeleton-row {
  height: 80px; border-radius: 10px;
  background: linear-gradient(90deg, #141620 25%, #1a1d2e 50%, #141620 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.lobby-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.75rem; color: #555e78;
}
.empty-icon { font-size: 2.5rem; }

/* Trek rows */
.trek-list { display: flex; flex-direction: column; gap: 0.6rem; flex: 1; }

.trek-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  border: 1px solid #1e2030;
  background: #141620;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.trek-row:hover { border-color: #2a2d3e; background: #191c2a; }
.trek-row.is-creator { border-left: 3px solid #4f9cf9; }

.trek-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.trek-row-top { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.trek-row-name { font-weight: 700; font-size: 1rem; }
.host-badge {
  font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  background: #1a2a3e; border: 1px solid #2980b9; color: #4f9cf9;
  padding: 1px 6px; border-radius: 4px;
}
.trek-code-pill {
  font-size: 0.72rem; font-family: monospace; letter-spacing: 0.15em;
  color: #555e78; background: #0f1117; border: 1px solid #1e2030;
  padding: 1px 7px; border-radius: 4px;
}
.trek-row-meta { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.meta-tag {
  font-size: 0.72rem; color: #8b92a8;
  background: #1a1d2e; border: 1px solid #1e2030;
  padding: 1px 7px; border-radius: 4px;
}

.trek-row-players {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  max-width: 300px;
}
.player-slot {
  display: flex; align-items: center; gap: 0.3rem;
  padding: 3px 8px; border-radius: 20px;
  background: #1a1d2e; border: 1px solid #1e2030;
  font-size: 0.75rem;
}
.player-slot.me { border-color: #2a2d3e; background: #191c2e; }
.player-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.player-name { color: #c8ccd8; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.you-tag { font-size: 0.65rem; color: #4f9cf9; font-weight: 700; }

.trek-row-enter { color: #555e78; font-size: 1.1rem; transition: color 0.15s, transform 0.15s; }
.trek-row:hover .trek-row-enter { color: #e8eaf0; transform: translateX(3px); }

/* Footer */
.lobby-footer {
  display: flex;
  gap: 0.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid #1e2030;
  margin-top: 1.5rem;
}

/* ── Guest hero ───────────────────────────────────────── */
.hero { text-align: center; max-width: 500px; }
.hero h1 { font-size: 2.8rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 1rem; }
.hero p { color: #8b92a8; font-size: 1.05rem; margin-bottom: 2rem; }
.hero-actions { display: flex; gap: 0.75rem; justify-content: center; }

/* ── Panel slide-over ─────────────────────────────────── */
.panel-overlay {
  position: fixed; inset: 0;
  background: rgba(10, 11, 18, 0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
  backdrop-filter: blur(3px);
}
.panel {
  background: #141620;
  border: 1px solid #1e2030;
  border-radius: 14px;
  padding: 2rem;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  position: relative;
}
.panel h2 { font-size: 1.1rem; font-weight: 700; }
.panel-close {
  position: absolute; top: 1rem; right: 1rem;
  background: none; border: none; color: #555e78;
  font-size: 1rem; cursor: pointer; padding: 4px;
  border-radius: 4px; transition: color 0.12s;
}
.panel-close:hover { color: #e8eaf0; }

.panel-slide-enter-active, .panel-slide-leave-active { transition: opacity 0.18s, transform 0.18s; }
.panel-slide-enter-from, .panel-slide-leave-to { opacity: 0; transform: scale(0.97); }

/* ── Shared form bits ─────────────────────────────────── */
.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field label { font-size: 0.8rem; color: #8b92a8; text-transform: uppercase; letter-spacing: 0.05em; }
.field input, .field select { width: 100%; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.color-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.color-swatch { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; transition: border-color 0.15s, transform 0.15s; }
.color-swatch.active { border-color: #fff; transform: scale(1.15); }
.error { color: #f97f4f; font-size: 0.85rem; }

/* ── Mobile ───────────────────────────────────────────── */
@media (max-width: 700px) {
  .home.has-user { flex-direction: column; }
  .sidebar { width: 100%; min-height: unset; border-right: none; border-bottom: 1px solid #1e2030; padding: 1.25rem; flex-direction: row; flex-wrap: wrap; align-items: center; }
  .sidebar-stats { flex-direction: row; gap: 1.5rem; }
  .logout-btn { margin-top: 0; margin-left: auto; }
  .lobby { padding: 1.25rem; }
  .trek-row-players { display: none; }
  .hero h1 { font-size: 2rem; }
  .hero-actions { flex-direction: column; }
  .grid-2 { grid-template-columns: 1fr; }
}
</style>
