import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

export async function loginUser(credentials) {
  const { data } = await api.post('/auth/login', credentials)
  localStorage.setItem('peoplepay360_token', data.token)
  localStorage.setItem('peoplepay360_user', JSON.stringify(data.user))
  return data
}

export async function registerUser(credentials) {
  const { data } = await api.post('/auth/register', credentials)
  localStorage.setItem('peoplepay360_token', data.token)
  localStorage.setItem('peoplepay360_user', JSON.stringify(data.user))
  return data
}

export function getStoredUser() {
  const user = localStorage.getItem('peoplepay360_user')
  if (!user) return null
  try {
    const parsedUser = JSON.parse(user)
    if (!parsedUser || typeof parsedUser.name !== 'string' || typeof parsedUser.role !== 'string') {
      localStorage.removeItem('peoplepay360_user')
      localStorage.removeItem('peoplepay360_token')
      return null
    }
    return parsedUser
  } catch {
    localStorage.removeItem('peoplepay360_user')
    localStorage.removeItem('peoplepay360_token')
    return null
  }
}

export function logoutUser() {
  localStorage.removeItem('peoplepay360_token')
  localStorage.removeItem('peoplepay360_user')
}

export async function requestPasswordReset(email) {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

export async function resetPassword(token, password) {
  const { data } = await api.post('/auth/reset-password', { token, password })
  return data
}