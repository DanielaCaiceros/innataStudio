// lib/email.ts - Email service using Resend
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
import { formatTimeFromDB } from '@/lib/utils/date';

// Función para formatear la fecha de manera legible para WhatsApp
const formatDateForWhatsApp = (dateString: string): string => {
  try {
    // Crear la fecha asumiendo que está en UTC y convertirla a la zona horaria local
    const date = new Date(dateString);
    
    // Si la fecha viene en formato ISO, asegurarse de usar la fecha sin conversión de zona horaria
    if (dateString.includes('T')) {
      // Para fechas ISO, extraer solo la parte de la fecha
      const dateOnly = dateString.split('T')[0];
      const [year, month, day] = dateOnly.split('-').map(Number);
      const localDate = new Date(year, month - 1, day); // month - 1 porque los meses en JS van de 0-11
      
      return localDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString; // Fallback al string original
  }
}

// Interface for booking email details
export interface BookingEmailDetails {
  className: string;
  date: string;
  time: string;
  instructor: string;
  confirmationCode: string;
  bikeNumber?: number;
  isUnlimitedWeek?: boolean;
  graceTimeHours?: number;
}

export async function sendBookingConfirmationEmail(
  email: string,
  name: string,
  details: BookingEmailDetails,
) {
  try {
    // Generate content for Unlimited Week bookings
    const unlimitedWeekContent = details.isUnlimitedWeek
      ? `
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="color: #92400e; font-size: 18px; font-weight: 600; margin: 0;">
          RESERVA CON SEMANA ILIMITADA - CONFIRMACIÓN REQUERIDA
          </h3>
        </div>

        <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <div style="text-align: center; margin-bottom: 16px;">
            <p style="color: #dc2626; font-weight: 600; font-size: 16px; margin: 0;">
            DEBES CONFIRMAR POR WHATSAPP
            </p>
          </div>

          <p style="color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
            Para garantizar tu lugar en esta clase, es OBLIGATORIO que envíes
            un mensaje de confirmación por WhatsApp con al menos 12 horas de anticipación.
          </p>

          <div style="margin: 20px 0;">
            <p style="color: #374151; font-weight: 600; margin: 0 0 12px 0;">
              PASOS A SEGUIR:
            </p>

            <ul style="color: #374151; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Envía un WhatsApp confirmando tu asistencia</li>
              <li>Hazlo antes de las 12 horas previas a la clase</li>
            </ul>

            <div style="text-align: center; margin: 20px 0;">
              <a href="https://wa.me/527753571894?text=${encodeURIComponent(`Hola! Soy ${name} Acabo de hacer una reserva con Semana Ilimitada para confirmar mi asistencia. Fecha: ${formatDateForWhatsApp(details.date)} Hora: ${details.time}`)}" style="background-color: #25D366; color: #ffffff; padding: 12px 24px; border-radius: 25px; text-decoration: none; font-weight: 600; display: inline-block;">
                Confirmar por WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <p style="color: #92400e; font-size: 14px; line-height: 1.5; margin: 0;">
            IMPORTANTE: Si no envías la confirmación a tiempo, tu reserva será cancelada automáticamente
            y se liberará el espacio para otros usuarios.
          </p>
        </div>
      </div>
    `
      : "";

    const bikeInfo = details.bikeNumber
      ? `
      <div style="margin: 8px 0;">
        <span style="color: #6b7280; font-size: 14px;">Bicicleta:</span>
        <span style="color: #111827; font-weight: 500; margin-left: 8px;">#${details.bikeNumber}</span>
      </div>
    `
      : "";

    const { data, error } = await resend.emails.send({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: [email],
      subject: "Confirmación de reserva - Innata Studio",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirmación de reserva</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

            <!-- Header -->
            <div style="position: relative; padding: 40px 20px; text-align: center; border-radius: 30px; overflow: hidden; background: linear-gradient(135deg, rgba(156, 175, 136, 0.9), rgba(184, 212, 168, 0.8)); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);">
              <!-- Glass overlay -->
              <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05)); pointer-events: none;"></div>

              <div style="position: relative; z-index: 1;">
                <h3 style="color: rgba(255, 255, 255, 0.95); font-size: 28px; font-weight: 600; margin: 0 0 8px 0; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                  Reserva Confirmada
                </h3>

                <p style="color: rgba(255, 255, 255, 0.8); font-size: 18px; margin: 0; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">
                  Innata Studio
                </p>
              </div>
            </div>

            <!-- Content -->
            <div style="padding: 40px 20px;">
              <p style="color: #111827; font-size: 18px; font-weight: 500; margin: 0 0 16px 0;">
                Hola ${name},
              </p>

              <p style="color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
                ${
                  details.isUnlimitedWeek
                    ? "¡Tu reserva con  Semana Ilimitada ha sido procesada! Por favor lee atentamente la información sobre confirmación requerida."
                    : "¡Tu reserva ha sido confirmada exitosamente! Te esperamos en el estudio."
                }
              </p>

              ${unlimitedWeekContent}

              <!-- Class Details -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
                  Detalles de tu Clase:
                </h3>

                <div style="space-y: 12px;">
                  <div style="margin: 8px 0;">
                    <span style="color: #6b7280; font-size: 14px;">Clase:</span>
                    <span style="color: #111827; font-weight: 500; margin-left: 8px;">${details.className}</span>
                  </div>

                  <div style="margin: 8px 0;">
                    <span style="color: #6b7280; font-size: 14px;">Fecha:</span>
                    <span style="color: #111827; font-weight: 500; margin-left: 8px;">${details.date}</span>
                  </div>

                  <div style="margin: 8px 0;">
                    <span style="color: #6b7280; font-size: 14px;">Hora:</span>
                    <span style="color: #111827; font-weight: 500; margin-left: 8px;">${details.time}</span>
                  </div>

                  <div style="margin: 8px 0;">
                    <span style="color: #6b7280; font-size: 14px;">Coach:</span>
                    <span style="color: #111827; font-weight: 500; margin-left: 8px;">${details.instructor}</span>
                  </div>

                  ${bikeInfo}

                </div>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="#" style="background-color: #B8D4A8; color: #ffffff; padding: 16px 32px; border-radius: 25px; text-decoration: none; font-weight: 600; display: inline-block; overflow: hidden;">
                  Ver mis reservas
                </a>
              </div>

              <p style="color: #374151; text-align: center; margin: 24px 0;">
                ¡Te esperamos en el estudio! 🚴‍♀️💪
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        ¡Reserva Confirmada! - Innata Studio

        Hola ${name},

        Tu reserva ha sido confirmada exitosamente:

        Clase: ${details.className}
        Fecha: ${details.date}
        Hora: ${details.time}
        Instructor: ${details.instructor}
        ${details.bikeNumber ? `Bicicleta: #${details.bikeNumber}` : ""}

        Recuerda llegar 15 minutos antes de tu clase.

        ¡Te esperamos en el estudio!

        © ${new Date().getFullYear()} Innata Studio.
      `,
    });

    if (error) {
      console.error("Resend API error:", error);
      throw new Error(`Error de Resend: ${error.message}`);
    }

    console.log("Booking confirmation email sent successfully:", data);
  } catch (error) {
    console.error("Error sending booking confirmation email:", error);
    throw new Error(
      "No se pudo enviar el correo de confirmación. Por favor verifica tu reserva en tu perfil.",
    );
  }
}

// Email verification function
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
): Promise<void> {
  const verificationLink = `https://innatastudio.com/api/auth/verify?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: [email],
      subject: "🚴‍♀️ Verifica tu cuenta en Innata Studio",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">

            <div style="position: relative; padding: 40px 20px; text-align: center; border-radius: 30px; overflow: hidden; background: linear-gradient(135deg, rgba(156, 175, 136, 0.9), rgba(184, 212, 168, 0.8)); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);">
              <!-- Glass overlay -->
              <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05)); pointer-events: none;"></div>

              <div style="position: relative; z-index: 1;">
                <h3 style="color: rgba(255, 255, 255, 0.95); font-size: 24px; font-weight: 600; margin: 0 0 8px 0; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                  Bienvenido a Innata Studio
                </h3>

                <p style="color: rgba(255, 255, 255, 0.8); font-size: 16px; margin: 0; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">
                  Innata Studio
                </p>
              </div>
            </div>

            <div style="padding: 40px 20px;">
              <p style="color: #111827; font-size: 18px; font-weight: 500; margin: 0 0 16px 0;">
                Hola ${name},
              </p>

              <p style="color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
                ¡Gracias por unirte a nuestra comunidad de ciclismo indoor! Para completar tu registro y comenzar a reservar clases increíbles, necesitamos verificar tu dirección de correo electrónico.
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationLink}" style="background-color: #B8D4A8; color: #ffffff; padding: 16px 32px; border-radius: 25px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Verificar mi cuenta
                </a>
              </div>

              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="color: #374151; font-size: 14px; font-weight: 500; margin: 0 0 8px 0;">
                  ¿Problemas con el botón? Copia y pega este enlace:
                </p>

                <p style="color: #6b7280; font-size: 14px; word-break: break-all; margin: 0;">
                  ${verificationLink}
                </p>
              </div>

              <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">
                  Este enlace expirará en 24 horas por seguridad.
                </p>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">
                Si no solicitaste esta cuenta, puedes ignorar este correo de forma segura.
              </p>
            </div>

            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
                © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
              </p>

              <p style="color: #10b981; font-size: 14px; font-weight: 500; margin: 0;">
                🏃‍♀️ ¡Prepárate para transformar tu cuerpo y mente!
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        ¡Bienvenido(a) a Innata Studio!

        Hola ${name},

        Gracias por registrarte en Innata Studio. Para completar tu registro y verificar tu cuenta, visita el siguiente enlace:

        ${verificationLink}

        Este enlace expirará en 24 horas.

        Si no has solicitado este correo, puedes ignorarlo.

        © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
      `,
    });

    if (error) {
      console.error("Resend API error:", error);
      throw new Error(`Error de Resend: ${error.message}`);
    }

    console.log("Email sent successfully:", data);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error(
      "No se pudo enviar el correo de verificación. Por favor intenta más tarde.",
    );
  }
}

// Password reset email function
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string,
): Promise<void> {
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/login?reset-token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: [email],
      subject: "🔐 Restablece tu contraseña - Innata Studio",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">

            <div style="position: relative; padding: 40px 20px; text-align: center; border-radius: 30px; overflow: hidden; background: linear-gradient(135deg, rgba(156, 175, 136, 0.9), rgba(184, 212, 168, 0.8)); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);">
              <!-- Glass overlay -->
              <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05)); pointer-events: none;"></div>

              <div style="position: relative; z-index: 1;">
                <h3 style="color: rgba(255, 255, 255, 0.95); font-size: 24px; font-weight: 600; margin: 0 0 8px 0; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                  Restablecer Contraseña
                </h3>

                <p style="color: rgba(255, 255, 255, 0.8); font-size: 16px; margin: 0; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">
                  Innata Studio
                </p>
              </div>
            </div>

            <div style="padding: 40px 20px;">
              <p style="color: #111827; font-size: 18px; font-weight: 500; margin: 0 0 16px 0;">
                Hola ${name},
              </p>

              <p style="color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
                Has solicitado restablecer tu contraseña en Innata Studio. Haz clic en el siguiente botón para crear una nueva contraseña:
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}" style="background-color: #B8D4A8; color: #ffffff; padding: 16px 32px; border-radius: 25px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Restablecer contraseña
                </a>
              </div>

              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="color: #374151; font-size: 14px; font-weight: 500; margin: 0 0 8px 0;">
                  ¿Problemas con el botón? Copia y pega este enlace:
                </p>

                <p style="color: #6b7280; font-size: 14px; word-break: break-all; margin: 0;">
                  ${resetLink}
                </p>
              </div>

              <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">
                  Este enlace expirará en 1 día por seguridad.
                </p>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">
                Si no has solicitado este cambio, puedes ignorar este correo. Tu contraseña permanecerá sin cambios.
              </p>
            </div>

            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Restablecer Contraseña - Innata Studio

        Hola ${name},

        Has solicitado restablecer tu contraseña. Visita este enlace para crear una nueva:

        ${resetLink}

        Este enlace expirará en 1 hora.

        Si no solicitaste este cambio, ignora este correo.

        © ${new Date().getFullYear()} Innata Studio.
      `,
    });

    if (error) {
      console.error("Resend API error:", error);
      throw new Error(`Error de Resend: ${error.message}`);
    }

    console.log("Password reset email sent successfully:", data);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error(
      "No se pudo enviar el correo de restablecimiento. Por favor intenta más tarde.",
    );
  }
}

// Package purchase confirmation email function
export async function sendPackagePurchaseConfirmationEmail(
  email: string,
  name: string,
  packageDetails: {
    packageName: string;
    classCount: number;
    expiryDate: string;
    purchaseDate: string;
    price: number;
    isUnlimitedWeek?: boolean;
    branchName?: string;
  },
): Promise<void> {
  const subject = "¡Confirmación de Compra de Paquete - Innata Studio!";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">

        <div style="position: relative; padding: 40px 20px; text-align: center; border-radius: 30px; overflow: hidden; background: linear-gradient(135deg, rgba(156, 175, 136, 0.9), rgba(184, 212, 168, 0.8)); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);">
          <!-- Glass overlay -->
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05)); pointer-events: none;"></div>

          <div style="position: relative; z-index: 1;">
            <h3 style="color: rgba(255, 255, 255, 0.95); font-size: 24px; font-weight: 600; margin: 0 0 8px 0; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
              Gracias por tu Compra
            </h3>

            <p style="color: rgba(255, 255, 255, 0.8); font-size: 16px; margin: 0; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">
              Innata Studio
            </p>
          </div>
        </div>

        <div style="padding: 40px 20px;">
          <p style="color: #111827; font-size: 18px; font-weight: 500; margin: 0 0 16px 0;">
            Hola ${name},
          </p>

          <p style="color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
            ¡Felicidades por adquirir tu nuevo paquete de clases en Innata Studio! Estamos emocionados de tenerte con nosotros. Aquí están los detalles de tu compra:
          </p>

          <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
              📦 Detalles de tu Paquete:
            </h3>

            <div style="space-y: 12px;">
              <div style="margin: 8px 0;">
                <span style="color: #6b7280; font-size: 14px;">Nombre del Paquete:</span>
                <span style="color: #111827; font-weight: 500; margin-left: 8px;">${packageDetails.packageName}</span>
              </div>

              ${packageDetails.branchName ? `
              <div style="margin: 8px 0;">
                <span style="color: #6b7280; font-size: 14px;">Sucursal:</span>
                <span style="color: #111827; font-weight: 500; margin-left: 8px;">📍 ${packageDetails.branchName}</span>
              </div>` : ''}

              <div style="margin: 8px 0;">
                <span style="color: #6b7280; font-size: 14px;">Número de Clases:</span>
                <span style="color: #111827; font-weight: 500; margin-left: 8px;">${packageDetails.classCount}</span>
              </div>

              <div style="margin: 8px 0;">
                <span style="color: #6b7280; font-size: 14px;">Precio:</span>
                <span style="color: #111827; font-weight: 500; margin-left: 8px;">$${packageDetails.price.toFixed(2)} MXN</span>
              </div>

              ${packageDetails.isUnlimitedWeek
                ? `<div style="margin: 8px 0;">
                    <span style="color: #6b7280; font-size: 14px;">Inicio de semana ilimitada:</span>
                    <span style="color: #111827; font-weight: 500; margin-left: 8px;">${packageDetails.purchaseDate}</span>
                  </div>
                  <div style="margin: 8px 0;">
                    <span style="color: #6b7280; font-size: 14px;">Fin de semana ilimitada:</span>
                    <span style="color: #111827; font-weight: 500; margin-left: 8px;">${packageDetails.expiryDate}</span>
                  </div>
                  <div style="background: #F0F4E8; border-left: 6px solid #AAB99A; border-radius: 8px; padding: 18px 20px; margin: 24px 0 0 0;">
                    <h4 style="color: #4A102A; font-size: 16px; font-weight: bold; margin: 0 0 10px 0;">Reglas de la Semana Ilimitada:</h4>
                    <ul style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0; padding-left: 22px;">
                      <li>Solo puedes reservar clases de <b>lunes a viernes</b> de la semana seleccionada.</li>
                      <li>Hasta <b>25 clases</b> en la semana ilimitada.</li>
                      <li>Si <b>no te presentas, y no cancelaste antes</b>, se descontará una clase de tu paquete, y se penalizará la siguiente clase.</li>
                       <li>Si <b>cancelas con más de 12 horas</b>, no hay penalización pero se descontará una clase de tu paquete.</li>
                       <li>Si <b>cancelas con menos de 12 horas o no asistes</b>, habrá penalización adicional.</li>

                      <li>Debes <b>confirmar tu asistencia por WhatsApp</b> al menos 12 horas antes de la clase para garantizar tu lugar.</li>
                    </ul>
                  </div>`
                : `<div style="margin: 8px 0;">
                    <span style="color: #6b7280; font-size: 14px;">Fecha de Compra:</span>
                    <span style="color: #111827; font-weight: 500; margin-left: 8px;">${packageDetails.purchaseDate}</span>
                  </div>
                  <div style="margin: 8px 0;">
                    <span style="color: #6b7280; font-size: 14px;">Fecha de Expiración:</span>
                    <span style="color: #111827; font-weight: 500; margin-left: 8px;">${packageDetails.expiryDate}</span>
                  </div>`
              }

            </div>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${appUrl}/reservar" style="background-color: #B8D4A8; color: #ffffff; padding: 16px 32px; border-radius: 25px; text-decoration: none; font-weight: 600; display: inline-block; margin: 8px;">
              Reserva tu próxima clase
            </a>
            <a href="${appUrl}/mi-cuenta" style="background-color: #F0F4E8; color: #5A6B4F; padding: 16px 32px; border-radius: 25px; text-decoration: none; font-weight: 600; display: inline-block; margin: 8px;">
              Ir a Mi Cuenta
            </a>
          </div>

          <p style="color: #374151; text-align: center; margin: 24px 0;">
            ¡Prepárate para sudar, sonreír y superar tus límites! Si tienes alguna pregunta, no dudes en contactarnos.
          </p>
        </div>

        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
            © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
          </p>

        </div>
      </div>
    </body>
    </html>
  `;

  const textBody = `
¡Gracias por tu Compra - Innata Studio!

Hola ${name},

¡Felicidades por adquirir tu nuevo paquete de clases en Innata Studio!

Detalles de tu Paquete:
- Nombre del Paquete: ${packageDetails.packageName}
- Número de Clases: ${packageDetails.classCount}
- Precio: $${packageDetails.price.toFixed(2)} MXN
- ${packageDetails.isUnlimitedWeek
  ? `Inicio de semana ilimitada: ${packageDetails.purchaseDate}`
  : `Fecha de Compra: ${packageDetails.purchaseDate}`
}
- ${packageDetails.isUnlimitedWeek
  ? `Fin de semana ilimitada: ${packageDetails.expiryDate}`
  : `Fecha de Expiración: ${packageDetails.expiryDate}`
}

Reserva tu próxima clase: ${appUrl}/reservar
Ir a Mi Cuenta: ${appUrl}/mi-cuenta

¡Prepárate para sudar, sonreír y superar tus límites!

© ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
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
      console.error(
        "Error sending package purchase confirmation email via Resend:",
        error,
      );
      throw new Error(
        "No se pudo enviar el correo de confirmación de paquete.",
      );
    }

    console.log("Package purchase confirmation email sent successfully:", data);
  } catch (error) {
    console.error("Failed to send package purchase confirmation email:", error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(
        "Ocurrió un error desconocido al enviar el correo de confirmación de paquete.",
      );
    }
  }
}

export async function sendCancellationConfirmationEmail(
  email: string,
  name: string,
  details: {
    className: string;
    date: string;
    time: string;
    isRefundable: boolean;
    packageName?: string;
  },
): Promise<void> {
  const subject = details.isRefundable
    ? "IMPORTANTE: Cancelación de clase confirmada - Crédito devuelto"
    : "IMPORTANTE: Cancelación de clase confirmada";

  const refundableBodyHTML = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">

        <div style="position: relative; padding: 40px 20px; text-align: center; border-radius: 30px; overflow: hidden; background: linear-gradient(135deg, rgba(156, 175, 136, 0.9), rgba(184, 212, 168, 0.8)); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);">
          <!-- Glass overlay -->
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05)); pointer-events: none;"></div>

          <div style="position: relative; z-index: 1;">
            <h3 style="color: rgba(255, 255, 255, 0.95); font-size: 24px; font-weight: 600; margin: 0 0 8px 0; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
              Cancelación Confirmada
            </h3>

            <p style="color: rgba(255, 255, 255, 0.8); font-size: 16px; margin: 0; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">
              Innata Studio
            </p>
          </div>
        </div>

        <div style="padding: 40px 20px;">
          <p style="color: #111827; font-size: 18px; font-weight: 500; margin: 0 0 16px 0;">
            Hola ${name},
          </p>

          <p style="color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
            Hemos procesado la cancelación de tu clase: ${details.className} programada para el ${details.date} a las ${details.time} hrs.
          </p>

          <p style="color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
            Como cancelaste con más de 12 horas de anticipación, hemos devuelto el crédito de esta clase a tu saldo${details.packageName ? ` en tu paquete (${details.packageName})` : ""}. Puedes usarlo para reservar otra clase cuando quieras.
          </p>

          <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #111827; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">
              Detalles de la clase cancelada:
            </h3>

            <p style="color: #374151; margin: 8px 0;"><strong>Clase:</strong> ${details.className}</p>
            <p style="color: #374151; margin: 8px 0;"><strong>Fecha:</strong> ${details.date}</p>
            <p style="color: #374151; margin: 8px 0;"><strong>Hora:</strong> ${details.time} hrs</p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/reservar" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Reservar otra clase
            </a>
          </div>

          <p style="color: #374151; text-align: center; margin: 24px 0;">
            Si tienes alguna pregunta, no dudes en contactarnos.
          </p>
        </div>

        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const nonRefundableBodyHTML = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">

        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0;">
            Cancelación Confirmada
          </h1>
        </div>

        <div style="padding: 40px 20px;">
          <p style="color: #111827; font-size: 18px; font-weight: 500; margin: 0 0 16px 0;">
            Hola ${name},
          </p>

          <p style="color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
            Hemos procesado la cancelación de tu clase: ${details.className} programada para el ${details.date} a las ${details.time} hrs.
          </p>

          <p style="color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
            De acuerdo con nuestra política de cancelación, las cancelaciones realizadas con menos de 12 horas de anticipación o agendadas con Semana Ilimitada no son elegibles para reembolso. Por lo tanto, el crédito de esta clase no ha sido devuelto a tu saldo.
          </p>

          <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #111827; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">
              Detalles de la clase cancelada:
            </h3>

            <p style="color: #374151; margin: 8px 0;"><strong>Clase:</strong> ${details.className}</p>
            <p style="color: #374151; margin: 8px 0;"><strong>Fecha:</strong> ${details.date}</p>
            <p style="color: #374151; margin: 8px 0;"><strong>Hora:</strong> ${details.time} hrs</p>
          </div>

          <p style="color: #374151; text-align: center; margin: 24px 0;">
            Entendemos que pueden surgir imprevistos. Si tienes alguna pregunta o situación especial, por favor contáctanos.
          </p>
        </div>

        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const refundableBodyText = `
Hola ${name},

Hemos procesado la cancelación de tu clase: ${details.className} programada para el ${details.date} a las ${details.time} hrs.

Como cancelaste con más de 12 horas de anticipación, hemos devuelto el crédito de esta clase a tu saldo${details.packageName ? ` en tu paquete (${details.packageName})` : ""}. Puedes usarlo para reservar otra clase cuando quieras.

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

  const htmlBody = details.isRefundable
    ? refundableBodyHTML
    : nonRefundableBodyHTML;
  const textBody = details.isRefundable
    ? refundableBodyText
    : nonRefundableBodyText;

  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: [email],
      subject: subject,
      html: htmlBody,
      text: textBody,
    });

    if (error) {
      console.error("Resend API error sending cancellation email:", error);
    } else {
      console.log("Cancellation confirmation email sent successfully:", data);
    }
  } catch (error) {
    console.error("Error sending cancellation confirmation email:", error);
  }
}