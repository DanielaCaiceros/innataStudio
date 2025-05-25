// lib/types/auth.ts
export interface User {
  id: string
  email: string
  name: string
  role: 'client' | 'instructor' | 'admin'
  profileImage?: string
  // other user fields
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  phone: any
  firstName: any
  lastName: any
  email: string
  password: string
  name: string
  // other registration fields
}

export interface TokenPayload {
  userId: string
  email: string
  role: string
  // other token payload fields
}

export type UserRegistrationData = RegisterCredentials & {
  // any additional registration data
}

export interface AuthResponse {
  user: {
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    profileImage?: string;
  };
  token: string;
}