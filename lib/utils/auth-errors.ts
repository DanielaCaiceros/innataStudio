// lib/utils/auth-errors.ts

// Función helper para mapear códigos de error a códigos de estado HTTP
export function getStatusCodeForAuthError(code: string): number {
    switch (code) {
      case 'MISSING_FIELDS':
      case 'MISSING_CREDENTIALS':
      case 'MISSING_EMAIL':
      case 'MISSING_TOKEN':
      case 'INVALID_EMAIL_FORMAT':
      case 'WEAK_PASSWORD':
      case 'INVALID_NAME':
        return 400; // Bad Request
        
      case 'INVALID_CREDENTIALS':
      case 'ACCOUNT_NOT_VERIFIED':
        return 401; // Unauthorized
        
      case 'ACCOUNT_INACTIVE':
        return 403; // Forbidden
        
      case 'EMAIL_ALREADY_EXISTS':
      case 'USER_NOT_FOUND':
      case 'INVALID_TOKEN':
      case 'TOKEN_EXPIRED':
      case 'TOKEN_ALREADY_USED':
      case 'ALREADY_VERIFIED':
        return 409; // Conflict
        
      case 'DATABASE_ERROR':
      case 'LOGIN_ERROR':
      case 'EMAIL_SEND_ERROR':
      default:
        return 500; // Internal Server Error
    }
  }
  
  // Función para obtener mensajes de error user-friendly
  export function getFriendlyErrorMessage(code: string, defaultMessage: string): string {
    switch (code) {
      case 'MISSING_FIELDS':
        return 'Por favor completa todos los campos obligatorios';
      case 'MISSING_CREDENTIALS':
        return 'Email y contraseña son requeridos';
      case 'INVALID_EMAIL_FORMAT':
        return 'Por favor ingresa un email válido';
      case 'WEAK_PASSWORD':
        return 'La contraseña debe tener al menos 8 caracteres, con mayúscula, minúscula y número';
      case 'INVALID_CREDENTIALS':
        return 'Email o contraseña incorrectos';
      case 'ACCOUNT_NOT_VERIFIED':
        return 'Tu cuenta no ha sido verificada. Revisa tu email';
      case 'ACCOUNT_INACTIVE':
        return 'Tu cuenta ha sido desactivada. Contacta al soporte';
      case 'EMAIL_ALREADY_EXISTS':
        return 'Este email ya está registrado. ¿Ya tienes una cuenta?';
      case 'USER_NOT_FOUND':
        return 'No se encontró una cuenta con este email';
      case 'TOKEN_EXPIRED':
        return 'El enlace de verificación ha expirado. Solicita uno nuevo';
      case 'TOKEN_ALREADY_USED':
        return 'Este enlace de verificación ya fue utilizado';
      case 'ALREADY_VERIFIED':
        return 'Esta cuenta ya ha sido verificada';
      default:
        return defaultMessage || 'Ha ocurrido un error inesperado';
    }
  }