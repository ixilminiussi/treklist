import api from './client'

export interface RegisterData {
  email: string
  username: string
  password: string
  birthday?: string
  weight_kg?: number
  sex?: 'M' | 'F' | 'X'
  gender?: string
  color: string
}

export const authApi = {
  register: (data: RegisterData) =>
    api.post('/api/auth/register', data).then(r => r.data),

  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }).then(r => r.data),

  getProfile: (userID: string) =>
    api.get(`/api/users/${userID}`).then(r => r.data),

  updateProfile: (userID: string, fields: Partial<RegisterData>) =>
    api.patch(`/api/users/${userID}`, fields).then(r => r.data),
}
