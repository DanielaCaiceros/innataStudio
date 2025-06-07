// lib/email.ts - Versión actualizada para Resend

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Función para enviar correo de verificación
export async function sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
  const verificationLink = `https://innatastudio.com/api/auth/verify?token=${token}`;
  
  console.log('Sending verification email to:', email);
  console.log('Verification link:', verificationLink);
  
  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: [email],
      subject: '🚴‍♀️ Verifica tu cuenta en Innata Studio',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff;">
          <!-- Header con gradiente -->
          <div style="background: linear-gradient(135deg, #727D73 0%, #AAB99A 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL}/innataBlack.png" alt="Innata Studio" style="max-width: 180px; height: auto; margin-bottom: 20px;" />
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ¡Bienvenido(a) a Innata Studio! 🚴‍♀️
            </h1>
          </div>
          
          <!-- Contenido principal -->
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="color: #2c3e50; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
              Hola ${name},
            </p>
            
            <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              ¡Gracias por unirte a nuestra comunidad de ciclismo indoor! Para completar tu registro y comenzar a reservar clases increíbles, necesitamos verificar tu dirección de correo electrónico.
            </p>
            
            <!-- Botón de verificación -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${verificationLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #727D73 0%, #AAB99A 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(114, 125, 115, 0.3); transition: all 0.3s ease;">
                ✨ Verificar mi cuenta
              </a>
            </div>
            
            <!-- Información adicional -->
            <div style="background-color: #f8f9fa; padding: 25px; border-radius: 12px; border-left: 4px solid #AAB99A; margin: 30px 0;">
              <p style="color: #495057; font-size: 14px; margin: 0 0 15px 0; font-weight: 600;">
                📱 ¿Problemas con el botón? Copia y pega este enlace:
              </p>
              <p style="word-break: break-all; background-color: #ffffff; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #6c757d; margin: 0; border: 1px solid #e9ecef;">
                ${verificationLink}
              </p>
            </div>
            
            <!-- Información de expiración -->
            <div style="background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%); padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #e65100; font-size: 14px; margin: 0; font-weight: 500;">
                ⏰ Este enlace expirará en 24 horas por seguridad.
              </p>
            </div>
            
            <p style="color: #6c757d; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
              Si no solicitaste esta cuenta, puedes ignorar este correo de forma segura.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; font-size: 12px; margin: 0 0 10px 0;">
              © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
            </p>
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              🏃‍♀️ ¡Prepárate para transformar tu cuerpo y mente!
            </p>
          </div>
        </div>
      `,
      // Versión de texto plano como fallback
      text: `
        ¡Bienvenido(a) a Innata Studio!

        Hola ${name},

        Gracias por registrarte en Innata Studio. Para completar tu registro y verificar tu cuenta, visita el siguiente enlace:

        ${verificationLink}

        Este enlace expirará en 24 horas.

        Si no has solicitado este correo, puedes ignorarlo.

        © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
      `
    });

    if (error) {
      console.error('Resend API error:', error);
      throw new Error(`Error de Resend: ${error.message}`);
    }

    console.log('Email sent successfully:', data);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('No se pudo enviar el correo de verificación. Por favor intenta más tarde.');
  }
}

// Función para enviar correo de restablecimiento de contraseña
export async function sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  
  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: [email],
      subject: '🔐 Restablece tu contraseña - Innata Studio',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #727D73 0%, #AAB99A 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL}/innataBlack.png" alt="Innata Studio" style="max-width: 180px; height: auto; margin-bottom: 20px;" />
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">
              🔐 Restablecer Contraseña
            </h1>
          </div>
          
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="color: #2c3e50; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
              Hola ${name},
            </p>
            
            <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Has solicitado restablecer tu contraseña en Innata Studio. Haz clic en el siguiente botón para crear una nueva contraseña:
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);">
                🔑 Restablecer contraseña
              </a>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 25px; border-radius: 12px; border-left: 4px solid #dc3545; margin: 30px 0;">
              <p style="color: #495057; font-size: 14px; margin: 0 0 15px 0; font-weight: 600;">
                📱 ¿Problemas con el botón? Copia y pega este enlace:
              </p>
              <p style="word-break: break-all; background-color: #ffffff; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #6c757d; margin: 0; border: 1px solid #e9ecef;">
                ${resetLink}
              </p>
            </div>
            
            <div style="background: linear-gradient(135deg, rgba(220, 53, 69, 0.1) 0%, rgba(200, 35, 51, 0.1) 100%); padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #dc3545; font-size: 14px; margin: 0; font-weight: 500;">
                ⏰ Este enlace expirará en 1 hora por seguridad.
              </p>
            </div>
            
            <p style="color: #6c757d; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
              Si no has solicitado este cambio, puedes ignorar este correo. Tu contraseña permanecerá sin cambios.
            </p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
            </p>
          </div>
        </div>
      `,
      text: `
        Restablecer Contraseña - Innata Studio

        Hola ${name},

        Has solicitado restablecer tu contraseña. Visita este enlace para crear una nueva:

        ${resetLink}

        Este enlace expirará en 1 hora.

        Si no solicitaste este cambio, ignora este correo.

        © ${new Date().getFullYear()} Innata Studio.
      `
    });

    if (error) {
      console.error('Resend API error:', error);
      throw new Error(`Error de Resend: ${error.message}`);
    }

    console.log('Password reset email sent successfully:', data);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('No se pudo enviar el correo de restablecimiento. Por favor intenta más tarde.');
  }
}

// Función para enviar correo de confirmación de reserva
export async function sendBookingConfirmationEmail(
  email: string, 
  name: string, 
  bookingDetails: {
    className: string;
    date: string;
    time: string;
    instructor: string;
    confirmationCode: string;
  }
): Promise<void> {
  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: [email],
      subject: '🎉 Confirmación de reserva - Innata Studio',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #727D73 0%, #AAB99A 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL}/innataBlack.png" alt="Innata Studio" style="max-width: 180px; height: auto; margin-bottom: 20px;" />
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">
              🎉 ¡Reserva Confirmada!
            </h1>
          </div>
          
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="color: #2c3e50; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
              Hola ${name},
            </p>
            
            <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              ¡Tu reserva ha sido confirmada exitosamente! Aquí tienes todos los detalles:
            </p>
            
            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 1px solid #dee2e6;">
              <h3 style="color: #495057; font-size: 18px; margin: 0 0 20px 0; font-weight: 600;">📋 Detalles de tu clase:</h3>
              
              <div style="display: grid; gap: 15px;">
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6;">
                  <span style="color: #6c757d; font-weight: 500;">🚴‍♀️ Clase:</span>
                  <span style="color: #495057; font-weight: 600;">${bookingDetails.className}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6;">
                  <span style="color: #6c757d; font-weight: 500;">📅 Fecha:</span>
                  <span style="color: #495057; font-weight: 600;">${bookingDetails.date}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6;">
                  <span style="color: #6c757d; font-weight: 500;">⏰ Hora:</span>
                  <span style="color: #495057; font-weight: 600;">${bookingDetails.time}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6;">
                  <span style="color: #6c757d; font-weight: 500;">👨‍🏫 Instructor:</span>
                  <span style="color: #495057; font-weight: 600;">${bookingDetails.instructor}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                  <span style="color: #6c757d; font-weight: 500;">🎫 Código:</span>
                  <span style="color: #28a745; font-weight: 700; font-family: monospace;">${bookingDetails.confirmationCode}</span>
                </div>
              </div>
            </div>
            
            <div style="background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(25, 135, 84, 0.1) 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border: 1px solid rgba(40, 167, 69, 0.2);">
              <p style="color: #155724; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">
                📝 Instrucciones importantes:
              </p>
              <ul style="color: #155724; font-size: 14px; margin: 0; padding-left: 20px;">
                <li>Llega 15 minutos antes de tu clase</li>
                <li>Trae agua y toalla</li>
                <li>Usa ropa cómoda para ejercicio</li>
                <li>Las cancelaciones deben hacerse 4 horas antes</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/mi-cuenta" 
                 style="display: inline-block; background: linear-gradient(135deg, #727D73 0%, #AAB99A 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(114, 125, 115, 0.3);">
                📱 Ver mis reservas
              </a>
            </div>
            
            <p style="color: #6c757d; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0; text-align: center;">
              ¡Te esperamos en el estudio! 🚴‍♀️💪
            </p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
            </p>
          </div>
        </div>
      `,
      text: `
        ¡Reserva Confirmada! - Innata Studio

        Hola ${name},

        Tu reserva ha sido confirmada exitosamente:

        Clase: ${bookingDetails.className}
        Fecha: ${bookingDetails.date}
        Hora: ${bookingDetails.time}
        Instructor: ${bookingDetails.instructor}
        Código de confirmación: ${bookingDetails.confirmationCode}

        Recuerda llegar 15 minutos antes de tu clase.

        ¡Te esperamos en el estudio!

        © ${new Date().getFullYear()} Innata Studio.
      `
    });

    if (error) {
      console.error('Resend API error:', error);
      throw new Error(`Error de Resend: ${error.message}`);
    }

    console.log('Booking confirmation email sent successfully:', data);
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    throw new Error('No se pudo enviar el correo de confirmación. Por favor verifica tu reserva en tu perfil.');
  }
}

// Agregar esta función al final de tu archivo lib/email.ts existente

// Función para enviar correo de cancelación de clase
export async function sendCancellationEmail(
  email: string, 
  name: string, 
  cancellationDetails: {
    className: string;
    packageName?: string;
    date: string;
    time: string;
    instructor: string;
    cancellationTime: string;
    refundStatus: 'refunded' | 'no_refund';
    hoursBeforeClass: number;
  }
): Promise<void> {
  try {
    const isRefunded = cancellationDetails.refundStatus === 'refunded';
    const subject = isRefunded 
      ? '✅ Cancelación confirmada - Clase reagendable' 
      : '❌ Cancelación confirmada - Sin reembolso';

    const { data, error } = await resend.emails.send({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: [email],
      subject: `${subject} - Innata Studio`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, ${isRefunded ? '#28a745' : '#dc3545'} 0%, ${isRefunded ? '#20c997' : '#c82333'} 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL}/innataBlack.png" alt="Innata Studio" style="max-width: 180px; height: auto; margin-bottom: 20px;" />
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">
              ${isRefunded ? '✅ Cancelación Confirmada' : '❌ Cancelación Sin Reembolso'}
            </h1>
          </div>
          
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="color: #2c3e50; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
              Hola ${name},
            </p>
            
            <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Tu reserva ha sido cancelada exitosamente. Aquí están los detalles:
            </p>
            
            <!-- Detalles de la reserva cancelada -->
            <div style="background-color: #f8f9fa; padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid ${isRefunded ? '#28a745' : '#dc3545'};">
              <h3 style="color: #2c3e50; font-size: 18px; font-weight: 700; margin: 0 0 15px 0;">
                📅 Detalles de la reserva cancelada
              </h3>
              <p style="color: #495057; font-size: 14px; margin: 0 0 8px 0;">
                <strong>Clase:</strong> ${cancellationDetails.className}
              </p>
              ${cancellationDetails.packageName ? `
                <p style="color: #495057; font-size: 14px; margin: 0 0 8px 0;">
                  <strong>Paquete:</strong> ${cancellationDetails.packageName}
                </p>
              ` : ''}
              <p style="color: #495057; font-size: 14px; margin: 0 0 8px 0;">
                <strong>Fecha:</strong> ${cancellationDetails.date}
              </p>
              <p style="color: #495057; font-size: 14px; margin: 0 0 8px 0;">
                <strong>Hora:</strong> ${cancellationDetails.time}
              </p>
              <p style="color: #495057; font-size: 14px; margin: 0 0 8px 0;">
                <strong>Instructor:</strong> ${cancellationDetails.instructor}
              </p>
              <p style="color: #495057; font-size: 14px; margin: 0 0 8px 0;">
                <strong>Cancelado el:</strong> ${cancellationDetails.cancellationTime}
              </p>
              <p style="color: #495057; font-size: 14px; margin: 0;">
                <strong>Tiempo de anticipación:</strong> ${cancellationDetails.hoursBeforeClass} horas
              </p>
            </div>
            
            <!-- Política de cancelación aplicada -->
            <div style="background: linear-gradient(135deg, ${isRefunded ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)'} 0%, ${isRefunded ? 'rgba(32, 201, 151, 0.1)' : 'rgba(200, 35, 51, 0.1)'} 100%); padding: 25px; border-radius: 12px; margin: 30px 0;">
              <h3 style="color: ${isRefunded ? '#28a745' : '#dc3545'}; font-size: 18px; font-weight: 700; margin: 0 0 15px 0;">
                📋 Política de Cancelación Aplicada
              </h3>
              
              ${isRefunded ? `
                <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; border: 1px solid #c3e6cb;">
                  <p style="color: #155724; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">
                    ✅ Cancelación con más de 12 horas de anticipación
                  </p>
                  <ul style="color: #155724; font-size: 14px; margin: 0; padding-left: 20px;">
                    <li>La clase ha sido regresada a tu saldo</li>
                    <li>Puedes reagendar cuando gustes</li>
                    <li>No hay penalización</li>
                  </ul>
                </div>
              ` : `
                <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; border: 1px solid #f5c6cb;">
                  <p style="color: #721c24; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">
                    ❌ Cancelación con menos de 12 horas de anticipación
                  </p>
                  <ul style="color: #721c24; font-size: 14px; margin: 0; padding-left: 20px;">
                    <li>La clase se pierde (no hay reembolso)</li>
                    <li>Estado: "Cancelada sin reembolso"</li>
                    <li>No se puede reagendar</li>
                  </ul>
                </div>
              `}
            </div>
            
            ${isRefunded ? `
              <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/clases" 
                   style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
                  🚴‍♀️ Reservar nueva clase
                </a>
              </div>
            ` : `
              <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/paquetes" 
                   style="display: inline-block; background: linear-gradient(135deg, #727D73 0%, #AAB99A 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(114, 125, 115, 0.3);">
                  💪 Adquirir nuevo paquete
                </a>
              </div>
            `}
            
            <p style="color: #6c757d; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0; text-align: center;">
              ${isRefunded 
                ? '¡Esperamos verte pronto en el estudio! 🚴‍♀️💪' 
                : 'Recuerda que puedes cancelar con más de 12 horas de anticipación para reagendar. 📅'
              }
            </p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; font-size: 12px; margin: 0 0 10px 0;">
              © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
            </p>
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              Si tienes dudas sobre nuestra política de cancelación, contáctanos.
            </p>
          </div>
        </div>
      `,
      text: `
        ${isRefunded ? 'Cancelación Confirmada - Clase Reagendable' : 'Cancelación Confirmada - Sin Reembolso'} - Innata Studio

        Hola ${name},

        Tu reserva ha sido cancelada exitosamente.

        DETALLES DE LA RESERVA CANCELADA:
        - Clase: ${cancellationDetails.className}
        ${cancellationDetails.packageName ? `- Paquete: ${cancellationDetails.packageName}` : ''}
        - Fecha: ${cancellationDetails.date}
        - Hora: ${cancellationDetails.time}
        - Instructor: ${cancellationDetails.instructor}
        - Cancelado el: ${cancellationDetails.cancellationTime}
        - Tiempo de anticipación: ${cancellationDetails.hoursBeforeClass} horas

        POLÍTICA DE CANCELACIÓN APLICADA:
        ${isRefunded 
          ? `✅ Cancelación con más de 12 horas de anticipación:
          - La clase ha sido regresada a tu saldo
          - Puedes reagendar cuando gustes
          - No hay penalización`
          : `❌ Cancelación con menos de 12 horas de anticipación:
          - La clase se pierde (no hay reembolso)
          - Estado: "Cancelada sin reembolso"
          - No se puede reagendar`
        }

        ${isRefunded 
          ? '¡Esperamos verte pronto en el estudio!' 
          : 'Recuerda que puedes cancelar con más de 12 horas de anticipación para reagendar.'
        }

        © ${new Date().getFullYear()} Innata Studio.
      `
    });

    if (error) {
      console.error('Resend API error:', error);
      throw new Error(`Error de Resend: ${error.message}`);
    }

    console.log('Cancellation email sent successfully:', data);
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    throw new Error('No se pudo enviar el correo de cancelación. Por favor verifica el estado de tu reserva en tu perfil.');
  }
}