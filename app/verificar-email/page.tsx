// app/verificar-email/page.tsx
import { Suspense } from 'react'
import { ResendVerification } from '@/components/ui/resend-verification'

function VerificationContent() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <img 
            src="/innataBlack.png" 
            alt="Innata Studio" 
            className="mx-auto h-20 w-auto"
          />
          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            Verificación de Email
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            ¿No recibiste el correo de verificación? Reenvíalo aquí.
          </p>
        </div>
        
        <ResendVerification />
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            ¿Ya verificaste tu cuenta?{' '}
            <a href="/login" className="text-brand-sage hover:text-brand-mint font-medium">
              Iniciar sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerificationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-sage mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <VerificationContent />
    </Suspense>
  )
}