// lib/email.ts

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Función para enviar correo de verificación
export async function sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
  const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${token}`;
  
  console.log('Sending verification email to:', email);
  console.log('Using Resend API key:', process.env.RESEND_API_KEY ? 'Present' : 'Missing');
  
  try {
    await resend.emails.send({
      from: 'Innata Studio <onboarding@resend.dev>',
      to: email,
      subject: 'Verifica tu cuenta en Innata Studio',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL}/innataBlack.png" alt="Innata Studio" style="max-width: 150px;" />
          </div>
          <h2 style="color: #4A102A; text-align: center;">¡Bienvenido(a) a Innata Studio!</h2>
          <p>Hola ${name},</p>
          <p>Gracias por registrarte en Innata Studio. Para completar tu registro y verificar tu cuenta, haz clic en el siguiente botón:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #4A102A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold;">Verificar mi cuenta</a>
          </div>
          <p>Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">${verificationLink}</p>
          <p>Este enlace expirará en 24 horas.</p>
          <p>Si no has solicitado este correo, puedes ignorarlo.</p>
          <hr style="border: none; border-top: 1px solid #e1e1e1; margin: 20px 0;" />
          <p style="text-align: center; color: #777; font-size: 12px;">
            © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('No se pudo enviar el correo de verificación. Por favor intenta más tarde.');
  }
}

// Función para enviar correo de restablecimiento de contraseña
export async function sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  
  try {
    await resend.emails.send({
      from: 'Innata Studio <onboarding@resend.dev>',
      to: email,
      subject: 'Restablece tu contraseña en Innata Studio',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${process.env.NEXT_PUBLIC_APP_URL}/innataBlack.png" alt="Innata Studio" style="max-width: 150px;" />
          </div>
          <h2 style="color: #4A102A; text-align: center;">Restablece tu contraseña</h2>
          <p>Hola ${name},</p>
          <p>Has solicitado restablecer tu contraseña en Innata Studio. Haz clic en el siguiente botón para crear una nueva contraseña:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4A102A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold;">Restablecer contraseña</a>
          </div>
          <p>Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">${resetLink}</p>
          <p>Este enlace expirará en 1 hora.</p>
          <p>Si no has solicitado este correo, puedes ignorarlo. Tu contraseña permanecerá sin cambios.</p>
          <hr style="border: none; border-top: 1px solid #e1e1e1; margin: 20px 0;" />
          <p style="text-align: center; color: #777; font-size: 12px;">
            © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
          </p>
        </div>
      `,
    });
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
  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
    to: email,
    subject: 'Confirmación de reserva - Innata Studio',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${process.env.NEXT_PUBLIC_APP_URL}/innataBlack.png" alt="Innata Studio" style="max-width: 150px;" />
        </div>
        <h2 style="color: #4A102A; text-align: center;">¡Reserva Confirmada!</h2>
        <p>Hola ${name},</p>
        <p>Tu reserva ha sido confirmada exitosamente. Aquí tienes los detalles:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Clase:</strong> ${bookingDetails.className}</p>
          <p><strong>Fecha:</strong> ${bookingDetails.date}</p>
          <p><strong>Hora:</strong> ${bookingDetails.time}</p>
          <p><strong>Instructor:</strong> ${bookingDetails.instructor}</p>
          <p><strong>Código de confirmación:</strong> ${bookingDetails.confirmationCode}</p>
        </div>
        
        <p>Recuerda llegar 15 minutos antes de tu clase. Si necesitas cancelar tu reserva, puedes hacerlo hasta 4 horas antes del inicio de la clase desde tu perfil.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/mi-cuenta" style="background-color: #4A102A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold;">Ver mis reservas</a>
        </div>
        
        <p>¡Te esperamos en el estudio!</p>
        <hr style="border: none; border-top: 1px solid #e1e1e1; margin: 20px 0;" />
        <p style="text-align: center; color: #777; font-size: 12px;">
          © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
        </p>
      </div>
    `,
  };

  try {
    await resend.emails.send(mailOptions);
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    throw new Error('No se pudo enviar el correo de confirmación. Por favor verifica tu reserva en tu perfil.');
  }
}