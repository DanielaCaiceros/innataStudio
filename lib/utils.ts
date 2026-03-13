import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Allow only same-origin relative paths to prevent open redirects.
export function getSafeRedirectPath(
  redirect: string | null | undefined,
  fallback: string,
) {
  if (!redirect) return fallback

  const trimmed = redirect.trim()
  if (!trimmed.startsWith("/")) return fallback
  if (trimmed.startsWith("//")) return fallback

  return trimmed
}

// Parse strict positive integers and treat malformed values as null.
export function parsePositiveInt(value: string | null | undefined) {
  if (!value) return null

  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null

  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return null

  return parsed
}
