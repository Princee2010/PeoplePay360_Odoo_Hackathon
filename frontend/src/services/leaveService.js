import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('peoplepay360_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function getLeaveOptions() { const { data } = await api.get('/leave/options'); return data }
export async function getLeaveTypes() { const { data } = await api.get('/leave/types'); return data.leaveTypes }
export async function createLeaveType(type) { const { data } = await api.post('/leave/types', type); return data.leaveType }
export async function getAllocations() { const { data } = await api.get('/leave/allocations'); return data.allocations }
export async function createAllocation(allocation) { const { data } = await api.post('/leave/allocations', allocation); return data.allocation }
export async function getLeaveRequests() { const { data } = await api.get('/leave/requests'); return data.requests }
export async function createLeaveRequest(request) { const { data } = await api.post('/leave/requests', request); return data.request }
export async function updateLeaveRequestStatus(id, status, decisionNote = '') { const { data } = await api.patch(`/leave/requests/${id}/status`, { status, decisionNote }); return data.request }
