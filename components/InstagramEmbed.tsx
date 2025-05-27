"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Instagram, ExternalLink } from "lucide-react"

interface InstagramEmbedProps {
  url: string
  className?: string
}

const InstagramEmbed = ({ url, className = "" }: InstagramEmbedProps) => {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://www.instagram.com/embed.js"]')

    if (!existingScript) {
      const script = document.createElement("script")
      script.src = "https://www.instagram.com/embed.js"
      script.async = true
      script.onload = () => setIsLoaded(true)
      document.body.appendChild(script)
    } else {
      setIsLoaded(true)
      // Re-process embeds if script already exists
      if (window.instgrm) {
        window.instgrm.Embeds.process()
      }
    }

    return () => {
      // Don't remove script as it might be used by other components
    }
  }, [])

  return (
    <div className={`relative group ${className}`}>
      {/* Loading placeholder */}
      {!isLoaded && (
        <Card className="w-full max-w-lg mx-auto h-96 flex items-center justify-center bg-gradient-to-br from-brand-yellow/10 to-brand-burgundy/10 border-none rounded-3xl">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-brand-burgundy/20 flex items-center justify-center">
              <Instagram className="w-8 h-8 text-brand-burgundy animate-pulse" />
            </div>
            <p className="text-brand-burgundy font-medium">Cargando contenido de Instagram...</p>
          </div>
        </Card>
      )}

      {/* Instagram embed container */}
      <div className="relative overflow-hidden rounded-3xl shadow-lg group-hover:shadow-xl transition-all duration-300">
        <blockquote
          className="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink={url}
          data-instgrm-version="14"
          style={{
            background: "linear-gradient(135deg, #fefefe 0%, #f8f9fa 100%)",
            border: "0",
            borderRadius: "24px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.05)",
            margin: "0",
            maxWidth: "540px",
            minWidth: "326px",
            padding: "0",
            width: "100%",
            transform: "translateZ(0)", // Hardware acceleration
          }}
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-burgundy/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl pointer-events-none" />

        {/* Visit Instagram link */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm text-brand-burgundy px-3 py-2 rounded-full text-sm font-medium hover:bg-white transition-colors duration-200 shadow-lg"
          >
            <ExternalLink className="w-4 h-4" />
            Ver en Instagram
          </a>
        </div>
      </div>
    </div>
  )
}

// Extend window interface for Instagram embed
declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void
      }
    }
  }
}

export default InstagramEmbed