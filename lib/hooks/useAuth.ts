"use client"

import React, { createContext, useContext, useEffect, useState, type ReactNode, type FC } from 'react'
import { User, AuthState, LoginCredentials, RegisterCredentials } from '../types/auth'

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => void
  refreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
  apiBasePath?: string
}

export const AuthProvider: FC<AuthProviderProps> = ({ 
  children, 
  apiBasePath = '/api/auth' 
}) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  })

  const refreshUserData = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setState(prev => ({ ...prev, isLoading: false }))
        return
      }

      const response = await fetch(`${apiBasePath}/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        setState({
          user: userData.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        })
      } else {
        localStorage.removeItem('auth_token')
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: 'Session expired',
        })
      }
    } catch (error) {
      console.error('Error refreshing user data:', error)
      localStorage.removeItem('auth_token')
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: 'Failed to refresh user data',
      })
    }
  }

  const login = async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const response = await fetch(`${apiBasePath}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      localStorage.setItem('auth_token', data.token)
      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }))
      throw error
    }
  }

  const register = async (credentials: RegisterCredentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const response = await fetch(`${apiBasePath}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed')
      }

      localStorage.setItem('auth_token', data.token)
      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      }))
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    })
  }

  useEffect(() => {
    refreshUserData()
  }, [])

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshUserData,
  }

  return React.createElement(
    AuthContext.Provider,
    { value },
    children
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}