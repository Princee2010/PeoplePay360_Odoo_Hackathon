import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('peoplepay360_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function getAttendanceList({ employeeId = '', date = '' } = {}) {
  const { data } = await api.get('/attendance', {
    params: { ...(employeeId ? { employeeId } : {}), ...(date ? { fromDate: date, toDate: date } : {}) },
  })
  return data.attendance
}

export async function createAttendance(record) {
  const { data } = await api.post('/attendance', record)
  return data.attendance
}

export async function updateAttendance(id, record) {
  const { data } = await api.put(`/attendance/${id}`, record)
  return data.attendance
}

export async function deleteAttendance(id) {
  await api.delete(`/attendance/${id}`)
}
