"use client"

import React, { createContext, useContext, useEffect, useState, type ReactNode, type FC } from 'react'
import { User, AuthState, LoginCredentials, RegisterCredentials } from '../types/auth'

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
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
      const response = await fetch(`${apiBasePath}/me`, {
        credentials: 'include', // Importante para enviar cookies
      })

      if (response.ok) {
        const userData = await response.json()
        setState({
          user: userData,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        })
      } else {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: 'Session expired',
        })
      }
    } catch (error) {
      console.error('Error refreshing user data:', error)
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
        credentials: 'include', // Importante para cookies
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

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
        credentials: 'include',
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      // No establecer usuario automáticamente si requiere verificación
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      }))
      throw error
    }
  }

  const logout = async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Llamar al endpoint de logout
      await fetch(`${apiBasePath}/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      // Siempre limpiar el estado local, incluso si la llamada falla
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      })
    }
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