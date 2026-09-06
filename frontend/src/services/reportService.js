import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('peoplepay360_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function getReports() {
  const { data } = await api.get('/reports')
  return data
}

export async function downloadPersonalReport(type) {
  const response = await api.get(`/reports/personal/${type}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = `${type}-report.pdf`
  link.click()
  URL.revokeObjectURL(url)
}

export async function downloadManagementReport(type) {
  const response = await api.get(`/reports/${type}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = `${type}-report.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
