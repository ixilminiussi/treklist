import api from './client'

export interface TrekSettings {
  name: string
  trek_type: string
  food_source: string
  camping: string
  weather: string
  temperature: string
}

export interface Trek extends TrekSettings {
  code: string
  creator_id: string
  status: 'active' | 'archived'
  created_at: string
  closed_at?: string
}

export interface Trekker {
  id: string
  trek_code: string
  user_id?: string
  guest_name?: string
  display_name: string
  color: string
  joined_at: string
  kicked_at?: string
  weight_kg?: number
  sex?: 'M' | 'F' | 'X'
}

export interface LobbyTrekker {
  id: string
  color: string
  display_name: string
  user_id?: string
}

export interface LobbyTrek {
  code: string
  name: string
  trek_type: string
  food_source: string
  camping: string
  weather: string
  status: string
  created_at: string
  creator_id: string
  my_trekker_id: string
  trekkers: LobbyTrekker[]
}

export interface ChecklistItem {
  type: 'category' | 'item'
  name: string
  category?: string
  filters: Record<string, string>
}

export const treksApi = {
  create: (data: TrekSettings & { guest_name?: string; user_id?: string; color: string }) =>
    api.post('/api/treks', data).then(r => r.data),

  join: (code: string, data: { guest_name?: string; user_id?: string; color: string; weight_kg?: number; sex?: string; gender?: string; birthday?: string }) =>
    api.post(`/api/treks/${code}/join`, data).then(r => r.data),

  resumeGuest: (code: string, trekker_id: string) =>
    api.post(`/api/treks/${code}/resume-guest`, { trekker_id }).then(r => r.data),

  get: (code: string) =>
    api.get(`/api/treks/${code}`).then(r => r.data),

  close: (code: string) =>
    api.post(`/api/treks/${code}/close`).then(r => r.data),

  kick: (code: string, trekkerID: string) =>
    api.delete(`/api/treks/${code}/trekkers/${trekkerID}`).then(r => r.data),

  getItems: (code: string) =>
    api.get(`/api/treks/${code}/items`).then(r => r.data),

  setStatus: (code: string, item_name: string, status: string) =>
    api.post(`/api/treks/${code}/items/status`, { item_name, status }).then(r => r.data),

  upsertProvision: (code: string, item_name: string, type: string, quantity: number) =>
    api.post(`/api/treks/${code}/items/provision`, { item_name, type, quantity }).then(r => r.data),

  claimProvision: (code: string, provision_id: string) =>
    api.post(`/api/treks/${code}/items/claim`, { provision_id }).then(r => r.data),

  unclaimProvision: (code: string, provision_id: string) =>
    api.delete(`/api/treks/${code}/items/provision/${provision_id}/claim`).then(r => r.data),

  annotate: (code: string, item_name: string, body: string) =>
    api.post(`/api/treks/${code}/items/annotate`, { item_name, body }).then(r => r.data),

  deleteAnnotation: (code: string, annotationID: string) =>
    api.delete(`/api/treks/${code}/annotations/${annotationID}`).then(r => r.data),

  addCustomItem: (code: string, name: string, category?: string) =>
    api.post(`/api/treks/${code}/items/custom`, { name, category }).then(r => r.data),

  setWeight: (code: string, item_name: string, custom_grams: number) =>
    api.post(`/api/treks/${code}/items/weight`, { item_name, custom_grams }).then(r => r.data),

  listForUser: (userID: string) =>
    api.get(`/api/users/${userID}/treks`).then(r => r.data as LobbyTrek[]),

  getChecklist: () =>
    api.get('/api/checklist').then(r => r.data as ChecklistItem[]),

  getDefaultWeights: () =>
    api.get('/api/weights').then(r => r.data as { item_name: string; default_grams: number }[]),
}
