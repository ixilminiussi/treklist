<template>
  <div class="home">
    <div class="panel">
      <h2>join trek</h2>
      <div class="field">
        <label>trek code</label>
        <input v-model="code" placeholder="ABCDE" maxlength="5" style="text-transform:uppercase;letter-spacing:0.2em;font-size:1.4rem;" />
      </div>
      <div class="field">
        <label>your name</label>
        <input v-model="name" :placeholder="auth.user?.username ?? 'Trail name'" :disabled="!!auth.user" />
      </div>
      <div class="field">
        <label>your color</label>
        <div class="color-row">
          <button v-for="c in COLORS" :key="c" class="color-swatch" :class="{ active: color === c }" :style="{ background: c }" @click="color = c" />
        </div>
      </div>
      <div class="field">
        <label>weight (kg) <span class="optional">optional</span></label>
        <input v-model.number="weight_kg" type="number" min="20" max="300" step="0.5" placeholder="e.g. 70" />
      </div>
      <div class="field">
        <label>biological sex <span class="optional">optional — used for calorie estimates</span></label>
        <div class="radio-row">
          <label class="radio-label" v-for="opt in SEX_OPTIONS" :key="opt.value">
            <input type="radio" :value="opt.value" v-model="sex" />
            {{ opt.label }}
          </label>
        </div>
      </div>
      <div class="field">
        <label>date of birth <span class="optional">optional — used for calorie estimates</span></label>
        <input v-model="birthday" type="date" />
      </div>
      <div v-if="error" class="error">{{ error }}</div>
      <button class="btn btn-primary" :disabled="loading" @click="join">
        {{ loading ? 'joining…' : 'join trek' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useTrekStore } from '../stores/trek'

const COLORS = ['#4f9cf9','#f97f4f','#4fcc8a','#c97ff9','#f9cf4f','#f94f7f','#4ff9f0','#a0aec0']
const SEX_OPTIONS = [
  { value: 'M', label: 'male' },
  { value: 'F', label: 'female' },
  { value: 'X', label: 'other / prefer not to say' },
]

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const trekStore = useTrekStore()

const code = ref((route.params.code as string ?? '').toUpperCase())
const name = ref(auth.user?.username ?? '')
const color = ref(auth.user?.color ?? COLORS[0])
const weight_kg = ref<number | ''>(auth.user?.weight_kg ?? '')
const sex = ref<'M' | 'F' | 'X' | ''>(auth.user?.sex ?? '')
const gender = ref(auth.user?.gender ?? '')
const birthday = ref(auth.user?.birthday ?? '')
const loading = ref(false)
const error = ref('')

async function join() {
  const c = code.value.trim().toUpperCase()
  if (c.length !== 5) { error.value = 'enter a 5-letter code'; return }
  if (!name.value) { error.value = 'your name required'; return }
  loading.value = true; error.value = ''
  try {
    await trekStore.joinTrek(c, {
      guest_name: auth.user ? undefined : name.value,
      user_id: auth.user?.id,
      color: color.value,
      weight_kg: weight_kg.value !== '' ? weight_kg.value : undefined,
      sex: sex.value || undefined,
      gender: gender.value || undefined,
      birthday: birthday.value || undefined,
    })
    router.push(`/trek/${c}`)
  } catch (e: any) {
    error.value = e?.response?.data?.error ?? 'failed to join'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.home { max-width: 480px; margin: 4rem auto; padding: 0 1.5rem; }
.panel { background: #141620; border: 1px solid #1e2030; border-radius: 12px; padding: 2rem; display: flex; flex-direction: column; gap: 1.25rem; }
.panel h2 { font-size: 1.1rem; font-weight: 600; }
.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field label { font-size: 0.8rem; color: #8b92a8; text-transform: uppercase; letter-spacing: 0.05em; }
.field input, .field select { width: 100%; }
.color-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.color-swatch { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; transition: border-color 0.15s, transform 0.15s; }
.color-swatch.active { border-color: #fff; transform: scale(1.15); }
.error { color: #f97f4f; font-size: 0.85rem; }
.optional { font-weight: 400; color: #555e78; text-transform: none; letter-spacing: 0; font-size: 0.75rem; }
.radio-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.radio-label { display: flex; align-items: center; gap: 0.35rem; font-size: 0.9rem; cursor: pointer; }
</style>
