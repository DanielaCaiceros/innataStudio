// app/api/reservations/validate-unlimited-week/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { UnlimitedWeekService } from '@/lib/services/unlimited-week.service'

// POST - Validar elegibilidad para Semana Ilimitada
console.log('--- API /api/reservations/validate-unlimited-week called ---');
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const userId = Number(payload.userId)

    const body = await request.json()
    const { scheduledClassId } = body

    if (!scheduledClassId) {
      return NextResponse.json({ error: 'scheduledClassId es requerido' }, { status: 400 })
    }

    // Validar usando el servicio
    const validation = await UnlimitedWeekService.validateUnlimitedWeekReservation(
      userId, 
      parseInt(scheduledClassId, 10)
    )

    return NextResponse.json(validation)
  } catch (error) {
    console.error('Error validando Semana Ilimitada:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      isValid: false,
      canUseUnlimitedWeek: false 
    }, { status: 500 })
  }
}

// GET - Obtener uso semanal actual
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const userId = Number(payload.userId)

    const weeklyUsage = await UnlimitedWeekService.getWeeklyUsage(userId)
    
    return NextResponse.json(weeklyUsage)
  } catch (error) {
    console.error('Error obteniendo uso semanal:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}