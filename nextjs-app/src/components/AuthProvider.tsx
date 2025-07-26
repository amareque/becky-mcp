'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, authAPI, setAuthToken, getAuthToken, removeAuthToken } from '@/lib/api'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = async () => {
    try {
      const token = getAuthToken()
      console.log('Checking auth, token exists:', !!token)
      if (token) {
        const userData = await authAPI.getCurrentUser()
        console.log('User data loaded:', userData)
        setUser(userData)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      removeAuthToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password })
      console.log('Login response:', response)
      setAuthToken(response.token)
      console.log('Token stored, token exists:', !!getAuthToken())
      setUser(response.user)
      toast.success('Login successful!')
    } catch (error: any) {
      console.error('Login error:', error)
      const message = error.response?.data?.error || 'Login failed'
      toast.error(message)
      throw error
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await authAPI.register({ name, email, password })
      setAuthToken(response.token)
      setUser(response.user)
      toast.success('Registration successful!')
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed'
      toast.error(message)
      throw error
    }
  }

  const logout = () => {
    removeAuthToken()
    setUser(null)
    toast.success('Logged out successfully')
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 