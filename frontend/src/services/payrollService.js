import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('peoplepay360_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function getApplicableContract(employeeId, period) {
  const date = `${period}-01`
  const { data } = await api.get(`/contracts/employee/${encodeURIComponent(employeeId)}/applicable`, { params: { date } })
  return data.contract
}

export async function previewPayroll(employeeId, period) {
  const { data } = await api.get('/payruns/preview', { params: { employeeId, period } })
  return data
}

export async function createPayrun(payrun) {
  const { data } = await api.post('/payruns', payrun)
  return data
}

export async function getPayruns() {
  const { data } = await api.get('/payruns')
  return data.payruns
}

async function updatePayrun(id, action) {
  const { data } = await api.post(`/payruns/${id}/${action}`)
  return data
}

export const computePayrun = (id) => updatePayrun(id, 'compute')
export const validatePayrun = (id) => updatePayrun(id, 'validate')
export const markPayrunPaid = (id) => updatePayrun(id, 'mark-paid')
export const sendPayrunPayslips = (id) => updatePayrun(id, 'send-payslips')

export async function getPayrunWarnings(id) {
  const { data } = await api.get(`/payruns/${id}/warnings`)
  return data.warnings
}

export async function downloadPayslip(payrunId, payslipId) {
  const url = await getPayslipPdfUrl(payrunId, payslipId)
  const link = document.createElement('a')
  link.href = url
  link.download = `payslip-${payslipId}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}

async function getPayslipPdfUrl(payrunId, payslipId) {
  const response = await api.get(`/payruns/${payrunId}/payslips/${payslipId}/pdf`, { responseType: 'blob' })
  return URL.createObjectURL(response.data)
}

export async function printPayslip(payrunId, payslipId) {
  const url = await getPayslipPdfUrl(payrunId, payslipId)
  const printWindow = window.open(url, '_blank', 'noopener,noreferrer')
  if (!printWindow) throw new Error('Allow pop-ups to print the payslip')
  printWindow.addEventListener('load', () => printWindow.print(), { once: true })
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}
