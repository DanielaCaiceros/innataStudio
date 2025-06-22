// lib/services/system-config.service.ts

import { prisma } from '@/lib/prisma'
import { SystemConfiguration } from '@prisma/client'

// Cache en memoria para configuraciones frecuentemente consultadas
const configCache = new Map<string, { value: string; expiry: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export class SystemConfigService {
  
  /**
   * Obtiene una configuración del sistema con cache
   */
  static async getConfig(key: string): Promise<string | null> {
    // Verificar cache primero
    const cached = configCache.get(key)
    if (cached && Date.now() < cached.expiry) {
      return cached.value
    }

    try {
      const config = await prisma.systemConfiguration.findUnique({
        where: { key }
      })

      if (config) {
        // Actualizar cache
        configCache.set(key, {
          value: config.value,
          expiry: Date.now() + CACHE_DURATION
        })
        return config.value
      }

      return null
    } catch (error) {
      console.error(`Error obteniendo configuración ${key}:`, error)
      return null
    }
  }

  /**
   * Obtiene el tiempo de gracia en horas (por defecto 12)
   */
  static async getGraceTimeHours(): Promise<number> {
    const value = await this.getConfig('grace_time_hours')
    return value ? parseInt(value, 10) : 12
  }

  /**
   * Obtiene el límite semanal de clases (por defecto 25)
   */
  static async getWeeklyClassLimit(): Promise<number> {
    const value = await this.getConfig('weekly_class_limit')
    return value ? parseInt(value, 10) : 25
  }

  /**
   * Actualiza una configuración del sistema
   */
  static async setConfig(key: string, value: string, description?: string): Promise<boolean> {
    try {
      await prisma.systemConfiguration.upsert({
        where: { key },
        update: { 
          value, 
          description,
          updatedAt: new Date()
        },
        create: { 
          key, 
          value, 
          description 
        }
      })

      // Limpiar cache para esta clave
      configCache.delete(key)
      
      return true
    } catch (error) {
      console.error(`Error actualizando configuración ${key}:`, error)
      return false
    }
  }

  /**
   * Actualiza el tiempo de gracia
   */
  static async setGraceTimeHours(hours: number): Promise<boolean> {
    return this.setConfig(
      'grace_time_hours', 
      hours.toString(), 
      'Tiempo de gracia en horas para confirmación de reservas con Semana Ilimitada'
    )
  }

  /**
   * Actualiza el límite semanal de clases
   */
  static async setWeeklyClassLimit(limit: number): Promise<boolean> {
    return this.setConfig(
      'weekly_class_limit', 
      limit.toString(), 
      'Límite máximo de clases por semana para paquete Semana Ilimitada'
    )
  }

  /**
   * Obtiene todas las configuraciones
   */
  static async getAllConfigs(): Promise<Array<{ key: string; value: string; description?: string }>> {
    try {
      const configs = await prisma.systemConfiguration.findMany({
        select: {
          key: true,
          value: true,
          description: true
        },
        orderBy: {
          key: 'asc'
        }
      })

      return configs.map((config: Pick<SystemConfiguration, 'key' | 'value' | 'description'>) => ({
        key: config.key,
        value: config.value,
        description: config.description || undefined
      }))
    } catch (error) {
      console.error('Error obteniendo todas las configuraciones:', error)
      return []
    }
  }

  /**
   * Limpia toda la cache de configuraciones
   */
  static clearCache(): void {
    configCache.clear()
  }
}