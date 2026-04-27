<template>
  <div class="profile-page">
    <div v-if="!auth.user" class="panel">
      <div class="tabs">
        <button :class="['tab', authTab === 'login' && 'active']" @click="authTab = 'login'">sign in</button>
        <button :class="['tab', authTab === 'register' && 'active']" @click="authTab = 'register'">create account</button>
      </div>

      <template v-if="authTab === 'login'">
        <div class="field"><label>email</label><input v-model="loginForm.email" type="email" /></div>
        <div class="field"><label>password</label><input v-model="loginForm.password" type="password" /></div>
        <div v-if="error" class="error">{{ error }}</div>
        <button class="btn btn-primary" @click="doLogin">sign in</button>
      </template>

      <template v-else>
        <div class="grid-2">
          <div class="field"><label>email</label><input v-model="regForm.email" type="email" /></div>
          <div class="field"><label>username</label><input v-model="regForm.username" /></div>
          <div class="field"><label>password</label><input v-model="regForm.password" type="password" /></div>
          <div class="field"><label>birthday</label><input v-model="regForm.birthday" type="date" /></div>
          <div class="field"><label>weight (kg)</label><input v-model.number="regForm.weight_kg" type="number" min="20" max="300" /></div>
          <div class="field">
            <label>sex (for calorie calc)</label>
            <select v-model="regForm.sex">
              <option value="">prefer not to say</option>
              <option value="M">male</option>
              <option value="F">female</option>
              <option value="X">other</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label>your color</label>
          <div class="color-row">
            <button v-for="c in COLORS" :key="c" class="color-swatch" :class="{ active: regForm.color === c }" :style="{ background: c }" @click="regForm.color = c" />
          </div>
        </div>
        <div v-if="error" class="error">{{ error }}</div>
        <button class="btn btn-primary" @click="doRegister">create account</button>
      </template>
    </div>

    <div v-else class="panel">
      <div class="profile-header">
        <span class="big-dot" :style="{ background: auth.user.color }" />
        <div>
          <div class="username">{{ auth.user.username }}</div>
          <div class="email">{{ auth.user.email }}</div>
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" @click="auth.logout()">sign out</button>
      </div>

      <div class="grid-2">
        <div class="field"><label>weight (kg)</label><input v-model.number="editForm.weight_kg" type="number" /></div>
        <div class="field">
          <label>sex</label>
          <select v-model="editForm.sex">
            <option value="">—</option>
            <option value="M">male</option>
            <option value="F">female</option>
            <option value="X">other</option>
          </select>
        </div>
        <div class="field"><label>birthday</label><input v-model="editForm.birthday" type="date" /></div>
      </div>
      <div class="field">
        <label>color</label>
        <div class="color-row">
          <button v-for="c in COLORS" :key="c" class="color-swatch" :class="{ active: editForm.color === c }" :style="{ background: c }" @click="editForm.color = c" />
        </div>
      </div>
      <button class="btn btn-primary btn-sm" @click="saveProfile">save changes</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useAuthStore } from '../stores/auth'

const COLORS = ['#4f9cf9','#f97f4f','#4fcc8a','#c97ff9','#f9cf4f','#f94f7f','#4ff9f0','#a0aec0']

const auth = useAuthStore()
const authTab = ref<'login'|'register'>('login')
const error = ref('')

const loginForm = reactive({ email: '', password: '' })
const regForm = reactive({ email: '', username: '', password: '', birthday: '', weight_kg: undefined as number | undefined, sex: '' as any, gender: '', color: COLORS[0] })
const editForm = reactive({ weight_kg: auth.user?.weight_kg, sex: auth.user?.sex ?? '', birthday: auth.user?.birthday ?? '', gender: auth.user?.gender ?? '', color: auth.user?.color ?? COLORS[0] })

watch(() => auth.user, (u) => {
  if (u) {
    editForm.weight_kg = u.weight_kg
    editForm.sex = u.sex ?? ''
    editForm.birthday = u.birthday ?? ''
    editForm.gender = u.gender ?? ''
    editForm.color = u.color
  }
})

async function doLogin() {
  error.value = ''
  try { await auth.login(loginForm.email, loginForm.password) }
  catch (e: any) { error.value = e?.response?.data?.error ?? 'login failed' }
}

async function doRegister() {
  error.value = ''
  try {
    await auth.register({ ...regForm, sex: regForm.sex || undefined })
    await auth.login(regForm.email, regForm.password)
  } catch (e: any) { error.value = e?.response?.data?.error ?? 'registration failed' }
}

async function saveProfile() {
  await auth.updateProfile({ ...editForm, sex: (editForm.sex || undefined) as any })
}
</script>

<style scoped>
.profile-page { max-width: 560px; margin: 3rem auto; padding: 0 1.5rem; }
.panel { background: #141620; border: 1px solid #1e2030; border-radius: 12px; padding: 2rem; display: flex; flex-direction: column; gap: 1.25rem; }
.tabs { display: flex; gap: 0; border-bottom: 1px solid #1e2030; margin-bottom: 0.5rem; }
.tab { background: none; border: none; color: #8b92a8; font-size: 0.9rem; padding: 0.5rem 1rem; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab.active { color: #e8eaf0; border-bottom-color: #4f9cf9; }
.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field label { font-size: 0.8rem; color: #8b92a8; text-transform: uppercase; letter-spacing: 0.05em; }
.field input, .field select { width: 100%; }
.optional { font-size: 0.7rem; text-transform: none; letter-spacing: 0; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.color-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.color-swatch { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; transition: all 0.15s; }
.color-swatch.active { border-color: #fff; transform: scale(1.15); }
.error { color: #f97f4f; font-size: 0.85rem; }
.profile-header { display: flex; align-items: center; gap: 0.75rem; }
.big-dot { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; }
.username { font-weight: 700; font-size: 1.05rem; }
.email { font-size: 0.8rem; color: #8b92a8; }
</style>
