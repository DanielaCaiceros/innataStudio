// lib/services/auth.service.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { addDays } from 'date-fns';
import { UserRegistrationData, LoginCredentials, AuthResponse, TokenPayload } from '../types/auth';
import { signToken, verifyToken } from '../jwt';
import { sendVerificationEmail } from '../email';

const prisma = new PrismaClient();

export async function registerUser(userData: UserRegistrationData): Promise<{ userId: number; verificationToken: string }> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: userData.email }
  });

  if (existingUser) {
    throw new Error('Este correo electrónico ya está registrado');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  // Create user
  const newUser = await prisma.user.create({
    data: {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      passwordHash: hashedPassword,
      phone: userData.phone,
      status: 'active', // Set as active by default in development
      role: 'client',
      emailVerified: true // Set as verified by default in development
    }
  });

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  // Save token to database
  await prisma.emailVerificationToken.create({
    data: {
      userId: newUser.user_id,
      token: verificationToken,
      expiresAt: addDays(new Date(), 1) // Token expires in 1 day
    }
  });

  return {
    userId: newUser.user_id,
    verificationToken
  };
}

export async function verifyEmail(token: string): Promise<boolean> {
  // Find token in database
  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { token }
  });

  if (!verificationToken) {
    throw new Error('Token de verificación inválido');
  }

  // Check if token is expired
  if (verificationToken.expiresAt < new Date()) {
    throw new Error('El token de verificación ha expirado');
  }

  // Update user status
  await prisma.user.update({
    where: { user_id: verificationToken.userId },
    data: {
      status: 'active',
      emailVerified: true
    }
  });

  // Mark token as used
  await prisma.emailVerificationToken.update({
    where: { token },
    data: {
      usedAt: new Date()
    }
  });

  return true;
}

export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: credentials.email }
  });

  if (!user) {
    throw new Error('Credenciales inválidas');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Credenciales inválidas');
  }

  // Generate JWT token
  const tokenPayload: TokenPayload = {
    userId: user.user_id.toString(), // Convert number to string
    email: user.email,
    role: user.role
  };

  const token = await signToken(tokenPayload);

  // Update last visit date
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
}

export async function resendVerificationEmail(email: string): Promise<boolean> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  if (user.emailVerified) {
    throw new Error('El correo electrónico ya ha sido verificado');
  }

  // Generate new verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  // Save token to database
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.user_id,
      token: verificationToken,
      expiresAt: addDays(new Date(), 1) // Token expires in 1 day
    }
  });

  // Send verification email
  await sendVerificationEmail(user.email, user.firstName, verificationToken);

  return true;
}