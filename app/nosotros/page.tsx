import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Quote, ChevronRight, Instagram, MapPin, Clock, Users } from "lucide-react"
import InstagramEmbed from "@/components/InstagramEmbed"

// Datos de ejemplo para los instructores
const instructors = [
  {
    id: 1,
    name: "Ghana Inés Miroslava Chávez García",
    role: "Instructor Principal",
    bio: "He hecho deporte toda mi vida. Me encanta el crossfit, los triatlones y amo con locura el indoor. También soy fotógrafa y mamá.",
    image: "/placeholder.svg?height=400&width=400",
    socials: ["@inessmiroslava"],
  },
  {
    id: 2,
    name: "Óscar Fernández Vargas",
    role: "Instructor Senior",
    bio: "Entrenador profesional certificado por IFBB PRO LIGUE y certificado en MASTER COACH en seminario. Cuento con más de 2 años de experiencia en entrenamiento físico de hipertrofia para crecimiento muscular y reducción de masa corporal.",
    image: "/placeholder.svg?height=400&width=400",
    socials: ["@barbie_mamada_"],
  },
  {
    id: 3,
    name: "César Estanislao González Vargas",
    role: "Instructor de Resistencia",
    bio: "Apasionado de los deportes, el basquetbol mi deporte favorito, me gusta correr, ir al gimnasio y el indoor! Adoro estar con mi familia, soy papá de Julián",
    image: "/placeholder.svg?height=400&width=400",
    socials: ["@tanisgonzalezv"],
  },
]

// Datos de ejemplo para los testimonios
const testimonials = [
  {
    id: 1,
    name: "Sofía Ramírez",
    text: "Desde que empecé en Innata Studio hace 6 meses, he notado un cambio increíble en mi condición física y mental. Las clases son adictivas y los instructores realmente te motivan a dar lo mejor de ti.",
    rating: 5,
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: 2,
    name: "Javier Morales",
    text: "Como principiante estaba nervioso, pero el equipo me hizo sentir bienvenido desde el primer día. La energía del estudio es incomparable y ahora no puedo imaginar mi semana sin al menos 3 clases.",
    rating: 5,
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: 3,
    name: "Daniela Ortiz",
    text: "Las instalaciones son de primera clase y la variedad de clases mantiene el entrenamiento fresco e interesante. He probado otros estudios pero ninguno se compara con la experiencia aquí.",
    rating: 5,
    image: "/placeholder.svg?height=100&width=100",
  },
]

const stats = [
  {
    icon: Users,
    number: "500+",
    label: "Miembros Activos",
  },
  {
    icon: Clock,
    number: "1000+",
    label: "Clases Impartidas",
  },
  {
    icon: MapPin,
    number: "1",
    label: "Ubicación Premium",
  },
]

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-900">
      {/* Hero Section */}
      <section className="relative h-[40vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/nosotros.png"
            alt="Estudio de indoor cycling"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60"></div>
        </div>

        <div className="container relative z-10 px-4 md:px-6 space-y-1 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white">SOBRE NOSOTROS</h1>
         
          
        </div>
      </section>



      {/* Our Team Section */}
      <section className="py-24 bg-white">
        <div className="container px-4 md:px-6">
          <h2 className="text-4xl md:text-5xl font-bold mb-16 text-center">
            NUESTRO <span className="text-brand-sage">EQUIPO</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {instructors.map((instructor) => (
              <Card
                key={instructor.id}
                className="bg-white border-gray-100 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
              >
                <div className="relative h-80 overflow-hidden">
                  <Image
                    src={instructor.image || "/placeholder.svg"}
                    alt={instructor.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-brand-gray mb-2">{instructor.name}</h3>
                  <p className="text-brand-sage font-semibold mb-4">{instructor.role}</p>
                  <p className="text-zinc-600 text-sm mb-6 leading-relaxed">{instructor.bio}</p>
                  <div className="flex flex-wrap gap-2">
                    {instructor.socials.map((social, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="border-brand-sage text-brand-sage bg-brand-cream/20 hover:bg-brand-sage hover:text-white transition-colors duration-200 cursor-pointer"
                      >
                        <Instagram className="w-3 h-3 mr-1" />
                        {social}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>



      {/* Instagram Section */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container px-4 md:px-6">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-center">
            SÍGUENOS EN <span className="text-brand-sage">INSTAGRAM</span>
          </h2>

          <p className="text-xl text-zinc-600 text-center mb-16 max-w-2xl mx-auto">
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
              className="bg-gradient-to-r from-brand-sage to-brand-gray text-white font-bold px-8 py-6 text-lg rounded-full shadow-lg transition-all duration-300"
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
            {/* Mission & Values Section */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container px-4 md:px-6">
          <h2 className="text-4xl md:text-5xl font-bold mb-16 text-center">
            MISIÓN Y <span className="text-brand-sage">VALORES</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {[
              {
                number: "01",
                title: "COMUNIDAD",
                description:
                  "Creamos un espacio inclusivo donde todos son bienvenidos, sin importar su nivel de experiencia o condición física.",
              },
              {
                number: "02",
                title: "EXCELENCIA",
                description:
                  "Nos comprometemos a ofrecer la mejor experiencia posible, desde nuestras instalaciones hasta la calidad de nuestras clases.",
              },
              {
                number: "03",
                title: "INNOVACIÓN",
                description:
                  "Constantemente buscamos nuevas formas de mejorar y evolucionar, incorporando las últimas tendencias y tecnologías en fitness.",
              },
            ].map((value, index) => (
              <Card
                key={index}
                className="bg-white border-none rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <CardContent className="p-8 flex flex-col items-center text-center h-full">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-cream/40 to-brand-sage/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl font-bold text-brand-sage">{value.number}</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-brand-gray">{value.title}</h3>
                  <p className="text-zinc-600 leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="max-w-4xl mx-auto bg-gradient-to-r from-brand-sage to-brand-gray p-12 rounded-3xl shadow-xl text-center">
            <h3 className="text-3xl font-bold mb-6 text-white">NUESTRA MISIÓN</h3>
            <p className="text-xl text-white/90 leading-relaxed">
              Transformar vidas a través del movimiento, creando experiencias de fitness que inspiren, motiven y
              empoderen a nuestra comunidad para alcanzar su máximo potencial físico y mental.
            </p>
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-brand-sage via-brand-gray to-brand-sage">
        <div className="container px-4 md:px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">ÚNETE A NUESTRA COMUNIDAD</h2>
          <p className="text-xl max-w-2xl mx-auto mb-10 text-white/90 leading-relaxed">
            Experimenta por ti mismo lo que hace especial a Innata Studio. Tu primera clase con un precio especial.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white hover:bg-gray-100 text-brand-sage font-bold px-10 py-6 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
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