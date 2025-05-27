import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Instagram, Facebook } from "lucide-react"

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
            <div className="relative z-20 h-full flex flex-col justify-center p-8 md:p-16 max-w-2xl">
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

      {/* CTA Section */}
      <section className="py-20 bg-brand-mint/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
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
