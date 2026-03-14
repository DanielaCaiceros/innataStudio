"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useBranch } from "@/lib/hooks/useBranch"
import { Branch } from "@/lib/types/branch"
import { MapPin, Phone, Clock, ArrowRight, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, getSafeRedirectPath } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"

export default function SeleccionarSucursalPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { branches, changeBranch, selectedBranch, isLoading } = useBranch()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const warningShownRef = useRef(false)
  const redirectPath = getSafeRedirectPath(searchParams.get("redirect"), "/paquetes")

  useEffect(() => {
    if (isLoading || selectedBranch || warningShownRef.current) return

    warningShownRef.current = true
    toast({
      title: "Selecciona una sucursal",
      description: "Debes seleccionar sucursal para continuar.",
      variant: "destructive",
    })
  }, [isLoading, selectedBranch, toast])

  const handleSelectBranch = (branch: Branch) => {
    changeBranch(branch)
    router.push(redirectPath)
  }

  // Menú de navegación
  const mainNav = [
    { title: "Inicio", href: "/" },
    { title: "Clases", href: "/clases" },
    { title: "Paquetes", href: "/paquetes" },
    { title: "Nosotros", href: "/nosotros" },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/80 text-lg">Cargando sucursales...</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Header minimalista con hamburger */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center">
            <Image 
              src="/innataWhite.png" 
              alt="Innata Studio" 
              width={150} 
              height={50}
              className="h-20 w-auto"
              priority
            />
          </Link>
          
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white">
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-white text-zinc-800 pt-10">
              <nav className="flex flex-col gap-6">
                {mainNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-lg font-medium transition-colors hover:text-brand-gray"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.title}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Desktop: Split-screen sin animaciones de hover */}
      <div className="hidden lg:flex h-full">
        {branches.map((branch, index) => (
          <div
            key={branch.id}
            className="relative flex-1 cursor-pointer overflow-hidden"
            onClick={() => handleSelectBranch(branch)}
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <Image
                src={branch.imageUrl || "/innataAsset2.JPG"}
                alt={branch.name}
                fill
                className="object-cover"
                priority={index === 0}
              />
            </div>

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/70" />

            {/* Content */}
            <div className="relative h-full flex flex-col justify-center items-center text-white p-12">
              <div className="text-center space-y-6">
                <h1 className="text-8xl font-bold tracking-wider">
                  {branch.name}
                </h1>
                <p className="text-2xl font-light tracking-wide opacity-90">
                  {branch.address}
                </p>

                {/* Details siempre visibles */}
                <div className="space-y-4 text-lg mt-8">
                  <div className="flex items-center justify-center gap-3">
                    <Clock className="h-5 w-5" />
                    <span>{branch.schedule}</span>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <Phone className="h-5 w-5" />
                    <span>{branch.phone}</span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="mt-8 bg-white/15 text-white hover:bg-slate-500 font-semibold text-lg px-8 py-6 rounded-full"
                >
                  SELECCIONAR <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Selected indicator */}
            {selectedBranch?.id === branch.id && (
              <div className="absolute top-20 right-8">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 text-white font-medium border border-white/40">
                  Actual
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: Split vertical sin scroll */}
      <div className="lg:hidden flex flex-col pt-16 h-full">
        {branches.map((branch, index) => (
          <div
            key={branch.id}
            className="relative flex-1 cursor-pointer overflow-hidden"
            onClick={() => handleSelectBranch(branch)}
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <Image
                src={branch.imageUrl || "/innataAsset2.JPG"}
                alt={branch.name}
                fill
                className="object-cover"
                priority={index === 0}
              />
            </div>

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/70" />

            {/* Content */}
            <div className="relative h-full flex flex-col justify-center items-center text-white px-6 py-8">
              <div className="text-center space-y-4">
                <h1 className="text-5xl sm:text-6xl font-bold tracking-wider">
                  {branch.name}
                </h1>
                <div className="h-0.5 w-16 bg-white/80 mx-auto" />
                <p className="text-lg sm:text-xl font-light opacity-90">
                  {branch.address}
                </p>

                {/* Details compactos */}
                <div className="space-y-2 text-sm sm:text-base mt-6 opacity-90">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{branch.schedule}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{branch.phone}</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="mt-6 bg-white text-black hover:bg-white/90 font-bold px-6 py-4 rounded-full"
                >
                  SELECCIONAR <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Selected indicator */}
            {selectedBranch?.id === branch.id && (
              <div className="absolute top-4 right-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium border border-white/40">
                  Actual
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
