<template>
  <div class="home">
    <div class="hero">
      <h1>plan together.<br>pack smarter.</h1>
      <p>Create a trek, share a 5-letter code, coordinate who brings what.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" @click="mode = 'create'">new trek</button>
        <button class="btn btn-ghost" @click="mode = 'join'">join a trek</button>
      </div>
    </div>

    <div v-if="mode === 'create'" class="panel">
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

      <div class="field">
        <label>your name</label>
        <input v-model="identity.name" :placeholder="auth.user?.username ?? 'Trail name'" :disabled="!!auth.user" />
      </div>

      <div class="field">
        <label>your color</label>
        <div class="color-row">
          <button
            v-for="c in COLORS"
            :key="c"
            class="color-swatch"
            :class="{ active: identity.color === c }"
            :style="{ background: c }"
            @click="identity.color = c"
          />
        </div>
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <button class="btn btn-primary" :disabled="loading" @click="create">
        {{ loading ? 'creating…' : 'create trek' }}
      </button>
    </div>

    <div v-if="mode === 'join'" class="panel">
      <h2>join trek</h2>
      <div class="field">
        <label>trek code</label>
        <input v-model="joinCode" placeholder="ABCDE" maxlength="5" style="text-transform:uppercase;letter-spacing:0.2em;" />
      </div>
      <div class="field">
        <label>your name</label>
        <input v-model="identity.name" :placeholder="auth.user?.username ?? 'Trail name'" :disabled="!!auth.user" />
      </div>
      <div class="field">
        <label>your color</label>
        <div class="color-row">
          <button
            v-for="c in COLORS"
            :key="c"
            class="color-swatch"
            :class="{ active: identity.color === c }"
            :style="{ background: c }"
            @click="identity.color = c"
          />
        </div>
      </div>
      <div class="field">
        <label>weight (kg) <span class="optional">optional</span></label>
        <input v-model.number="identity.weight_kg" type="number" min="20" max="300" step="0.5" placeholder="e.g. 70" />
      </div>
      <div class="field">
        <label>biological sex <span class="optional">optional — used for calorie estimates</span></label>
        <div class="radio-row">
          <label class="radio-label" v-for="opt in SEX_OPTIONS" :key="opt.value">
            <input type="radio" :value="opt.value" v-model="identity.sex" />
            {{ opt.label }}
          </label>
        </div>
      </div>
      <div class="field">
        <label>date of birth <span class="optional">optional — used for calorie estimates</span></label>
        <input v-model="identity.birthday" type="date" />
      </div>
      <div v-if="error" class="error">{{ error }}</div>
      <button class="btn btn-primary" :disabled="loading" @click="join">
        {{ loading ? 'joining…' : 'join trek' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useTrekStore } from '../stores/trek'

const COLORS = ['#4f9cf9','#f97f4f','#4fcc8a','#c97ff9','#f9cf4f','#f94f7f','#4ff9f0','#a0aec0']
const SEX_OPTIONS = [
  { value: 'M', label: 'male' },
  { value: 'F', label: 'female' },
  { value: 'X', label: 'other / prefer not to say' },
]

const router = useRouter()
const auth = useAuthStore()
const trekStore = useTrekStore()

const mode = ref<'none'|'create'|'join'>('none')
const loading = ref(false)
const error = ref('')
const joinCode = ref('')

const form = reactive({
  name: '',
  trek_type: 'Hike',
  food_source: '',
  camping: '',
  weather: 'Mixed',
  temperature: 'Mixed',
})

const identity = reactive({
  name: auth.user?.username ?? '',
  color: auth.user?.color ?? COLORS[0],
  weight_kg: auth.user?.weight_kg as number | undefined,
  sex: auth.user?.sex ?? '' as any,
  gender: auth.user?.gender ?? '',
  birthday: auth.user?.birthday ?? '',
})

async function create() {
  if (!form.name) { error.value = 'trek name required'; return }
  if (!identity.name) { error.value = 'your name required'; return }
  loading.value = true; error.value = ''
  try {
    await trekStore.createTrek({
      ...form,
      guest_name: auth.user ? undefined : identity.name,
      user_id: auth.user?.id,
      color: identity.color,
    })
    router.push(`/trek/${trekStore.trek!.code}`)
  } catch (e: any) {
    error.value = e?.response?.data?.error ?? 'failed to create trek'
  } finally {
    loading.value = false
  }
}

async function join() {
  const code = joinCode.value.trim().toUpperCase()
  if (!code || code.length !== 5) { error.value = 'enter a 5-letter code'; return }
  if (!identity.name) { error.value = 'your name required'; return }
  loading.value = true; error.value = ''
  try {
    await trekStore.joinTrek(code, {
      guest_name: auth.user ? undefined : identity.name,
      user_id: auth.user?.id,
      color: identity.color,
      weight_kg: identity.weight_kg || undefined,
      sex: identity.sex || undefined,
      gender: identity.gender || undefined,
      birthday: identity.birthday || undefined,
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
.home {
  max-width: 680px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
}

.hero { text-align: center; margin-bottom: 3rem; }
.hero h1 { font-size: 2.8rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 1rem; }
.hero p { color: #8b92a8; font-size: 1.05rem; margin-bottom: 2rem; }
.hero-actions { display: flex; gap: 0.75rem; justify-content: center; }

.panel {
  background: #141620;
  border: 1px solid #1e2030;
  border-radius: 12px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.panel h2 { font-size: 1.1rem; font-weight: 600; }

.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field label { font-size: 0.8rem; color: #8b92a8; text-transform: uppercase; letter-spacing: 0.05em; }
.field input, .field select { width: 100%; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

.color-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.color-swatch {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid transparent;
  transition: border-color 0.15s, transform 0.15s;
}
.color-swatch.active { border-color: #fff; transform: scale(1.15); }

.error { color: #f97f4f; font-size: 0.85rem; }
.optional { font-weight: 400; color: #555e78; text-transform: none; letter-spacing: 0; font-size: 0.75rem; }
.radio-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.radio-label { display: flex; align-items: center; gap: 0.35rem; font-size: 0.9rem; cursor: pointer; }

@media (max-width: 600px) {
  .home { padding: 2rem 1rem; }
  .hero h1 { font-size: 2rem; }
  .panel { padding: 1.25rem; }
  .grid-2 { grid-template-columns: 1fr; }
  .hero-actions { flex-direction: column; }
  .btn { width: 100%; justify-content: center; }
}
</style>
