import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('session_token')
  if (token) config.headers['X-Session-Token'] = token
  return config
})

export default api

export function wsUrl(trekCode: string): string {
  const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080')
    .replace(/^http/, 'ws')
  return `${base}/ws/${trekCode}`
}
