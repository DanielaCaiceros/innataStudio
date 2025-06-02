// lib/services/auth.service.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { addDays } from 'date-fns';
import { UserRegistrationData, LoginCredentials, AuthResponse, TokenPayload } from '../types/auth';
import { signToken, verifyToken } from '../jwt';
import { sendVerificationEmail } from '../email';

const prisma = new PrismaClient();

// Errores personalizados para mejor manejo
export class AuthError extends Error {
  public code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export async function registerUser(userData: UserRegistrationData): Promise<{ userId: number; verificationToken: string }> {
  // Validar datos de entrada
  if (!userData.email || !userData.firstName || !userData.lastName || !userData.password) {
    throw new AuthError('Todos los campos obligatorios deben ser completados', 'MISSING_FIELDS');
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userData.email)) {
    throw new AuthError('El formato del email no es válido', 'INVALID_EMAIL_FORMAT');
  }

  // Validar contraseña
  if (userData.password.length < 8) {
    throw new AuthError('La contraseña debe tener al menos 8 caracteres', 'WEAK_PASSWORD');
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(userData.password)) {
    throw new AuthError('La contraseña debe contener al menos una mayúscula, una minúscula y un número', 'WEAK_PASSWORD');
  }

  // Validar nombres
  if (userData.firstName.trim().length < 2) {
    throw new AuthError('El nombre debe tener al menos 2 caracteres', 'INVALID_NAME');
  }

  if (userData.lastName.trim().length < 2) {
    throw new AuthError('El apellido debe tener al menos 2 caracteres', 'INVALID_NAME');
  }

  // Verificar si el usuario ya existe
  const existingUser = await prisma.user.findUnique({
    where: { email: userData.email.toLowerCase().trim() }
  });

  if (existingUser) {
    throw new AuthError('Este correo electrónico ya está registrado', 'EMAIL_ALREADY_EXISTS');
  }

  try {
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Crear usuario
    const newUser = await prisma.user.create({
      data: {
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        email: userData.email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        phone: userData.phone?.trim() || null,
        status: 'pending_verification',
        role: 'client',
        emailVerified: false
      }
    });

    // Generar token de verificación
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Guardar token en la base de datos
    await prisma.emailVerificationToken.create({
      data: {
        userId: newUser.user_id,
        token: verificationToken,
        expiresAt: addDays(new Date(), 1) // Token expira en 1 día
      }
    });

    return {
      userId: newUser.user_id,
      verificationToken
    };
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Si es un error de restricción única (aunque ya verificamos antes)
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      throw new AuthError('Este correo electrónico ya está registrado', 'EMAIL_ALREADY_EXISTS');
    }
    
    throw new AuthError('Error interno del servidor al crear la cuenta', 'DATABASE_ERROR');
  }
}

export async function verifyEmail(token: string): Promise<boolean> {
  if (!token) {
    throw new AuthError('Token de verificación no proporcionado', 'MISSING_TOKEN');
  }

  // Buscar token en la base de datos
  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true }
  });

  if (!verificationToken) {
    throw new AuthError('Token de verificación inválido o expirado', 'INVALID_TOKEN');
  }

  // Verificar si el token ha expirado
  if (verificationToken.expiresAt < new Date()) {
    throw new AuthError('El token de verificación ha expirado. Solicita un nuevo correo de verificación', 'TOKEN_EXPIRED');
  }

  // Verificar si ya fue usado
  if (verificationToken.usedAt) {
    throw new AuthError('Este token de verificación ya fue utilizado', 'TOKEN_ALREADY_USED');
  }

  try {
    // Actualizar usuario como verificado
    await prisma.user.update({
      where: { user_id: verificationToken.userId },
      data: {
        status: 'active',
        emailVerified: true
      }
    });

    // Marcar token como usado
    await prisma.emailVerificationToken.update({
      where: { token },
      data: {
        usedAt: new Date()
      }
    });

    return true;
  } catch (error) {
    console.error('Error verifying email:', error);
    throw new AuthError('Error interno al verificar el email', 'DATABASE_ERROR');
  }
}

export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  // Validar datos de entrada
  if (!credentials.email || !credentials.password) {
    throw new AuthError('Email y contraseña son requeridos', 'MISSING_CREDENTIALS');
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(credentials.email)) {
    throw new AuthError('El formato del email no es válido', 'INVALID_EMAIL_FORMAT');
  }

  // Buscar usuario por email
  const user = await prisma.user.findUnique({
    where: { email: credentials.email.toLowerCase().trim() }
  });

  if (!user) {
    throw new AuthError('Credenciales inválidas', 'INVALID_CREDENTIALS');
  }

  // Verificar contraseña
  const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AuthError('Credenciales inválidas', 'INVALID_CREDENTIALS');
  }

  // Verificar estado de la cuenta
  if (user.status === 'inactive') {
    throw new AuthError('Tu cuenta ha sido desactivada. Contacta al soporte para más información', 'ACCOUNT_INACTIVE');
  }

  if (user.status === 'pending_verification' || !user.emailVerified) {
    throw new AuthError('Tu cuenta no ha sido verificada. Revisa tu email y haz clic en el enlace de verificación', 'ACCOUNT_NOT_VERIFIED');
  }

  try {
    // Generar JWT token
    const tokenPayload: TokenPayload = {
      userId: user.user_id.toString(),
      email: user.email,
      role: user.role
    };

    const token = await signToken(tokenPayload);

    // Actualizar fecha de última visita
    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { lastVisitDate: new Date() }
    });

    return {
      user: {
        userId: user.user_id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImage: user.profileImage || undefined
      },
      token
    };
  } catch (error) {
    console.error('Error during login:', error);
    throw new AuthError('Error interno durante el inicio de sesión', 'LOGIN_ERROR');
  }
}

export async function resendVerificationEmail(email: string): Promise<boolean> {
  if (!email) {
    throw new AuthError('Email es requerido', 'MISSING_EMAIL');
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AuthError('El formato del email no es válido', 'INVALID_EMAIL_FORMAT');
  }

  // Buscar usuario por email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() }
  });

  if (!user) {
    throw new AuthError('No se encontró una cuenta con este email', 'USER_NOT_FOUND');
  }

  if (user.emailVerified && user.status === 'active') {
    throw new AuthError('Esta cuenta ya ha sido verificada', 'ALREADY_VERIFIED');
  }

  try {
    // Invalidar tokens anteriores
    await prisma.emailVerificationToken.updateMany({
      where: {
        userId: user.user_id,
        usedAt: null
      },
      data: {
        usedAt: new Date() // Marcar como usado para invalidar
      }
    });

    // Generar nuevo token de verificación
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Guardar nuevo token en la base de datos
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.user_id,
        token: verificationToken,
        expiresAt: addDays(new Date(), 1) // Token expira en 1 día
      }
    });

    // Enviar correo de verificación
    await sendVerificationEmail(user.email, user.firstName, verificationToken);

    return true;
  } catch (error) {
    console.error('Error resending verification email:', error);
    throw new AuthError('Error interno al reenviar el correo de verificación', 'EMAIL_SEND_ERROR');
  }
}