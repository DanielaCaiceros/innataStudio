// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/jwt"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { requestPasswordReset } from "@/lib/services/auth.service"

// GET - Obtener todos los usuarios
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación del admin
    const token = request.cookies.get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    // Obtener todos los usuarios
    const users = await db.user.findMany({
      select: {
        user_id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        status: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(users)

  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST - Crear un nuevo usuario
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación del admin
    const token = request.cookies.get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { firstName, lastName, email, phone } = body

    // Validaciones
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: firstName, lastName, email" },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 }
      )
    }

    // Verificar que el email no esté en uso
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con este email" },
        { status: 409 }
      )
    }

    // Generar una contraseña temporal no válida (usuario debe establecer una nueva)
    const temporaryPassword = "temp_" + Math.random().toString(36).slice(-8)
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12)

    // Crear el usuario
    const user = await db.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        passwordHash: hashedPassword,
        role: 'client',
        status: 'active', // Usuario creado por admin está activo directamente
        emailVerified: true, // Usuario creado por admin se considera verificado
      },
      select: {
        user_id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      }
    })

    // Generar token de reset de contraseña automáticamente
    try {
      await requestPasswordReset(user.email)
      console.log('Token de reset enviado automáticamente para nuevo usuario:', user.email)
    } catch (resetError) {
      console.error('Error enviando token de reset para nuevo usuario:', resetError)
      
      // Si falla el email, eliminar el usuario creado y fallar la operación
      try {
        await db.user.delete({
          where: { user_id: user.user_id }
        })
        console.log('Usuario eliminado debido a fallo en envío de email')
      } catch (deleteError) {
        console.error('Error eliminando usuario tras fallo de email:', deleteError)
      }
      
      return NextResponse.json({
        error: "No se pudo enviar el email de bienvenida. Usuario no creado.",
        details: resetError instanceof Error ? resetError.message : String(resetError)
      }, { status: 500 })
    }

    return NextResponse.json({
      message: "Usuario creado exitosamente. Se ha enviado un email para establecer la contraseña.",
      user: user
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}