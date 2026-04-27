import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8787',
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('session_token')
  if (token) config.headers['X-Session-Token'] = token
  return config
})

export default api
