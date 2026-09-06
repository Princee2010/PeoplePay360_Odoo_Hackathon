import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('peoplepay360_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function getContracts(employeeId = '') {
  const { data } = await api.get('/contracts', { params: employeeId ? { employeeId } : {} })
  return data.contracts
}

export async function createContract(contract) {
  const { data } = await api.post('/contracts', contract)
  return data.contract
}

export async function updateContract(id, contract) {
  const { data } = await api.put(`/contracts/${id}`, contract)
  return data.contract
}

export async function deleteContract(id) {
  await api.delete(`/contracts/${id}`)
}