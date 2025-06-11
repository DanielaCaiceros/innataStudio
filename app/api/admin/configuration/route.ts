// app/api/admin/configuration/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { SystemConfigService } from '@/lib/services/system-config.service'

// GET - Obtener todas las configuraciones
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación de admin
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'No tiene permisos de administrador' }, { status: 403 })
    }

    const configs = await SystemConfigService.getAllConfigs()
    
    return NextResponse.json(configs)
  } catch (error) {
    console.error('Error obteniendo configuraciones:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PUT - Actualizar configuración
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticación de admin
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'No tiene permisos de administrador' }, { status: 403 })
    }

    const body = await request.json()
    const { key, value, description } = body

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key y value son requeridos' }, { status: 400 })
    }

    // Validaciones específicas por tipo de configuración
    if (key === 'grace_time_hours') {
      const numValue = parseInt(value, 10)
      if (isNaN(numValue) || numValue < 1 || numValue > 48) {
        return NextResponse.json({ 
          error: 'El tiempo de gracia debe ser un número entre 1 y 48 horas' 
        }, { status: 400 })
      }
    }

    if (key === 'weekly_class_limit') {
      const numValue = parseInt(value, 10)
      if (isNaN(numValue) || numValue < 1 || numValue > 50) {
        return NextResponse.json({ 
          error: 'El límite semanal debe ser un número entre 1 y 50 clases' 
        }, { status: 400 })
      }
    }

    const success = await SystemConfigService.setConfig(key, value, description)
    
    if (success) {
      return NextResponse.json({ 
        message: 'Configuración actualizada exitosamente',
        key,
        value 
      })
    } else {
      return NextResponse.json({ error: 'Error actualizando configuración' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error actualizando configuración:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}