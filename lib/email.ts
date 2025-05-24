import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to,
      subject,
      html,
    })
    
    return { success: true, result }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

export function getVerificationEmailTemplate(name: string, verificationUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifica tu cuenta - Innata Studio</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${process.env.APP_URL}/innataBlack.png" alt="Innata Studio" style="height: 60px;">
      </div>
      
      <div style="background: linear-gradient(135deg, #4A102A 0%, #85193C 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">¡Bienvenido a Innata Studio!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Tu transformación comienza aquí</p>
      </div>
      
      <div style="padding: 0 20px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hola <strong>${name}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          ¡Gracias por unirte a nuestra comunidad de fitness! Para completar tu registro y comenzar a reservar clases, 
          necesitamos verificar tu dirección de correo electrónico.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background: linear-gradient(135deg, #4A102A 0%, #85193C 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 50px; 
                    font-weight: bold; 
                    font-size: 16px; 
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(74, 16, 42, 0.3);">
            Verificar mi cuenta
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
        </p>
        <p style="font-size: 14px; color: #85193C; word-break: break-all;">
          ${verificationUrl}
        </p>
        
        <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
          <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
            <strong>¿Qué sigue después de verificar tu cuenta?</strong>
          </p>
          <ul style="font-size: 14px; color: #666; margin: 0; padding-left: 20px;">
            <li>Podrás reservar clases</li>
            <li>Comprar paquetes y membresías</li>
            <li>Acceder a tu historial de clases</li>
            <li>Recibir notificaciones importantes</li>
          </ul>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Este enlace expira en 24 horas por seguridad. Si no solicitaste esta cuenta, 
          puedes ignorar este correo.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="font-size: 14px; color: #666; margin: 5px 0;">
          © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
        </p>
        <p style="font-size: 14px; color: #666; margin: 5px 0;">
          Av. Principal #123, Ciudad | Tel: 775-357-1894
        </p>
      </div>
    </body>
    </html>
  `
}

export function getWelcomeEmailTemplate(name: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>¡Cuenta verificada! - Innata Studio</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${process.env.APP_URL}/innataBlack.png" alt="Innata Studio" style="height: 60px;">
      </div>
      
      <div style="background: linear-gradient(135deg, #4A102A 0%, #85193C 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">¡Cuenta Verificada! 🎉</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Ya puedes comenzar tu transformación</p>
      </div>
      
      <div style="padding: 0 20px;">
        <p style="font-size: 16px; margin-bottom: 20px;">¡Hola <strong>${name}</strong>!</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          ¡Excelente! Tu cuenta ha sido verificada exitosamente. Ahora tienes acceso completo a 
          todas las funcionalidades de Innata Studio.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #4A102A; margin-top: 0;">¿Qué puedes hacer ahora?</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">🏋️‍♀️ Reservar clases de ciclismo indoor</li>
            <li style="margin-bottom: 8px;">💳 Comprar paquetes y membresías</li>
            <li style="margin-bottom: 8px;">📅 Ver tu horario de clases</li>
            <li style="margin-bottom: 8px;">👤 Gestionar tu perfil</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.APP_URL}/reservar" 
             style="background: linear-gradient(135deg, #4A102A 0%, #85193C 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 50px; 
                    font-weight: bold; 
                    font-size: 16px; 
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(74, 16, 42, 0.3);
                    margin-right: 10px;">
            Reservar mi primera clase
          </a>
          <a href="${process.env.APP_URL}/paquetes" 
             style="background: transparent; 
                    color: #4A102A; 
                    border: 2px solid #4A102A;
                    padding: 13px 28px; 
                    text-decoration: none; 
                    border-radius: 50px; 
                    font-weight: bold; 
                    font-size: 16px; 
                    display: inline-block;">
            Ver paquetes
          </a>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #856404;">
            <strong>💡 Tip:</strong> Te recomendamos llegar 15 minutos antes de tu primera clase 
            para que puedas familiarizarte con las instalaciones y el equipo.
          </p>
        </div>
        
        <p style="font-size: 16px; margin-top: 30px;">
          Si tienes alguna pregunta, no dudes en contactarnos. ¡Estamos aquí para ayudarte!
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="font-size: 14px; color: #666; margin: 5px 0;">
          © ${new Date().getFullYear()} Innata Studio. Todos los derechos reservados.
        </p>
        <p style="font-size: 14px; color: #666; margin: 5px 0;">
          Av. Principal #123, Ciudad | Tel: 775-357-1894
        </p>
        <p style="font-size: 12px; color: #999; margin: 15px 0 5px 0;">
          <a href="${process.env.APP_URL}/mi-cuenta" style="color: #85193C;">Mi Cuenta</a> | 
          <a href="${process.env.APP_URL}/nosotros" style="color: #85193C;">Nosotros</a> | 
          <a href="mailto:innata@indoor@gmail.com" style="color: #85193C;">Soporte</a>
        </p>
      </div>
    </body>
    </html>
  `
}