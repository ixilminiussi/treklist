<template>
  <div class="home">

    <!-- ── LOGGED IN ────────────────────────────────────── -->
    <template v-if="auth.user">

      <!-- Left: profile -->
      <aside class="profile">
        <div class="profile-top">
          <div class="avatar" :style="{ background: auth.user.color }">
            {{ auth.user.username[0].toUpperCase() }}
          </div>
          <div class="profile-name">
            <span class="username">{{ auth.user.username }}</span>
            <span class="email">{{ auth.user.email }}</span>
          </div>
        </div>

        <div class="profile-fields">
          <div class="pf-row" v-for="field in profileFields" :key="field.key">
            <span class="pf-label">{{ field.label }}</span>
            <template v-if="editing === field.key">
              <input
                class="pf-input"
                v-model="editVal"
                :type="field.inputType ?? 'text'"
                :placeholder="field.placeholder ?? ''"
                @keyup.enter="saveEdit(field)"
                @keyup.escape="editing = null"
                autofocus
              />
              <button class="pf-action save" @click="saveEdit(field)">✓</button>
              <button class="pf-action cancel" @click="editing = null">✕</button>
            </template>
            <template v-else>
              <span class="pf-val">{{ field.display() || '—' }}</span>
              <button class="pf-action edit" @click="startEdit(field)">✎</button>
            </template>
          </div>

          <!-- color picker inline -->
          <div class="pf-row pf-color-row">
            <span class="pf-label">color</span>
            <div class="color-swatches">
              <button
                v-for="c in COLORS" :key="c"
                class="swatch" :class="{ active: auth.user.color === c }"
                :style="{ background: c }"
                @click="saveColor(c)"
              />
            </div>
          </div>
        </div>

        <button class="btn btn-ghost btn-sm logout-btn" @click="auth.logout()">log out</button>
      </aside>

      <!-- Right: lobby -->
      <main class="lobby">
        <div class="lobby-header">
          <h1>your treks</h1>
          <div class="ping" :class="{ live: !loadingTreks }">
            <span class="ping-dot" />{{ loadingTreks ? 'loading…' : 'live' }}
          </div>
          <div class="lobby-actions">
            <button class="btn btn-primary btn-sm" @click="openPanel('create')">+ new trek</button>
            <button class="btn btn-ghost btn-sm" @click="openPanel('join')">join by code</button>
          </div>
        </div>

        <div class="trek-area">
          <div v-if="loadingTreks" class="loading-rows">
            <div class="skeleton-row" v-for="i in 3" :key="i" />
          </div>
          <div v-else-if="myTreks.length === 0" class="empty-state">
            <span>⛰</span>
            <p>no active treks yet</p>
          </div>
          <div v-else class="trek-list">
            <div
              v-for="trek in myTreks" :key="trek.code"
              class="trek-row" :class="{ 'is-creator': trek.creator_id === auth.user!.id }"
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
                <div v-for="t in trek.trekkers" :key="t.id"
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

      </main>
    </template>

    <!-- ── GUEST ─────────────────────────────────────────── -->
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

    <!-- ── Modal ─────────────────────────────────────────── -->
    <transition name="fade">
      <div v-if="mode !== 'none'" class="overlay" @click.self="mode = 'none'">
        <div class="modal">
          <button class="modal-close" @click="mode = 'none'">✕</button>

          <template v-if="mode === 'create'">
            <h2>create trek</h2>
            <div class="field"><label>trek name</label><input v-model="form.name" placeholder="Auvergne summer 2026" /></div>
            <div class="grid-2">
              <div class="field"><label>trek type</label>
                <select v-model="form.trek_type"><option>Hike</option><option>Snow Hike</option><option>Snow</option><option>Bikepacking</option></select>
              </div>
              <div class="field"><label>food source</label>
                <select v-model="form.food_source"><option value="">Resupply</option><option>Self-sustaining</option></select>
              </div>
              <div class="field"><label>camping</label>
                <select v-model="form.camping"><option value="">Any</option><option>Tent</option><option>Hammock</option></select>
              </div>
              <div class="field"><label>weather</label>
                <select v-model="form.weather"><option>Mixed</option><option>Cold Mixed</option><option>Wet Mixed</option><option>Dry Mixed</option></select>
              </div>
            </div>
            <template v-if="!auth.user">
              <div class="field"><label>your name</label><input v-model="guestName" placeholder="Trail name" /></div>
              <div class="field"><label>your color</label>
                <div class="color-row">
                  <button v-for="c in COLORS" :key="c" class="swatch" :class="{ active: guestColor === c }" :style="{ background: c }" @click="guestColor = c" />
                </div>
              </div>
            </template>
            <div v-if="error" class="error">{{ error }}</div>
            <button class="btn btn-primary" :disabled="loading" @click="create">{{ loading ? 'creating…' : 'create trek' }}</button>
          </template>

          <template v-else-if="mode === 'join'">
            <h2>join trek</h2>
            <div class="field"><label>trek code</label>
              <input v-model="joinCode" placeholder="ABCDE" maxlength="5" style="text-transform:uppercase;letter-spacing:0.2em;" />
            </div>
            <template v-if="!auth.user">
              <div class="field"><label>your name</label><input v-model="guestName" placeholder="Trail name" /></div>
              <div class="field"><label>your color</label>
                <div class="color-row">
                  <button v-for="c in COLORS" :key="c" class="swatch" :class="{ active: guestColor === c }" :style="{ background: c }" @click="guestColor = c" />
                </div>
              </div>
            </template>
            <div v-if="error" class="error">{{ error }}</div>
            <button class="btn btn-primary" :disabled="loading" @click="joinByCode">{{ loading ? 'joining…' : 'join trek' }}</button>
          </template>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
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
const guestName = ref('')
const guestColor = ref(COLORS[0])

const form = reactive({ name: '', trek_type: 'Hike', food_source: '', camping: '', weather: 'Mixed', temperature: 'Mixed' })

// ── Profile editing ──────────────────────────────────────
const editing = ref<string | null>(null)
const editVal = ref('')

interface ProfileField {
  key: string
  label: string
  inputType?: string
  placeholder?: string
  display: () => string
  apiKey: string
}

const profileFields = computed<ProfileField[]>(() => {
  if (!auth.user) return []
  return [
    { key: 'username', label: 'username', placeholder: 'trail name', display: () => auth.user!.username, apiKey: 'username' },
    { key: 'email',    label: 'email',    inputType: 'email', display: () => auth.user!.email, apiKey: 'email' },
    { key: 'weight_kg', label: 'weight', inputType: 'number', placeholder: 'kg', display: () => auth.user!.weight_kg ? auth.user!.weight_kg + ' kg' : '', apiKey: 'weight_kg' },
    { key: 'birthday', label: 'birthday', inputType: 'date', display: () => auth.user!.birthday ?? '', apiKey: 'birthday' },
    { key: 'sex', label: 'sex', placeholder: 'M / F / X', display: () => auth.user!.sex ?? '', apiKey: 'sex' },
  ]
})

function startEdit(field: ProfileField) {
  editing.value = field.key
  const raw = (auth.user as any)?.[field.key]
  editVal.value = raw != null ? String(raw) : ''
}

async function saveEdit(field: ProfileField) {
  if (!auth.user) return
  const val = field.inputType === 'number' ? Number(editVal.value) : editVal.value
  await auth.updateProfile({ [field.apiKey]: val })
  editing.value = null
}

async function saveColor(c: string) {
  await auth.updateProfile({ color: c })
}

// ── Trek actions ─────────────────────────────────────────
onMounted(async () => {
  if (auth.user) {
    try { myTreks.value = await treksApi.listForUser(auth.user.id) } catch {}
    loadingTreks.value = false
  }
})

function openPanel(p: 'create' | 'join') { error.value = ''; mode.value = p }

async function create() {
  if (!form.name) { error.value = 'trek name required'; return }
  if (!auth.user && !guestName.value) { error.value = 'your name required'; return }
  loading.value = true; error.value = ''
  try {
    await trekStore.createTrek({ ...form, guest_name: auth.user ? undefined : guestName.value, user_id: auth.user?.id, color: auth.user?.color ?? guestColor.value })
    router.push(`/trek/${trekStore.trek!.code}`)
  } catch (e: any) { error.value = e?.response?.data?.error ?? 'failed' }
  finally { loading.value = false }
}

async function joinByCode() {
  const code = joinCode.value.trim().toUpperCase()
  if (code.length !== 5) { error.value = 'enter a 5-letter code'; return }
  if (!auth.user && !guestName.value) { error.value = 'your name required'; return }
  loading.value = true; error.value = ''
  try {
    await trekStore.joinTrek(code, { guest_name: auth.user ? undefined : guestName.value, user_id: auth.user?.id, color: auth.user?.color ?? guestColor.value })
    router.push(`/trek/${code}`)
  } catch (e: any) { error.value = e?.response?.data?.error ?? 'failed' }
  finally { loading.value = false }
}
</script>

<style scoped>
/* ── Root: fills the space below the nav exactly ───────── */
.home {
  display: flex;
  height: calc(100vh - 56px);
  overflow: hidden;
}

/* ── Profile sidebar ────────────────────────────────────── */
.profile {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid #1e2030;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.75rem 1.5rem;
  overflow-y: auto;
}

.profile-top {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}
.avatar {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1.2rem; color: #0f1117;
  flex-shrink: 0;
}
.profile-name { display: flex; flex-direction: column; min-width: 0; }
.username { font-weight: 700; font-size: 1rem; }
.email { font-size: 0.72rem; color: #555e78; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* profile fields */
.profile-fields { display: flex; flex-direction: column; gap: 0.1rem; }

.pf-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid #141820;
  min-height: 36px;
}
.pf-label {
  font-size: 0.7rem; color: #555e78; text-transform: uppercase;
  letter-spacing: 0.05em; width: 68px; flex-shrink: 0;
}
.pf-val { flex: 1; font-size: 0.88rem; color: #c8ccd8; }
.pf-input {
  flex: 1; font-size: 0.85rem; padding: 0.2rem 0.5rem;
  height: 28px; min-width: 0;
}
.pf-action {
  background: none; border: none; padding: 3px 5px;
  border-radius: 4px; font-size: 0.85rem; cursor: pointer;
  line-height: 1; transition: color 0.12s, background 0.12s;
  color: #555e78;
}
.pf-action.edit:hover { color: #e8eaf0; }
.pf-action.save { color: #4fcc8a; }
.pf-action.save:hover { background: #1a2a1a; }
.pf-action.cancel { color: #e74c3c; }
.pf-action.cancel:hover { background: #2a1a1a; }

.pf-color-row { flex-wrap: wrap; gap: 0.4rem; align-items: center; }
.color-swatches { display: flex; flex-wrap: wrap; gap: 5px; }
.swatch {
  width: 22px; height: 22px; border-radius: 50%;
  border: 2px solid transparent; cursor: pointer;
  transition: border-color 0.12s, transform 0.12s;
}
.swatch.active { border-color: #fff; transform: scale(1.2); }

.logout-btn { align-self: flex-start; margin-top: auto; }

/* ── Lobby ──────────────────────────────────────────────── */
.lobby {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.75rem 2rem;
  gap: 1rem;
}

.lobby-header {
  display: flex; align-items: center; gap: 0.75rem;
  flex-shrink: 0; flex-wrap: wrap;
}
.lobby-actions { display: flex; gap: 0.5rem; margin-left: auto; }
.lobby-header h1 { font-size: 1.3rem; font-weight: 800; }
.ping {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.7rem; color: #555e78; text-transform: uppercase; letter-spacing: 0.06em;
}
.ping.live { color: #4fcc8a; }
.ping-dot {
  width: 6px; height: 6px; border-radius: 50%; background: currentColor;
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

.trek-area { flex: 1; overflow-y: auto; min-height: 0; }

.loading-rows { display: flex; flex-direction: column; gap: 0.6rem; }
.skeleton-row {
  height: 72px; border-radius: 10px;
  background: linear-gradient(90deg, #141620 25%, #1a1d2e 50%, #141620 75%);
  background-size: 200% 100%; animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

.empty-state {
  height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 0.5rem; color: #555e78; font-size: 0.9rem;
}
.empty-state span { font-size: 2rem; }

.trek-list { display: flex; flex-direction: column; gap: 0.5rem; }

.trek-row {
  display: flex; align-items: center; gap: 1rem;
  padding: 0.85rem 1rem; border-radius: 10px;
  border: 1px solid #1e2030; background: #141620;
  cursor: pointer; transition: border-color 0.15s, background 0.15s;
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
  background: #1a1d2e; border: 1px solid #1e2030; font-size: 0.72rem;
}
.player-chip.me { border-color: #2a2d3e; }
.player-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.player-name { color: #c8ccd8; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.enter-arrow { color: #555e78; font-size: 1rem; flex-shrink: 0; transition: color 0.15s, transform 0.15s; }
.trek-row:hover .enter-arrow { color: #e8eaf0; transform: translateX(3px); }


/* ── Guest hero ─────────────────────────────────────────── */
.home > .hero { margin: auto; text-align: center; max-width: 480px; }
.hero h1 { font-size: 2.6rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 1rem; }
.hero p { color: #8b92a8; font-size: 1rem; margin-bottom: 2rem; }
.hero-actions { display: flex; gap: 0.75rem; justify-content: center; }

/* ── Modal ──────────────────────────────────────────────── */
.overlay {
  position: fixed; inset: 0;
  background: rgba(10,11,18,0.75); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; z-index: 200;
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
  background: none; border: none; color: #555e78; font-size: 1rem;
  cursor: pointer; padding: 4px; border-radius: 4px;
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
.error { color: #f97f4f; font-size: 0.85rem; }
</style>
