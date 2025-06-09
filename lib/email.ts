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
    bikeNumber?: number;
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
                ${bookingDetails.bikeNumber ? `
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6;">
                  <span style="color: #6c757d; font-weight: 500;">🚲 Bicicleta:</span>
                  <span style="color: #495057; font-weight: 600;">#${bookingDetails.bikeNumber}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                  <span style="color: #6c757d; font-weight: 500;">🔑 Código de confirmación:</span>
                  <span style="color: #495057; font-weight: 600;">${bookingDetails.confirmationCode}</span>
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
        ${bookingDetails.bikeNumber ? `Bicicleta: #${bookingDetails.bikeNumber}` : ''}
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

export async function sendCancellationConfirmationEmail(
  email: string,
  name: string,
  details: {
    className: string;
    date: string; // Expected format: "EEEE, d 'de' MMMM 'de' yyyy"
    time: string; // Expected format: "HH:mm"
    isRefundable: boolean;
    packageName?: string; // Optional: name of the package if applicable
  }
): Promise<void> {
  const subject = details.isRefundable
    ? "😔 Cancelación de clase confirmada - Crédito devuelto"
    : "😔 Cancelación de clase confirmada";

  const refundableBodyHTML = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #727D73 0%, #AAB99A 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <img src="${process.env.NEXT_PUBLIC_APP_URL}/innataBlack.png" alt="Innata Studio" style="max-width: 180px; height: auto; margin-bottom: 20px;" />
        <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">
          Cancelación Confirmada
        </h1>
      </div>
      <div style="padding: 40px 30px; background-color: #ffffff;">
        <p style="color: #2c3e50; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
          Hola ${name},
        </p>
        <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Hemos procesado la cancelación de tu clase: <strong>${details.className}</strong> programada para el <strong>${details.date}</strong> a las <strong>${details.time} hrs</strong>.
        </p>
        <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
          Como cancelaste con más de 12 horas de anticipación, hemos <strong>devuelto el crédito de esta clase a tu saldo</strong>${details.packageName ? ` en tu paquete (<strong>${details.packageName}</strong>)` : ''}. Puedes usarlo para reservar otra clase cuando quieras.
        </p>
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 20px; border-radius: 12px; margin: 25px 0; text-align: left;">
          <h4 style="color: #495057; font-size: 16px; margin: 0 0 15px 0; font-weight: 600;">Detalles de la clase cancelada:</h4>
          <p style="color: #5a6c7d; font-size: 15px; margin: 5px 0;"><strong>Clase:</strong> ${details.className}</p>
          <p style="color: #5a6c7d; font-size: 15px; margin: 5px 0;"><strong>Fecha:</strong> ${details.date}</p>
          <p style="color: #5a6c7d; font-size: 15px; margin: 5px 0;"><strong>Hora:</strong> ${details.time} hrs</p>
        </div>
        <div style="text-align: center; margin: 40px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/reservar"
             style="display: inline-block; background: linear-gradient(135deg, #727D73 0%, #AAB99A 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px;">
            Reservar otra clase
          </a>
        </div>
        <p style="color: #6c757d; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
          Si tienes alguna pregunta, no dudes en contactarnos.
        </p>
      </div>
      <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e9ecef;">
        <p style="color: #6c757d; font-size: 12px; margin: 0 0 10px 0;">
          © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
        </p>
      </div>
    </div>
  `;

  const nonRefundableBodyHTML = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #727D73 0%, #AAB99A 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <img src="${process.env.NEXT_PUBLIC_APP_URL}/innataBlack.png" alt="Innata Studio" style="max-width: 180px; height: auto; margin-bottom: 20px;" />
        <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">
          Cancelación Confirmada
        </h1>
      </div>
      <div style="padding: 40px 30px; background-color: #ffffff;">
        <p style="color: #2c3e50; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
          Hola ${name},
        </p>
        <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Hemos procesado la cancelación de tu clase: <strong>${details.className}</strong> programada para el <strong>${details.date}</strong> a las <strong>${details.time} hrs</strong>.
        </p>
        <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
          De acuerdo con nuestra política de cancelación, las cancelaciones realizadas con menos de 12 horas de anticipación no son elegibles para reembolso. Por lo tanto, el crédito de esta clase no ha sido devuelto a tu saldo.
        </p>
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 20px; border-radius: 12px; margin: 25px 0; text-align: left; border-left: 4px solid #dc3545;">
          <h4 style="color: #495057; font-size: 16px; margin: 0 0 15px 0; font-weight: 600;">Detalles de la clase cancelada:</h4>
          <p style="color: #5a6c7d; font-size: 15px; margin: 5px 0;"><strong>Clase:</strong> ${details.className}</p>
          <p style="color: #5a6c7d; font-size: 15px; margin: 5px 0;"><strong>Fecha:</strong> ${details.date}</p>
          <p style="color: #5a6c7d; font-size: 15px; margin: 5px 0;"><strong>Hora:</strong> ${details.time} hrs</p>
        </div>
        <p style="color: #6c757d; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
          Entendemos que pueden surgir imprevistos. Si tienes alguna pregunta o situación especial, por favor contáctanos.
        </p>
      </div>
      <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e9ecef;">
        <p style="color: #6c757d; font-size: 12px; margin: 0 0 10px 0;">
          © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
        </p>
      </div>
    </div>
  `;

  const refundableBodyText = `
Hola ${name},

Hemos procesado la cancelación de tu clase: ${details.className} programada para el ${details.date} a las ${details.time} hrs.

Como cancelaste con más de 12 horas de anticipación, hemos devuelto el crédito de esta clase a tu saldo${details.packageName ? ` en tu paquete (${details.packageName})` : ''}. Puedes usarlo para reservar otra clase cuando quieras.

Detalles de la clase cancelada:
Clase: ${details.className}
Fecha: ${details.date}
Hora: ${details.time} hrs

Puedes reservar otra clase aquí: ${process.env.NEXT_PUBLIC_APP_URL}/reservar

Si tienes alguna pregunta, no dudes en contactarnos.

© ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
  `;

  const nonRefundableBodyText = `
Hola ${name},

Hemos procesado la cancelación de tu clase: ${details.className} programada para el ${details.date} a las ${details.time} hrs.

De acuerdo con nuestra política de cancelación, las cancelaciones realizadas con menos de 12 horas de anticipación no son elegibles para reembolso. Por lo tanto, el crédito de esta clase no ha sido devuelto a tu saldo.

Detalles de la clase cancelada:
Clase: ${details.className}
Fecha: ${details.date}
Hora: ${details.time} hrs

Entendemos que pueden surgir imprevistos. Si tienes alguna pregunta o situación especial, por favor contáctanos.

© ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
  `;

  const htmlBody = details.isRefundable ? refundableBodyHTML : nonRefundableBodyHTML;
  const textBody = details.isRefundable ? refundableBodyText : nonRefundableBodyText;

  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: [email],
      subject: subject,
      html: htmlBody,
      text: textBody,
    });

    if (error) {
      console.error('Resend API error sending cancellation email:', error);
      // Do not throw error up to the caller
    } else {
      console.log('Cancellation confirmation email sent successfully:', data);
    }
  } catch (error) {
    console.error('Error sending cancellation confirmation email:', error);
    // Do not throw error up to the caller
  }
}

// Función para enviar correo de confirmación de compra de paquete
export async function sendPackagePurchaseConfirmationEmail(
  email: string,
  name: string,
  packageDetails: {
    packageName: string;
    classCount: number;
    expiryDate: string; // Formato: "dd/MM/yyyy"
    purchaseDate: string; // Formato: "dd/MM/yyyy"
    price: number;
  }
): Promise<void> {
  const subject = "¡Confirmación de Compra de Paquete - Innata Studio!";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff;">
      <!-- Header con gradiente -->
      <div style="background: linear-gradient(135deg, #727D73 0%, #AAB99A 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <img src="${appUrl}/innataBlack.png" alt="Innata Studio" style="max-width: 180px; height: auto; margin-bottom: 20px;" />
        <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          ¡Gracias por tu Compra! 🛍️
        </h1>
      </div>
      
      <!-- Contenido principal -->
      <div style="padding: 40px 30px; background-color: #ffffff;">
        <p style="color: #2c3e50; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
          Hola ${name},
        </p>
        
        <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
          ¡Felicidades por adquirir tu nuevo paquete de clases en Innata Studio! Estamos emocionados de tenerte con nosotros. Aquí están los detalles de tu compra:
        </p>
        
        <!-- Detalles del Paquete -->
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 1px solid #dee2e6;">
          <h3 style="color: #495057; font-size: 18px; margin: 0 0 20px 0; font-weight: 600; border-bottom: 2px solid #AAB99A; padding-bottom: 10px;">📦 Detalles de tu Paquete:</h3>
          
          <div style="display: grid; gap: 15px;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <span style="color: #6c757d; font-weight: 500;">🏷️ Nombre del Paquete:</span>
              <span style="color: #495057; font-weight: 600;">${packageDetails.packageName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <span style="color: #6c757d; font-weight: 500;">🚲 Número de Clases:</span>
              <span style="color: #495057; font-weight: 600;">${packageDetails.classCount}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <span style="color: #6c757d; font-weight: 500;">💰 Precio:</span>
              <span style="color: #495057; font-weight: 600;">$${packageDetails.price.toFixed(2)} MXN</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6;">
              <span style="color: #6c757d; font-weight: 500;">🛍️ Fecha de Compra:</span>
              <span style="color: #495057; font-weight: 600;">${packageDetails.purchaseDate}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0;">
              <span style="color: #6c757d; font-weight: 500;">⏳ Fecha de Expiración:</span>
              <span style="color: #dd7777; font-weight: 600;">${packageDetails.expiryDate}</span>
            </div>
          </div>
        </div>
        
        <!-- Call to Action Buttons -->
        <div style="text-align: center; margin: 40px 0;">
          <a href="${appUrl}/reservar" 
             style="display: inline-block; background: linear-gradient(135deg, #727D73 0%, #AAB99A 100%); color: #ffffff; padding: 16px 28px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 15px rgba(114, 125, 115, 0.3); margin: 0 10px;">
            Reserva tu próxima clase
          </a>
          <a href="${appUrl}/mi-cuenta" 
             style="display: inline-block; background: linear-gradient(135deg, #AAB99A 0%, #727D73 100%); color: #ffffff; padding: 16px 28px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 15px rgba(114, 125, 115, 0.3); margin: 0 10px;">
            Ir a Mi Cuenta
          </a>
        </div>
        
        <p style="color: #6c757d; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0; text-align: center;">
          ¡Prepárate para sudar, sonreír y superar tus límites! Si tienes alguna pregunta, no dudes en contactarnos.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e9ecef;">
        <p style="color: #6c757d; font-size: 12px; margin: 0 0 10px 0;">
          © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
        </p>
        <p style="color: #6c757d; font-size: 12px; margin: 0;">
          📍 Calle Prada 23, Local 103, Colonia Residencial El Refugio, Querétaro, Qro. CP 76146
        </p>
      </div>
    </div>
  `;

  const textBody = `
¡Gracias por tu Compra - Innata Studio!

Hola ${name},

¡Felicidades por adquirir tu nuevo paquete de clases en Innata Studio!

Detalles de tu Paquete:
- Nombre del Paquete: ${packageDetails.packageName}
- Número de Clases: ${packageDetails.classCount}
- Precio: $${packageDetails.price.toFixed(2)} MXN
- Fecha de Compra: ${packageDetails.purchaseDate}
- Fecha de Expiración: ${packageDetails.expiryDate}

Reserva tu próxima clase: ${appUrl}/reservar
Ir a Mi Cuenta: ${appUrl}/mi-cuenta

¡Prepárate para sudar, sonreír y superar tus límites!

© ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
Calle Prada 23, Local 103, Colonia Residencial El Refugio, Querétaro, Qro. CP 76146
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: [email],
      subject: subject,
      html: htmlBody,
      text: textBody,
    });

    if (error) {
      console.error('Error sending package purchase confirmation email via Resend:', error);
      throw new Error('No se pudo enviar el correo de confirmación de paquete.');
    }

    console.log('Package purchase confirmation email sent successfully:', data);
  } catch (error) {
    console.error('Failed to send package purchase confirmation email:', error);
    // Re-throw la excepción para que el llamador sepa que la operación falló.
    // Asegúrate de que el error sea una instancia de Error.
    if (error instanceof Error) {
      throw error;
    } else {
      // Si no es una instancia de Error, envuélvelo en una.
      throw new Error('Ocurrió un error desconocido al enviar el correo de confirmación de paquete.');
    }
  }
}