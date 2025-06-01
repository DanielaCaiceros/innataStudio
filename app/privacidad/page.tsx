"use client"

import Link from "next/link"

export default function PrivacidadPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-10 pt-28 bg-white">
        <div className="container px-4 md:px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            POLÍTICA DE PRIVACIDAD
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-zinc-700 mb-8">
            En INNATA, nos tomamos muy en serio la protección de tus datos personales.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 bg-white">
        <div className="container px-4 md:px-6 max-w-4xl mx-auto">
          <div className="prose prose-zinc max-w-none">
            <h2 className="text-2xl font-bold text-[#727D73] mb-4">AVISO DE PRIVACIDAD</h2>
            
            <p>
              En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, INNATA STUDIO pone a su disposición el siguiente aviso de privacidad.
            </p>
            
            <h3 className="text-xl font-bold text-[#727D73] mt-6 mb-4">1. RESPONSABLE DE LA PROTECCIÓN DE DATOS</h3>
            
            <p>
              INNATA STUDIO es responsable de recabar sus datos personales, del uso que se les dé a los mismos y de su protección.
            </p>
            
            <h3 className="text-xl font-bold text-[#727D73] mt-6 mb-4">2. FINALIDAD DE LA RECOLECCIÓN DE DATOS</h3>
            
            <p>
              Su información personal será utilizada para proveer los servicios que ha solicitado, informarle sobre cambios en los mismos, realizar evaluaciones periódicas de nuestros servicios a efecto de mejorar la calidad de los mismos, evaluar la calidad del servicio que brindamos, y en general, para dar cumplimiento a las obligaciones que hemos contraído con usted.
            </p>
            
            <p>
              Para las finalidades antes mencionadas, requerimos obtener datos personales como:
            </p>
            
            <ul className="list-disc pl-6 mb-4">
              <li>Nombre completo</li>
              <li>Correo electrónico</li>
              <li>Teléfono</li>
              <li>Fecha de nacimiento</li>
              <li>Información sobre estado de salud</li>
              <li>Información de pago</li>
            </ul>
            
            <h3 className="text-xl font-bold text-[#727D73] mt-6 mb-4">3. MEDIOS PARA LIMITAR EL USO O DIVULGACIÓN DE DATOS</h3>
            
            <p>
              Usted puede dejar de recibir mensajes promocionales por teléfono fijo o celular, correo postal y correo electrónico siguiendo los siguientes pasos: enviar un correo a contacto@studioinnata.com con el asunto "CANCELAR COMUNICACIÓN".
            </p>
            
            <h3 className="text-xl font-bold text-[#727D73] mt-6 mb-4">4. MEDIOS PARA EJERCER DERECHOS ARCO</h3>
            
            <p>
              Usted tiene derecho a acceder, rectificar y cancelar sus datos personales, así como de oponerse al tratamiento de los mismos o revocar el consentimiento que para tal fin nos haya otorgado, a través de los procedimientos que hemos implementado.
            </p>
            
            <p>
              Para conocer dichos procedimientos, los requisitos y plazos, se puede poner en contacto con nuestro departamento de datos personales en contacto@studioinnata.com o visitar nuestro sitio de Internet www.innatastudio.com.
            </p>
            
            <h3 className="text-xl font-bold text-[#727D73] mt-6 mb-4">5. TRANSFERENCIA DE DATOS</h3>
            
            <p>
              Sus datos personales pueden ser transferidos y tratados dentro y fuera del país, por personas distintas a esta empresa. En ese sentido, su información puede ser compartida con nuestros proveedores de servicios para los fines citados en el punto 2.
            </p>
            
            <p>
              Nos comprometemos a no transferir su información personal a terceros sin su consentimiento, salvo las excepciones previstas en el artículo 37 de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, así como a realizar esta transferencia en los términos que fija esa ley.
            </p>
            
            <h3 className="text-xl font-bold text-[#727D73] mt-6 mb-4">6. CAMBIOS AL AVISO DE PRIVACIDAD</h3>
            
            <p>
              Nos reservamos el derecho de efectuar en cualquier momento modificaciones o actualizaciones al presente aviso de privacidad, para la atención de novedades legislativas, políticas internas o nuevos requerimientos para la prestación u ofrecimiento de nuestros servicios o productos.
            </p>
            
            <p>
              Estas modificaciones estarán disponibles al público a través de nuestra página de Internet www.studioinnata.com.
            </p>
            
            <h3 className="text-xl font-bold text-[#727D73] mt-6 mb-4">7. COOKIES Y WEB BEACONS</h3>
            
            <p>
              Le informamos que en nuestra página de Internet utilizamos cookies y web beacons para obtener información personal de usted, como la siguiente: su tipo de navegador y sistema operativo, las páginas de Internet que visita, los vínculos que sigue, la dirección IP y el sitio que visitó antes de entrar al nuestro.
            </p>
            
            <p>
              Estas cookies y otras tecnologías similares pueden ser deshabilitadas a través de la configuración de su navegador.
            </p>

            <div className="mt-10 border-t pt-6 text-center">
              <p>
                Fecha de última actualización: 31 de mayo de 2025
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
