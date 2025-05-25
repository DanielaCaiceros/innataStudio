// components/site-header.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, X, ChevronRight, User, LogOut } from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks/useAuth"

const mainNav = [
  { title: "Clases", href: "/clases" },
  { title: "Paquetes", href: "/paquetes" },
  { title: "Reservar", href: "/reservar" },
  { title: "Nosotros", href: "/nosotros" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()

  // No renderizar el header en las páginas de admin
  if (pathname?.startsWith("/admin")) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <div className="flex items-center gap-6 md:gap-10">
          <div className="flex items-center gap-6 md:gap-10">
            <Link href="/" className="flex items-center" aria-label="Inicio">
              <img src="/innataBlack.png" alt="Logo Innata" className="h-20 w-auto max-w-[150px]" />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex gap-6">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-brand-gray",
                  pathname === item.href ? "text-brand-gray" : "text-zinc-800",
                )}
              >
                {item.title}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.profileImage || undefined} alt={user?.firstName || ""} />
                      <AvatarFallback className="bg-brand-sage text-white">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-0.5 leading-none">
                      <p className="font-medium text-sm">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/mi-cuenta">
                      <User className="mr-2 h-4 w-4" />
                      Mi Cuenta
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/reservar">
                      <ChevronRight className="mr-2 h-4 w-4" />
                      Reservar Clase
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <ChevronRight className="mr-2 h-4 w-4" />
                        Panel Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-500 focus:text-red-500"
                    onClick={() => logout()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild className="bg-brand-sage hover:bg-brand-gray text-white rounded-full">
                <Link href="/login" className="text-sm font-medium text-white hover:text-white transition-colors">
                  Iniciar Sesión <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-zinc-800 md:hidden">
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-white text-zinc-800 pt-10">
              <nav className="flex flex-col gap-6">
                {mainNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-lg font-medium transition-colors hover:text-brand-gray",
                      pathname === item.href ? "text-brand-gray" : "text-zinc-800",
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.title}
                  </Link>
                ))}
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/mi-cuenta"
                      className="text-lg font-medium transition-colors hover:text-brand-gray"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Mi Cuenta
                    </Link>
                    <Button 
                      variant="ghost" 
                      className="justify-start p-0 text-red-500 hover:text-red-600 hover:bg-transparent"
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Cerrar Sesión
                    </Button>
                  </>
                ) : (
                  <Button asChild className="mt-4 bg-brand-sage hover:bg-brand-gray text-white rounded-full">
                    <Link href="/login" className="flex items-center gap-1" onClick={() => setIsMenuOpen(false)}>
                      Iniciar Sesión <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}