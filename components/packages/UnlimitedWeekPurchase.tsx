// components/packages/UnlimitedWeekPurchase.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, Users, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface WeekOption {
  startDate: string;
  endDate: string;
  label: string;
  value: string;
}

interface UnlimitedWeekPurchaseProps {
  onPurchaseSuccess?: () => void;
}

export default function UnlimitedWeekPurchase({ onPurchaseSuccess }: UnlimitedWeekPurchaseProps) {
  const [weekOptions, setWeekOptions] = useState<WeekOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cash'>('stripe');
  const { toast } = useToast();

  // Cargar opciones de semana al montar el componente
  useEffect(() => {
    fetchWeekOptions();
  }, []);

  const fetchWeekOptions = async () => {
    try {
      const response = await fetch('/api/unlimited-week/options');
      const data = await response.json();
      
      if (response.ok) {
        setWeekOptions(data.weekOptions);
        // Seleccionar la primera semana disponible por defecto
        if (data.weekOptions.length > 0) {
          setSelectedWeek(data.weekOptions[0].value);
        }
      }
    } catch (error) {
      console.error('Error fetching week options:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las opciones de semana",
        variant: "destructive"
      });
    }
  };

  const handlePurchase = async () => {
    if (!selectedWeek) {
      toast({
        title: "Error",
        description: "Por favor selecciona una semana",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/packages/purchase/unlimited-week', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedWeek,
          paymentMethod
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (paymentMethod === 'stripe' && data.checkoutUrl) {
          // Redirigir a Stripe Checkout
          window.location.href = data.checkoutUrl;
        } else {
          // Pago en efectivo - mostrar mensaje de éxito
          toast({
            title: "¡Paquete creado!",
            description: "Tu paquete de semana ilimitada está pendiente de pago en efectivo",
          });
          setIsDialogOpen(false);
          onPurchaseSuccess?.();
        }
      } else {
        throw new Error(data.error || 'Error en la compra');
      }
    } catch (error) {
      console.error('Error purchasing unlimited week:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar la compra",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedWeekInfo = weekOptions.find(week => week.value === selectedWeek);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="text-2xl text-purple-800">Semana Ilimitada</CardTitle>
            <CardDescription className="text-lg font-semibold text-purple-600">
              $299 MXN
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span>5 días (Lun-Vie)</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                <span>Hasta 25 clases</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Máx 5 por día</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <span>Termina viernes</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Badge variant="secondary" className="w-full justify-center">
                Una sola persona
              </Badge>
              <Badge variant="outline" className="w-full justify-center text-xs">
                Reserva hasta 3 semanas adelante
              </Badge>
            </div>

            <Button className="w-full bg-purple-600 hover:bg-purple-700">
              Comprar Paquete
            </Button>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Semana Ilimitada - $299
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del paquete */}
          <div className="bg-purple-50 p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-purple-800">Detalles del paquete:</h4>
            <ul className="text-sm space-y-1 text-purple-700">
              <li>• Duración: 5 días (lunes a viernes)</li>
              <li>• Límite: hasta 25 clases en la semana seleccionada</li>
              <li>• Máximo 5 clases por día</li>
              <li>• Finaliza todos los viernes</li>
              <li>• Solo válido para la semana que elijas</li>
              <li>• Para una sola persona</li>
            </ul>
          </div>

          {/* Selector de semana */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Selecciona tu semana:</label>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Elige una semana" />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map((week) => (
                  <SelectItem key={week.value} value={week.value}>
                    {week.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedWeekInfo && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                Tu paquete será válido SOLO del {format(new Date(selectedWeekInfo.startDate), 'EEEE d', { locale: es })} al {format(new Date(selectedWeekInfo.endDate), 'EEEE d \'de\' MMMM', { locale: es })}. 
                Solo podrás reservar clases de lunes a viernes de esta semana específica.
              </div>
            )}
          </div>

          {/* Políticas de cancelación */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Política de cancelación:</strong> Cancelación con +12 horas: sin penalización. Cancelación con -12 horas o no asistencia: con penalización. 
              Si no cancelas a tiempo, se cancelará tu próxima clase automáticamente.
              Si cancelas a tiempo, no hay penalización pero tampoco reposición.
            </AlertDescription>
          </Alert>

          {/* Método de pago */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Método de pago:</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={paymentMethod === 'stripe' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('stripe')}
                className="text-xs"
              >
                Tarjeta/Stripe
              </Button>
              <Button
                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('cash')}
                className="text-xs"
              >
                Efectivo
              </Button>
            </div>
          </div>

          {/* Botón de compra */}
          <Button 
            onClick={handlePurchase}
            disabled={!selectedWeek || isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? 'Procesando...' : `Comprar por $299`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
