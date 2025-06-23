// components/packages/UnlimitedWeekStatus.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, Users, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UnlimitedWeekStatusProps {
  refreshTrigger?: number;
}

interface WeeklyUsage {
  hasActivePackage: boolean;
  packageInfo?: {
    id: number;
    packageName: string;
    purchaseDate: string;
    expiryDate: string;
    weekStart: string;
    weekEnd: string;
  };
  usage?: {
    total: {
      used: number;
      remaining: number;
      limit: number;
    };
    daily: Record<string, any[]>;
  };
  reservations?: Array<{
    id: number;
    className: string;
    date: string;
    time: string;
    status: string;
  }>;
}

export default function UnlimitedWeekStatus({ refreshTrigger }: UnlimitedWeekStatusProps) {
  const [weeklyUsage, setWeeklyUsage] = useState<WeeklyUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyUsage();
  }, [refreshTrigger]);

  const fetchWeeklyUsage = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/unlimited-week/usage');
      const data = await response.json();
      
      if (response.ok) {
        setWeeklyUsage(data);
      }
    } catch (error) {
      console.error('Error fetching weekly usage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weeklyUsage?.hasActivePackage) {
    return null; // No mostrar nada si no hay paquete activo
  }

  const { packageInfo, usage } = weeklyUsage;
  const progressPercentage = usage ? (usage.total.used / usage.total.limit) * 100 : 0;

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-purple-800">
            <Calendar className="h-5 w-5" />
            Mi Semana Ilimitada
          </span>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            Activa
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Período del paquete */}
        {packageInfo && (
          <div className="text-sm text-purple-700 bg-white/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Período activo:</span>
            </div>
            <span>
              {format(new Date(packageInfo.weekStart), 'EEEE d MMM', { locale: es })} - {' '}
              {format(new Date(packageInfo.weekEnd), 'EEEE d MMM yyyy', { locale: es })}
            </span>
          </div>
        )}

        {/* Progreso de uso */}
        {usage && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-purple-700">
                <Users className="h-4 w-4" />
                Clases utilizadas
              </span>
              <span className="font-semibold text-purple-800">
                {usage.total.used}/{usage.total.limit}
              </span>
            </div>
            
            <Progress 
              value={progressPercentage} 
              className="h-2 bg-purple-100"
            />
            
            <div className="flex justify-between text-xs text-purple-600">
              <span>{usage.total.remaining} clases restantes</span>
              <span>{Math.round(progressPercentage)}% utilizado</span>
            </div>
          </div>
        )}

        {/* Advertencias */}
        {usage && usage.total.remaining <= 5 && usage.total.remaining > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>Te quedan pocas clases para esta semana</span>
            </div>
          </div>
        )}

        {usage && usage.total.remaining === 0 && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>Has alcanzado el límite semanal de clases</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}