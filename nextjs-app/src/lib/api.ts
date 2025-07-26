import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const MCP_BASE_URL = process.env.NEXT_PUBLIC_MCP_URL || 'http://localhost:3002'

// Create axios instances
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const mcpClient = axios.create({
  baseURL: MCP_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  console.log('API request to:', config.url, 'Token exists:', !!token)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    console.log('Authorization header set')
  } else {
    console.log('No token found, request will be unauthorized')
  }
  return config
})

// Add response interceptor for error logging
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.config?.headers
    })
    return Promise.reject(error)
  }
)

// Types
export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface Account {
  id: string
  userId: string
  name: string
  bank?: string
  type?: string
  currency: string
  createdAt: string
  updatedAt: string
}

export interface Movement {
  id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  concept: 'needs' | 'wants' | 'savings' | 'others'
  category?: string
  date: string
  accountId: string
  createdAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface CreateAccountRequest {
  userId?: string
  name: string
  bank?: string
  type?: string
  currency: string
}

export interface CreateMovementRequest {
  accountId: string
  type: 'income' | 'expense'
  amount: number
  description: string
  concept: 'needs' | 'wants' | 'savings' | 'others'
  category?: string
  date: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// Auth API
export const authAPI = {
  login: async (data: LoginRequest) => {
    const response = await apiClient.post('/auth/login', data)
    return response.data
  },

  register: async (data: RegisterRequest) => {
    const response = await apiClient.post('/auth/register', data)
    return response.data
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/users/me')
    return response.data
  },
}

// Accounts API
export const accountsAPI = {
  getAccounts: async (): Promise<{ accounts: Account[]; count: number }> => {
    const response = await apiClient.get('/accounts')
    return response.data
  },

  createAccount: async (data: CreateAccountRequest): Promise<Account> => {
    const response = await apiClient.post('/accounts', data)
    return response.data
  },

  updateAccount: async (accountId: string, data: Partial<CreateAccountRequest>): Promise<Account> => {
    const response = await apiClient.patch(`/accounts/${accountId}`, data)
    return response.data
  },
}

// Movements API
export const movementsAPI = {
  getMovements: async (accountId?: string, limit?: number): Promise<{ movements: Movement[]; count: number }> => {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    
    const url = accountId ? `/movements/account/${accountId}` : '/movements'
    const response = await apiClient.get(`${url}?${params.toString()}`)
    return response.data
  },

  createMovement: async (data: CreateMovementRequest): Promise<Movement> => {
    const response = await apiClient.post(`/movements/account/${data.accountId}`, data)
    return response.data
  },

  updateMovement: async (movementId: string, data: Partial<CreateMovementRequest>): Promise<Movement> => {
    const response = await apiClient.patch(`/movements/${movementId}`, data)
    return response.data
  },

  deleteMovement: async (movementId: string): Promise<{ message: string; deletedMovement: any }> => {
    const response = await apiClient.delete(`/movements/${movementId}`)
    return response.data
  },
}

// Chat API
export const chatAPI = {
  sendMessage: async (message: string) => {
    const response = await apiClient.post('/chat/becky', { message })
    return response.data
  },
}

// Utility functions
export const setAuthToken = (token: string) => {
  localStorage.setItem('token', token)
}

export const getAuthToken = () => {
  return localStorage.getItem('token')
}

export const removeAuthToken = () => {
  localStorage.removeItem('token')
}

export const isAuthenticated = () => {
  return !!getAuthToken()
} 