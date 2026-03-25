"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

const instructors = [
  { id: 1, name: "Inés",    role: "Coach de Indoor", image: "/coach3.jpeg" },
  { id: 2, name: "Dani",    role: "Coach de Indoor", image: "/dani_m.jpeg",    scale: 1.4 },
  { id: 3, name: "Alo",     role: "Coach de Indoor", image: "/alondra_m.jpeg", scale: 1.4 },
  { id: 4, name: "Kevin",   role: "Coach de Indoor", image: "/kevin.jpeg",     scale: 1.4 },
  { id: 5, name: "Óscar",   role: "Coach de Indoor", image: "/oscar_f.jpeg",   scale: 1.4 },
  { id: 6, name: "Ximena",  role: "Coach de Indoor", image: "/ximena_c.jpeg",  scale: 1.4 },
  { id: 7, name: "Danny",   role: "Coach de Indoor", image: "/danny_f.jpeg",   scale: 1.4 },
  { id: 8, name: "Tanis",   role: "Coach de Indoor", image: "/tanis_g.jpeg",   scale: 1.4 },
]

export default function TeamCarousel() {
  const [visible, setVisible] = useState(4)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const update = () => setVisible(window.innerWidth >= 768 ? 5 : 4)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const maxIndex = instructors.length - visible
  const prev = () => setIndex((i) => Math.max(i - 1, 0))
  const next = () => setIndex((i) => Math.min(i + 1, maxIndex))

  // clamp index when visible count changes
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, instructors.length - visible)))
  }, [visible])

  return (
    <section className="bg-white overflow-hidden">
      <div className="relative">
        {/* Sliding track */}
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${index * (100 / visible)}%)` }}
        >
          {instructors.map((instructor) => (
            <div
              key={instructor.id}
              className="flex-none group"
              style={{ width: `${100 / visible}%` }}
            >
              {/* Header band */}
              <div className="bg-brand-cream relative px-3 md:px-5 pt-5 md:pt-5 pb-8 md:pb-10">
                <p className="hidden md:block text-brand-sage text-[10px] font-semibold uppercase tracking-widest">
                  {instructor.role}
                </p>
                {/* Name sits on the dividing line */}
                <h3 className="absolute bottom-0 left-3 md:left-4 translate-y-1 z-10 text-white text-3xl md:text-4xl lg:text-5xl font-black uppercase leading-none tracking-tight">
                  {instructor.name}
                </h3>
              </div>

              {/* Photo */}
              <div className="relative overflow-hidden" style={{ height: "58vh" }}>
                <Image
                  src={instructor.image}
                  alt={instructor.name}
                  fill
                  style={{
                    transform: `scale(${instructor.scale ?? 1})`,
                    transformOrigin: "50% 90%",
                  }}
                  className="object-cover object-top grayscale group-hover:grayscale-0 transition-all duration-500"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        <button
          onClick={prev}
          disabled={index === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-brand-gray/80 hover:bg-brand-gray text-white w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full disabled:opacity-30 transition-all duration-200"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
        </button>
        <button
          onClick={next}
          disabled={index >= maxIndex}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-brand-gray/80 hover:bg-brand-gray text-white w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full disabled:opacity-30 transition-all duration-200"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 py-4 bg-white">
        {Array.from({ length: maxIndex + 1 }).map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              i === index ? "bg-brand-cream w-6" : "bg-brand-cream/40"
            }`}
            aria-label={`Ir al grupo ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
