import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Instagram, Facebook } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle, Users, Clock, AlertCircle, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-900">
      {/* Hero Section - Container Style */}
      <section className="w-full py-8 mt-2">
        <div className="container mx-auto px-4">
          {/* Hero Banner */}
          <div className="relative w-full h-[600px] rounded-3xl overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-gray/70 via-brand-sage/30 to-transparent z-10"></div>

            {/* Background Image */}
            <Image
              src="/innataAsset2.JPG"
              alt="cycling studio bike"
              fill
              className="object-cover object-center rounded-3xl"
              priority
            />

            {/* Content */}
            <div className="relative z-20 h-full flex flex-col justify-center p-8 md:p-16 max-w-2xl anim-slide-in-up">
              <h2 className="text-xl md:text-2xl font-medium text-white/90 mb-2">Innata Studio</h2>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
                RIDE TO
                <br />
                SHINE
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-8">Bienvenido a nuestra comunidad indoor. </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/reservar"
                  className="bg-white hover:bg-gray-100 text-zinc-800 rounded-full px-8 py-4 text-lg inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <span>Reserva tu clase</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>

                <Link
                  href="/clases"
                  className="bg-brand-cream hover:bg-brand-cream/90 text-zinc-800 rounded-full px-8 py-4 text-lg inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <span>Ver clases</span>
                </Link>
              </div>

              <div className="flex items-center gap-6 mt-8">
                <Link
                  href="https://www.instagram.com/studio.innata/"
                  className="text-white hover:text-brand-cream"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="h-6 w-6" />
                  <span className="sr-only">Instagram</span>
                </Link>
                <Link
                  href="https://www.facebook.com/share/1A8vrB7Vdw/?mibextid=wwXIfr"
                  className="text-white hover:text-brand-cream"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="h-6 w-6" />
                  <span className="sr-only">Facebook</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scrolling Banner Section */}
      <section className="w-full py-8 overflow-hidden bg-white">
        {/* First row - Left to Right */}
        <div className="relative whitespace-nowrap overflow-hidden py-2">
          <div className="inline-block animate-scrollLeft">
            <span className="text-7xl md:text-8xl font-semibold uppercase tracking-wide bg-gradient-to-r from-brand-gray via-brand-sage to-brand-mint bg-clip-text text-transparent px-2">
              HAZTE MIEMBRO
            </span>
            <span className="text-7xl md:text-8xl font-semibold uppercase tracking-wide bg-gradient-to-r from-brand-gray via-brand-sage to-brand-mint bg-clip-text text-transparent px-2">
              HAZTE MIEMBRO
            </span>
            <span className="text-7xl md:text-8xl font-semibold uppercase tracking-wide bg-gradient-to-r from-brand-gray via-brand-sage to-brand-mint bg-clip-text text-transparent px-2">
              HAZTE MIEMBRO
            </span>
          </div>
          <div className="inline-block animate-scrollLeft" aria-hidden="true">
            <span className="text-7xl md:text-8xl font-semibold uppercase tracking-wide bg-gradient-to-r from-brand-gray via-brand-sage to-brand-mint bg-clip-text text-transparent px-2">
              HAZTE MIEMBRO
            </span>
            <span className="text-7xl md:text-8xl font-semibold uppercase tracking-wide bg-gradient-to-r from-brand-gray via-brand-sage to-brand-mint bg-clip-text text-transparent px-2">
              HAZTE MIEMBRO
            </span>
            <span className="text-7xl md:text-8xl font-semibold uppercase tracking-wide bg-gradient-to-r from-brand-gray via-brand-sage to-brand-mint bg-clip-text text-transparent px-2">
              HAZTE MIEMBRO
            </span>
          </div>
        </div>

        {/* Second row - Right to Left */}
        <div className="relative whitespace-nowrap overflow-hidden py-2 mt-[-12px]">
          <div className="inline-block animate-scrollRight">
            <span className="text-7xl md:text-8xl font-semibold uppercase tracking-wide bg-gradient-to-r from-brand-sage via-brand-mint to-brand-cream bg-clip-text text-transparent px-2">
              ÚNETE A NUESTRA COMUNIDAD
            </span>
            <span className="text-7xl md:text-8xl font-semibold uppercase tracking-wide bg-gradient-to-r from-brand-sage via-brand-mint to-brand-cream bg-clip-text text-transparent px-2">
              ÚNETE A NUESTRA COMUNIDAD
            </span>
            <span className="text-7xl md:text-8xl font-semibold uppercase tracking-wide bg-gradient-to-r from-brand-sage via-brand-mint to-brand-cream bg-clip-text text-transparent px-2">
              ÚNETE A NUESTRA COMUNIDAD
            </span>
          </div>
          <div className="inline-block animate-scrollRight" aria-hidden="true">
            <span className="text-7xl md:text-8xl font-semibold uppercase tracking-wide bg-gradient-to-r from-brand-sage via-brand-mint to-brand-cream bg-clip-text text-transparent px-2">
              ÚNETE A NUESTRA COMUNIDAD
            </span>
            <span className="text-7xl md:text-8xl font-semibold uppercase tracking-wide bg-gradient-to-r from-brand-sage via-brand-mint to-brand-cream bg-clip-text text-transparent px-2">
              ÚNETE A NUESTRA COMUNIDAD
            </span>
            <span className="text-7xl md:text-8xl font-semibold uppercase tracking-wide bg-gradient-to-r from-brand-sage via-brand-mint to-brand-cream bg-clip-text text-transparent px-2">
              ÚNETE A NUESTRA COMUNIDAD
            </span>
          </div>
        </div>
      </section>

      <section className="section-padding">
  <div className="container-custom">
    {/* Header */}
    <div className="text-center mb-10 mt-10 px-4">
      <p className="text-base sm:text-lg md:text-xl text-black border-brand-sage/20 mb-4">
        Conoce las Reglas y Beneficios de
      </p>
      <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-wide bg-gradient-to-r from-brand-sage via-brand-cream to-brand-gray bg-clip-text text-transparent uppercase">
        Semana Ilimitada
      </h3>
      <p className="text-base sm:text-lg md:text-xl text-black max-w-3xl mx-auto">
        Conoce todas las ventajas y términos de nuestro paquete más popular
      </p>
    </div>

    {/* Grid de Reglas */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto px-4">
      {/* Card 1 - Duración */}
      <Card className="relative overflow-hidden rounded-3xl shadow-md transition-all duration-300 group border-0 bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-cream/90 via-white/60 to-brand-mint/70 backdrop-blur-xl" />
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
        <CardContent className="relative p-6 sm:p-8">
          <div className="flex items-center mb-4">
            <Calendar className="h-7 w-7 sm:h-8 sm:w-8 text-studio-orange mr-3" />
            <h4 className="text-lg sm:text-xl font-semibold text-brand-gray drop-shadow-sm">
              Duración & Vigencia
            </h4>
          </div>
          <ul className="space-y-3 text-sm sm:text-base text-brand-gray">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-sage mr-2 mt-0.5 flex-shrink-0" />
              <span>Válido por <strong>5 días</strong> (Lunes a Viernes)</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-sage mr-2 mt-0.5 flex-shrink-0" />
              <span>Inicia <strong>todos los lunes</strong>, sin excepción</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-sage mr-2 mt-0.5 flex-shrink-0" />
              <span>Finaliza <strong>todos los viernes</strong>, sin excepción</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-sage mr-2 mt-0.5 flex-shrink-0" />
              <span>Puedes reservarlo para cualquier semana futura <strong>dentro de las próximas 3 semanas</strong></span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Card 2 - Límites */}
      <Card className="relative overflow-hidden rounded-3xl shadow-md transition-all duration-300 group border-0 bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-cream/90 via-white/60 to-brand-mint/70 backdrop-blur-xl" />
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
        <CardContent className="relative p-6 sm:p-8">
          <div className="flex items-center mb-4">
            <Users className="h-7 w-7 sm:h-8 sm:w-8 text-studio-orange mr-3" />
            <h4 className="text-lg sm:text-xl font-semibold text-brand-gray drop-shadow-sm">
              Límites
            </h4>
          </div>
          <ul className="space-y-3 text-sm sm:text-base text-brand-gray">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-sage mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>25 clases</strong> por semana</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-sage mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>5 clases</strong> máximo por día</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Card 3 - Reservas */}
      <Card className="relative overflow-hidden rounded-3xl shadow-md transition-all duration-300 group border-0 bg-white md:col-span-2 lg:col-span-1">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-cream/90 via-white/60 to-brand-mint/70 backdrop-blur-xl" />
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
        <CardContent className="relative p-6 sm:p-8">
          <div className="flex items-center mb-4">
            <Clock className="h-7 w-7 sm:h-8 sm:w-8 text-studio-orange mr-3" />
            <h4 className="text-lg sm:text-xl font-semibold text-brand-gray drop-shadow-sm">
              Reservas & Penalizaciones
            </h4>
          </div>
          <ul className="space-y-3 text-sm sm:text-base text-brand-gray">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-brand-sage mr-2 mt-0.5 flex-shrink-0" />
              <span>Debes cancelar con <strong>mínimo 12h de anticipación</strong></span>
            </li>
            <li className="flex items-start">
              <AlertCircle className="h-5 w-5 text-brand-sage mr-2 mt-0.5 flex-shrink-0" />
              <span>Si no cancelas, <strong>se cancela tu siguiente clase</strong></span>
            </li>
            <li className="flex items-start">
              <Shield className="h-5 w-5 text-brand-sage mr-2 mt-0.5 flex-shrink-0" />
              <span>Si cancelas a tiempo: <strong>sin penalización, pero sin reposición</strong></span>
            </li>
            <li className="flex items-start">
              <Shield className="h-5 w-5 text-brand-sage mr-2 mt-0.5 flex-shrink-0" />
              <span>Confirma por WhatsApp con <strong>mínimo 12h de anticipación</strong></span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>

    {/* CTA */}
    <div className="text-center mt-12 px-4">
      <Button
        asChild
        className="bg-brand-gray/80 hover:bg-brand-gray/90 text-white rounded-full px-8 py-4 text-lg inline-flex items-center gap-2 w-fit"
      >
        <Link href="/paquetes">
          Comprar Semana Ilimitada
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>
    </div>
  </div>
</section>



      {/* Team Section */}
 <section className="w-full py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left side - Image */}
            <div className="w-full md:w-1/2">
              <div className="relative w-full h-[700px] rounded-[16px] overflow-hidden">
                <Image
                  src="/coaches.png"
                  alt="Equipo de instructores de Innata Studio"
                  fill
                  className="object-cover object-center rounded-[10px]"
                />
                {/* Translucent gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#68988d]/10 via-brand-mint/10 to-[#83962d]/20 rounded-[10px]"></div>
              </div>
            </div>

            {/* Right side - Gradient container with text */}
            <div className="w-full md:w-1/2">
              <div className="h-full bg-gradient-to-br from-[#68988d] via-brand-sage to-[#e5a18b] rounded-[16px] p-8 md:p-12 flex flex-col justify-center">
                {" "}
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Meet the team</h2>
                <p className="text-xl text-white/90 mb-6">
Amamos pensar que todos somos atletas.
              </p>
                <p className="text-xl text-white/90 mb-8">
Encuentra en nosotros un alto estándar de autenticidad y energía.
Somos coaches que te motivan y guían a tu mejor versión posible.                  </p>
                <Link
                  href="/nosotros"
                  className="bg-white hover:bg-gray-100 text-zinc-800 rounded-full px-8 py-4 text-lg inline-flex items-center gap-2 w-fit"
                >
                  <span>Conoce a los instructores</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-brand-mint/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center anim-slide-in-up">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-zinc-800">Vuélvete miembro</h2>
            <p className="text-xl mb-8 text-zinc-700">
              Elige el plan que mejor se adapte a tu estilo de vida. Nuestra misión es hacer el ejercicio más cómodo y
              sostenible para ti
            </p>
            <Link
              href="/reservar"
              className="bg-brand-sage hover:bg-brand-gray text-white rounded-full px-8 py-4 text-lg inline-flex items-center gap-2"
            >
              <span>Comenzar</span>
              <span className="bg-brand-gray rounded-full p-2">
                <ArrowRight className="h-5 w-5 text-white" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
