// components/CancelReservationModal.tsx

'use client';

import { useState } from 'react';
import { useReservationCancellation } from '@/lib/hooks/useReservationCancellation';

interface Reservation {
  id: number;
  scheduledClass: {
    classType: { name: string };
    date: string;
    time: string;
    instructor: { user: { firstName: string; lastName: string } };
  };
}

interface CancelReservationModalProps {
  reservation: Reservation;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CancelReservationModal({
  reservation,
  isOpen,
  onClose,
  onSuccess
}: CancelReservationModalProps) {
  const [reason, setReason] = useState('');
  const { cancelReservation, isLoading } = useReservationCancellation({
    onSuccess: () => {
      onClose();
      onSuccess?.();
    }
  });

  if (!isOpen) return null;

  // Calcular horas hasta la clase
  const classDateTime = new Date(`${reservation.scheduledClass.date}T${reservation.scheduledClass.time}`);
  const now = new Date();
  const hoursUntilClass = Math.floor((classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));
  const canRefund = hoursUntilClass >= 12;

  const handleCancel = async () => {
    try {
      await cancelReservation(reservation.id, reason);
    } catch (error) {
      // El error ya se maneja en el hook
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Cancelar Reserva
        </h2>
        
        {/* Información de la clase */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-gray-900">
            {reservation.scheduledClass.classType.name}
          </h3>
          <p className="text-sm text-gray-600">
            {new Date(reservation.scheduledClass.date).toLocaleDateString('es-MX')} - {reservation.scheduledClass.time}
          </p>
          <p className="text-sm text-gray-600">
            Instructor: {reservation.scheduledClass.instructor.user.firstName} {reservation.scheduledClass.instructor.user.lastName}
          </p>
        </div>

        {/* Política de cancelación */}
        <div className={`rounded-lg p-4 mb-4 ${canRefund ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-start space-x-2">
            <div className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 ${canRefund ? 'bg-green-500' : 'bg-red-500'}`}>
              <span className="block w-full h-full text-white text-xs flex items-center justify-center">
                {canRefund ? '✓' : '✕'}
              </span>
            </div>
            <div>
              <p className={`font-medium ${canRefund ? 'text-green-800' : 'text-red-800'}`}>
                {canRefund 
                  ? `Cancelación con reembolso (${hoursUntilClass}h antes)`
                  : `Cancelación sin reembolso (${hoursUntilClass}h antes)`
                }
              </p>
              <p className={`text-sm ${canRefund ? 'text-green-700' : 'text-red-700'}`}>
                {canRefund 
                  ? 'La clase será devuelta a tu saldo y podrás reagendar.'
                  : 'La clase se perderá definitivamente (menos de 12h antes).'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Motivo de cancelación (opcional) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motivo de cancelación (opcional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Enfermedad, emergencia familiar..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#727D73] focus:border-transparent"
            rows={3}
          />
        </div>

        {/* Botones */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Mantener Reserva
          </button>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
              canRefund 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isLoading ? 'Cancelando...' : 'Confirmar Cancelación'}
          </button>
        </div>
      </div>
    </div>
  );
}