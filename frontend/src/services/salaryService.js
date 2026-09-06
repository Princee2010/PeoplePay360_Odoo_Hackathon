import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('peoplepay360_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function getSalaryStructures() {
  const { data } = await api.get('/salary/structures')
  return data.structures
}

export async function createSalaryStructure(structure) {
  const { data } = await api.post('/salary/structures', structure)
  return data.structure
}

export async function updateSalaryStructure(id, structure) {
  const { data } = await api.put(`/salary/structures/${id}`, structure)
  return data.structure
}

export async function deleteSalaryStructure(id) {
  await api.delete(`/salary/structures/${id}`)
}

export async function getSalaryRules() {
  const { data } = await api.get('/salary/rules')
  return data.rules
}

export async function createSalaryRule(rule) {
  const { data } = await api.post('/salary/rules', rule)
  return data.rule
}

export async function deleteSalaryRule(id) {
  await api.delete(`/salary/rules/${id}`)
}
