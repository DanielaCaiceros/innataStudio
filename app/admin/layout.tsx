"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CalendarDays, CreditCard, BarChart3, Users, Settings, Menu, X } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-100 p-4 transition-transform duration-300 md:relative md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-6 md:gap-10">
            <Link href="/" className="flex items-center" aria-label="Inicio">
              <img src="/innataAdmin.svg" alt="Logo Innata" className="h-20 w-auto max-w-[150px]" />
            </Link>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-zinc-900"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        <nav className="space-y-2">
          <Link
            href="/admin/reservations"
            className="flex items-center gap-3 px-3 py-2 text-zinc-700 hover:text-[#4A102A] hover:bg-[#FCF259]/10 rounded-md"
          >
            <CalendarDays className="h-5 w-5" />
            <span>Reservaciones</span>
          </Link>
          <Link
            href="/admin/payments"
            className="flex items-center gap-3 px-3 py-2 text-zinc-700 hover:text-[#4A102A] hover:bg-[#FCF259]/10 rounded-md"
          >
            <CreditCard className="h-5 w-5" />
            <span>Pagos</span>
          </Link>
          <Link
            href="/admin/classes"
            className="flex items-center gap-3 px-3 py-2 text-zinc-700 hover:text-[#4A102A] hover:bg-[#FCF259]/10 rounded-md"
          >
            <BarChart3 className="h-5 w-5" />
            <span>Clases</span>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-3 px-3 py-2 text-zinc-700 hover:text-[#4A102A] hover:bg-[#FCF259]/10 rounded-md"
          >
            <Users className="h-5 w-5" />
            <span>Usuarios</span>
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-3 px-3 py-2 text-zinc-700 hover:text-[#4A102A] hover:bg-[#FCF259]/10 rounded-md"
          >
            <Settings className="h-5 w-5" />
            <span>Configuración</span>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-zinc-900"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
