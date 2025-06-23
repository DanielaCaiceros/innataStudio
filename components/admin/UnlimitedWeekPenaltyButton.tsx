// components/admin/UnlimitedWeekPenaltyButton.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UnlimitedWeekPenaltyButtonProps {
  reservation: {
    id: number;
    user: string;
    class: string;
    date: string;
    time: string;
    package: string;
    packageId?: number;
  };
  onPenaltyApplied?: () => void;
}

export default function UnlimitedWeekPenaltyButton({ 
  reservation, 
  onPenaltyApplied 
}: UnlimitedWeekPenaltyButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [penaltyResult, setPenaltyResult] = useState<any>(null);
  const { toast } = useToast();

  // Solo mostrar el botón para paquetes de semana ilimitada
  if (reservation.packageId !== 3) {
    return null;
  }

  const handleApplyPenalty = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/unlimited-week/penalty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId: reservation.id,
          reason: reason || 'No se presentó a la clase - Semana Ilimitada'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPenaltyResult(data);
        toast({
          title: "Penalización aplicada",
          description: data.message,
        });
        onPenaltyApplied?.();
      } else {
        throw new Error(data.error || 'Error al aplicar penalización');
      }
    } catch (error) {
      console.error('Error applying penalty:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al aplicar penalización",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    setReason('');
    setPenaltyResult(null);
    setIsDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
          <AlertTriangle className="h-4 w-4 mr-1" />
          Aplicar Penalización
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Penalización Semana Ilimitada
          </DialogTitle>
        </DialogHeader>

        {!penaltyResult ? (
          <div className="space-y-4">
            {/* Información de la reservación */}
            <div className="bg-red-50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-red-800">Reservación no atendida:</h4>
              <div className="text-sm text-red-700 space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{reservation.user}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{reservation.class} - {reservation.date} {reservation.time}</span>
                </div>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  {reservation.package}
                </Badge>
              </div>
            </div>

            {/* Explicación de la penalización */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Política de Semana Ilimitada:</strong> Si un usuario no se presenta 
                sin cancelar con 12 horas de anticipación, se cancelará automáticamente 
                su próxima clase reservada en el mismo paquete.
              </AlertDescription>
            </Alert>

            {/* Campo para razón opcional */}
            <div className="space-y-2">
              <Label htmlFor="reason">Razón (opcional):</Label>
              <Textarea
                id="reason"
                placeholder="Motivo de la inasistencia..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={resetDialog} disabled={isLoading}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleApplyPenalty}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoading ? 'Procesando...' : 'Aplicar Penalización'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Resultado de la penalización */
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Penalización aplicada exitosamente</h4>
              
              {/* Clase marcada como no asistida */}
              <div className="text-sm text-green-700 space-y-2">
                <div>
                  <strong>Clase marcada como inasistencia:</strong>
                  <div className="ml-2">
                    {penaltyResult.missedReservation.className} - {' '}
                    {format(new Date(penaltyResult.missedReservation.date), 'dd/MM/yyyy', { locale: es })} {' '}
                    {format(new Date(`1970-01-01T${penaltyResult.missedReservation.time}`), 'HH:mm')}
                  </div>
                </div>

                {/* Clase cancelada como penalización */}
                {penaltyResult.cancelledReservation ? (
                  <div>
                    <strong>Próxima clase cancelada:</strong>
                    <div className="ml-2 text-red-700">
                      {penaltyResult.cancelledReservation.className} - {' '}
                      {format(new Date(penaltyResult.cancelledReservation.date), 'dd/MM/yyyy', { locale: es })} {' '}
                      {format(new Date(`1970-01-01T${penaltyResult.cancelledReservation.time}`), 'HH:mm')}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-600">
                    <strong>Nota:</strong> No había clases futuras para cancelar
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={resetDialog} className="w-full">
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}