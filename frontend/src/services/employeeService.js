import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('peoplepay360_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function getEmployees(search = '') {
  const { data } = await api.get('/employees', { params: search ? { search } : {} })
  return data.employees
}

export async function getEmployee(id) {
  const { data } = await api.get(`/employees/${id}`)
  return { ...data.employee, relatedCounts: data.relatedCounts }
}

export async function createEmployee(employee) {
  const { data } = await api.post('/employees', employee)
  return data.employee
}

export async function updateEmployee(id, employee) {
  const { data } = await api.put(`/employees/${id}`, employee)
  return data.employee
}

export async function deleteEmployee(id) {
  await api.delete(`/employees/${id}`)
}