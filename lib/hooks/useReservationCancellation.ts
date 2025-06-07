// hooks/useReservationCancellation.ts

import { useState } from 'react';

interface CancellationResult {
  success: boolean;
  refundStatus: 'refunded' | 'no_refund';
  hoursBeforeClass: number;
  message: string;
}

interface UseCancellationOptions {
  onSuccess?: (result: CancellationResult) => void;
  onError?: (error: string) => void;
}

export function useReservationCancellation(options?: UseCancellationOptions) {
  const [isLoading, setIsLoading] = useState(false);

  const cancelReservation = async (reservationId: number, reason?: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cancelar la reserva');
      }

      // Mostrar mensaje de éxito
      const result = data.data as CancellationResult;
      
      if (result.refundStatus === 'refunded') {
        alert('✅ Reserva cancelada exitosamente. La clase fue devuelta a tu saldo.');
      } else {
        alert('❌ Reserva cancelada. La clase se perdió por cancelación tardía.');
      }

      // Llamar callback de éxito si existe
      options?.onSuccess?.(result);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error canceling reservation:', error);
      
      alert(`Error: ${errorMessage}`);
      options?.onError?.(errorMessage);
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    cancelReservation,
    isLoading
  };
}