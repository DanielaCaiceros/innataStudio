// components/booking/UnlimitedWeekClassSelector.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, Info } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  getUserUnlimitedWeekInfo, 
  filterClassesForUnlimitedWeek,
  canBookClassWithUnlimitedWeek 
} from '@/lib/utils/unlimited-week-booking';

interface UnlimitedWeekClassSelectorProps {
  scheduledClasses: any[];
  userPackages: any[];
  onClassSelect: (classId: number, packageId: number) => void;
}

export default function UnlimitedWeekClassSelector({
  scheduledClasses,
  userPackages,
  onClassSelect
}: UnlimitedWeekClassSelectorProps) {
  const [unlimitedWeekPackage, setUnlimitedWeekPackage] = useState<any>(null);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [weekInfo, setWeekInfo] = useState<any>(null);

  useEffect(() => {
    // Buscar paquete de semana ilimitada activo
    const activePackage = userPackages.find(pkg => 
      pkg.packageId === 3 && 
      pkg.isActive && 
      pkg.paymentStatus === 'paid'
    );

    setUnlimitedWeekPackage(activePackage);

    if (activePackage) {
      // Obtener información de la semana
      const info = getUserUnlimitedWeekInfo(activePackage);
      setWeekInfo(info);

      // Filtrar clases disponibles para esta semana específica
      const filtered = filterClassesForUnlimitedWeek(scheduledClasses, activePackage);
      setAvailableClasses(filtered);
    } else {
      setAvailableClasses([]);
      setWeekInfo(null);
    }
  }, [userPackages, scheduledClasses]);

  if (!unlimitedWeekPackage) {
    return null; // No mostrar si no hay paquete activo
  }

  const handleClassClick = (scheduledClass: any) => {
    const validation = canBookClassWithUnlimitedWeek(
      unlimitedWeekPackage, 
      new Date(scheduledClass.date)
    );

    if (validation.canBook) {
      onClassSelect(scheduledClass.id, unlimitedWeekPackage.id);
    } else {
      alert(validation.message);
    }
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-800">
          <Calendar className="h-5 w-5" />
          Tu Semana Ilimitada
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Información de la semana */}
        {weekInfo && (
          <div className="bg-white/70 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-purple-800">Semana contratada:</span>
            </div>
            <p className="text-sm text-purple-700">{weekInfo.label}</p>
            <div className="flex justify-between mt-2 text-xs text-purple-600">
              <span>{weekInfo.classesUsed}/25 clases usadas</span>
              <span>{weekInfo.classesRemaining} restantes</span>
            </div>
          </div>
        )}

        {/* Alerta informativa */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Importante:</strong> Solo puedes reservar clases de lunes a viernes 
            de la semana que compraste. Máximo 5 clases por día.
          </AlertDescription>
        </Alert>

        {/* Lista de clases disponibles */}
        {availableClasses.length > 0 ? (
          <div className="space-y-2">
            <h4 className="font-medium text-purple-800">Clases disponibles en tu semana:</h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {availableClasses.map((scheduledClass) => (
                <div
                  key={scheduledClass.id}
                  onClick={() => handleClassClick(scheduledClass)}
                  className="bg-white p-3 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors border border-purple-100"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h5 className="font-medium text-purple-800">
                        {scheduledClass.classType.name}
                      </h5>
                      <div className="flex items-center gap-4 text-sm text-purple-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(scheduledClass.date), 'EEEE d MMM', { locale: es })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(`1970-01-01T${scheduledClass.time}`), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-purple-700 border-purple-300">
                        {scheduledClass.availableSpots} espacios
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-purple-600">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay clases disponibles para tu semana contratada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}