import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronRight, Instagram } from "lucide-react"
import InstagramEmbed from "@/components/InstagramEmbed"
import TeamCarousel from "@/components/team-carousel"

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-brand-cream text-white">
      {/* Hero Section */}
<section className="relative py-5 md:py-5 overflow-hidden bg-brand-cream">
  <div className="w-full flex items-center justify-center gap-3 md:gap-5 px-4">
    <span className="block text-left text-white font-black text-2xl md:text-5xl uppercase leading-tight tracking-tight">
      MEET<br />YOUR
    </span>

    <span className="block text-white font-black text-4xl md:text-8xl uppercase leading-none tracking-tight">
      COACHES
    </span>
  </div>
</section>

      <TeamCarousel />

      {/* Instagram Section */}
      <section className="py-24 bg-brand-cream">
        <div className="container px-4 md:px-6">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-center text-white">
            SÍGUENOS EN <span className="text-brand-mint">INSTAGRAM</span>
          </h2>

          <p className="text-lg text-white/70 text-center mb-16 max-w-2xl mx-auto">
            Mantente al día con nuestras clases, eventos especiales y la energía de nuestra comunidad.
          </p>

          <div className="flex justify-center">
            <InstagramEmbed
              url="https://www.instagram.com/p/DJ0RIe7t90T/?utm_source=ig_embed&amp;utm_campaign=loading"
              className="w-full max-w-lg"
            />
          </div>

          <div className="text-center mt-12">
            <Button
              asChild
              size="lg"
              className="bg-white hover:bg-white/90 text-brand-cream font-bold px-8 py-6 text-lg rounded-full shadow-lg transition-all duration-300"
            >
              <a
                href="https://www.instagram.com/studio.innata/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Instagram className="w-5 h-5" />
                Seguir @studio.innata
                <ChevronRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-brand-gray">
        <div className="container px-4 md:px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">ÚNETE A NUESTRA COMUNIDAD</h2>
          <p className="text-xl max-w-2xl mx-auto mb-10 text-white/80 leading-relaxed">
            Experimenta por ti mismo lo que hace especial a Innata Studio. Tu primera clase con un precio especial.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white hover:bg-white/90 text-brand-cream font-bold px-10 py-6 text-lg rounded-full shadow-xl transition-all duration-300 hover:scale-105"
          >
            <Link href="/reservar" className="flex items-center gap-2">
              RESERVA TU CLASE YA
              <ChevronRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
