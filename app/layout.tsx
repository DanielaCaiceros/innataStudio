import type React from "react"
import { SiteHeader } from "@/components/site-header"
import { FooterWrapper } from "@/components/footer-wrapper"
import { Providers } from "@/app/providers"
import { Montserrat } from "next/font/google"
import "./globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
})

export const metadata = {
  title: "Innata Studio - El primer indoor cycling studio en Apan ",
  description:
    "Estudio de indoor cycling con clases de alta intensidad, instructores certificados y la mejor experiencia fitness.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="light">
      <body className={`${montserrat.variable} font-sans antialiased min-h-screen bg-white text-white`}>
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <FooterWrapper />
          </div>
        </Providers>
      </body>
    </html>
  )
}