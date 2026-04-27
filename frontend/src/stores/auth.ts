import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi, type RegisterData } from '../api/auth'

export interface User {
  id: string
  username: string
  email: string
  color: string
  sex?: 'M' | 'F' | 'X'
  gender?: string
  weight_kg?: number
  birthday?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') ?? 'null'))

  function persist(u: User) {
    user.value = u
    localStorage.setItem('user', JSON.stringify(u))
  }

  async function login(email: string, password: string) {
    const data = await authApi.login(email, password)
    persist(data)
    return data
  }

  async function register(data: RegisterData) {
    const res = await authApi.register(data)
    return res
  }

  function logout() {
    user.value = null
    localStorage.removeItem('user')
  }

  async function updateProfile(fields: Partial<RegisterData>) {
    if (!user.value) return
    await authApi.updateProfile(user.value.id, fields)
    persist({ ...user.value, ...fields })
  }

  return { user, login, register, logout, updateProfile }
})
