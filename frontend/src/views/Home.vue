<template>
  <div class="home">

    <!-- LOGGED-IN -->
    <template v-if="auth.user">
      <div class="page">
        <!-- top bar -->
        <div class="topbar">
          <div class="account-pill">
            <div class="avatar" :style="{ background: auth.user.color }">
              {{ auth.user.username[0].toUpperCase() }}
            </div>
            <span class="username">{{ auth.user.username }}</span>
          </div>
          <button class="btn btn-ghost btn-sm" @click="auth.logout()">log out</button>
        </div>

        <!-- lobby title -->
        <div class="lobby-title">
          <h1>your treks</h1>
          <div class="ping" :class="{ live: !loadingTreks }">
            <span class="ping-dot" />{{ loadingTreks ? 'loading…' : 'live' }}
          </div>
        </div>

        <!-- trek list area -->
        <div class="trek-area">
          <div v-if="loadingTreks" class="loading-rows">
            <div class="skeleton-row" v-for="i in 3" :key="i" />
          </div>

          <div v-else-if="myTreks.length === 0" class="empty-state">
            <span class="empty-icon">⛰</span>
            <p>no active treks yet</p>
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
                  <span class="trek-name">{{ trek.name }}</span>
                  <span v-if="trek.creator_id === auth.user!.id" class="host-badge">host</span>
                  <span class="code-pill">{{ trek.code }}</span>
                </div>
                <div class="trek-meta">
                  <span class="meta-tag">{{ trek.trek_type }}</span>
                  <span v-if="trek.camping" class="meta-tag">{{ trek.camping }}</span>
                  <span v-if="trek.weather" class="meta-tag">{{ trek.weather }}</span>
                </div>
              </div>
              <div class="players">
                <div
                  v-for="t in trek.trekkers" :key="t.id"
                  class="player-chip" :class="{ me: t.id === trek.my_trekker_id }"
                  :title="t.display_name"
                >
                  <span class="player-dot" :style="{ background: t.color }" />
                  <span class="player-name">{{ t.display_name }}</span>
                </div>
              </div>
              <span class="enter-arrow">→</span>
            </div>
          </div>
        </div>

        <!-- action footer -->
        <div class="actions">
          <button class="btn btn-primary" @click="openPanel('create')">+ new trek</button>
          <button class="btn btn-ghost" @click="openPanel('join')">join by code</button>
        </div>
      </div>
    </template>

    <!-- GUEST -->
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

    <!-- Modal -->
    <transition name="fade">
      <div v-if="mode !== 'none'" class="overlay" @click.self="mode = 'none'">
        <div class="modal">
          <button class="modal-close" @click="mode = 'none'">✕</button>

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
                  <option>Hike</option><option>Snow Hike</option><option>Snow</option><option>Bikepacking</option>
                </select>
              </div>
              <div class="field">
                <label>food source</label>
                <select v-model="form.food_source">
                  <option value="">Resupply</option><option>Self-sustaining</option>
                </select>
              </div>
              <div class="field">
                <label>camping</label>
                <select v-model="form.camping">
                  <option value="">Any</option><option>Tent</option><option>Hammock</option>
                </select>
              </div>
              <div class="field">
                <label>weather</label>
                <select v-model="form.weather">
                  <option>Mixed</option><option>Cold Mixed</option><option>Wet Mixed</option><option>Dry Mixed</option>
                </select>
              </div>
            </div>
            <template v-if="!auth.user">
              <div class="field">
                <label>your name</label>
                <input v-model="identity.name" placeholder="Trail name" />
              </div>
              <div class="field">
                <label>your color</label>
                <div class="color-row">
                  <button v-for="c in COLORS" :key="c" class="color-swatch"
                    :class="{ active: identity.color === c }" :style="{ background: c }"
                    @click="identity.color = c" />
                </div>
              </div>
            </template>
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
            <template v-if="!auth.user">
              <div class="field">
                <label>your name</label>
                <input v-model="identity.name" placeholder="Trail name" />
              </div>
              <div class="field">
                <label>your color</label>
                <div class="color-row">
                  <button v-for="c in COLORS" :key="c" class="color-swatch"
                    :class="{ active: identity.color === c }" :style="{ background: c }"
                    @click="identity.color = c" />
                </div>
              </div>
            </template>
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
const identity = reactive({ name: '', color: COLORS[0] })

onMounted(async () => {
  if (auth.user) {
    try { myTreks.value = await treksApi.listForUser(auth.user.id) } catch {}
    loadingTreks.value = false
  }
})

function openPanel(p: 'create' | 'join') { error.value = ''; mode.value = p }

async function create() {
  if (!form.name) { error.value = 'trek name required'; return }
  if (!auth.user && !identity.name) { error.value = 'your name required'; return }
  loading.value = true; error.value = ''
  try {
    await trekStore.createTrek({ ...form, guest_name: auth.user ? undefined : identity.name, user_id: auth.user?.id, color: auth.user?.color ?? identity.color })
    router.push(`/trek/${trekStore.trek!.code}`)
  } catch (e: any) { error.value = e?.response?.data?.error ?? 'failed to create trek' }
  finally { loading.value = false }
}

async function joinByCode() {
  const code = joinCode.value.trim().toUpperCase()
  if (!code || code.length !== 5) { error.value = 'enter a 5-letter code'; return }
  if (!auth.user && !identity.name) { error.value = 'your name required'; return }
  loading.value = true; error.value = ''
  try {
    await trekStore.joinTrek(code, { guest_name: auth.user ? undefined : identity.name, user_id: auth.user?.id, color: auth.user?.color ?? identity.color })
    router.push(`/trek/${code}`)
  } catch (e: any) { error.value = e?.response?.data?.error ?? 'failed to join trek' }
  finally { loading.value = false }
}
</script>

<style scoped>
/* ── Root ───────────────────────────────────────────────── */
.home {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  box-sizing: border-box;
  overflow: hidden;
}

/* ── Logged-in page ─────────────────────────────────────── */
.page {
  width: 100%;
  max-width: 680px;
  height: 100%;
  max-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem 0;
  box-sizing: border-box;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.account-pill {
  display: flex; align-items: center; gap: 0.6rem;
}
.avatar {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 0.9rem; color: #0f1117;
  flex-shrink: 0;
}
.username { font-weight: 600; font-size: 0.95rem; }

.lobby-title {
  display: flex; align-items: center; gap: 0.75rem;
  flex-shrink: 0;
}
.lobby-title h1 { font-size: 1.3rem; font-weight: 800; }
.ping {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.7rem; color: #555e78; text-transform: uppercase; letter-spacing: 0.06em;
}
.ping.live { color: #4fcc8a; }
.ping-dot {
  width: 6px; height: 6px; border-radius: 50%; background: currentColor;
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

/* trek area scrolls if overflow */
.trek-area {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.loading-rows { display: flex; flex-direction: column; gap: 0.6rem; }
.skeleton-row {
  height: 72px; border-radius: 10px;
  background: linear-gradient(90deg, #141620 25%, #1a1d2e 50%, #141620 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state {
  height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 0.5rem; color: #555e78;
}
.empty-icon { font-size: 2rem; }

.trek-list { display: flex; flex-direction: column; gap: 0.5rem; }

.trek-row {
  display: flex; align-items: center; gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  border: 1px solid #1e2030;
  background: #141620;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.trek-row:hover { border-color: #2a2d3e; background: #191c2a; }
.trek-row.is-creator { border-left: 3px solid #4f9cf9; }

.trek-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.trek-row-top { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
.trek-name { font-weight: 700; font-size: 0.95rem; }
.host-badge {
  font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  background: #1a2a3e; border: 1px solid #2980b9; color: #4f9cf9;
  padding: 1px 5px; border-radius: 4px;
}
.code-pill {
  font-size: 0.68rem; font-family: monospace; letter-spacing: 0.15em;
  color: #555e78; background: #0f1117; border: 1px solid #1e2030;
  padding: 1px 6px; border-radius: 4px;
}
.trek-meta { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.meta-tag {
  font-size: 0.68rem; color: #8b92a8;
  background: #1a1d2e; border: 1px solid #1e2030;
  padding: 1px 6px; border-radius: 4px;
}
.players { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.player-chip {
  display: flex; align-items: center; gap: 0.25rem;
  padding: 2px 7px; border-radius: 20px;
  background: #1a1d2e; border: 1px solid #1e2030;
  font-size: 0.72rem;
}
.player-chip.me { border-color: #2a2d3e; }
.player-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.player-name { color: #c8ccd8; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.enter-arrow { color: #555e78; font-size: 1rem; flex-shrink: 0; transition: color 0.15s, transform 0.15s; }
.trek-row:hover .enter-arrow { color: #e8eaf0; transform: translateX(3px); }

.actions {
  display: flex; gap: 0.6rem;
  padding-top: 0.75rem;
  border-top: 1px solid #1e2030;
  flex-shrink: 0;
}

/* ── Guest hero ─────────────────────────────────────────── */
.hero { text-align: center; max-width: 480px; }
.hero h1 { font-size: 2.6rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 1rem; }
.hero p { color: #8b92a8; font-size: 1rem; margin-bottom: 2rem; }
.hero-actions { display: flex; gap: 0.75rem; justify-content: center; }

/* ── Modal ──────────────────────────────────────────────── */
.overlay {
  position: fixed; inset: 0;
  background: rgba(10,11,18,0.75);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; backdrop-filter: blur(3px);
}
.modal {
  background: #141620; border: 1px solid #1e2030; border-radius: 14px;
  padding: 2rem; width: 100%; max-width: 480px;
  display: flex; flex-direction: column; gap: 1.25rem;
  position: relative; max-height: 90vh; overflow-y: auto;
}
.modal h2 { font-size: 1.1rem; font-weight: 700; }
.modal-close {
  position: absolute; top: 1rem; right: 1rem;
  background: none; border: none; color: #555e78;
  font-size: 1rem; cursor: pointer; padding: 4px; border-radius: 4px;
}
.modal-close:hover { color: #e8eaf0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Form ───────────────────────────────────────────────── */
.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field label { font-size: 0.78rem; color: #8b92a8; text-transform: uppercase; letter-spacing: 0.05em; }
.field input, .field select { width: 100%; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.color-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.color-swatch { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; transition: border-color 0.15s, transform 0.15s; cursor: pointer; }
.color-swatch.active { border-color: #fff; transform: scale(1.15); }
.error { color: #f97f4f; font-size: 0.85rem; }

@media (max-width: 600px) {
  .players { display: none; }
  .grid-2 { grid-template-columns: 1fr; }
  .hero h1 { font-size: 2rem; }
  .hero-actions { flex-direction: column; }
}
</style>
