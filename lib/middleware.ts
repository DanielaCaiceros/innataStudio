import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Agregar headers para optimizar conexiones
  const response = NextResponse.next()
  
  // Headers para evitar keep-alive en desarrollo
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('Connection', 'close')
    response.headers.set('Keep-Alive', 'timeout=1, max=1')
  }
  
  return response
}

export const config = {
  matcher: '/api/:path*',
}