'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, Calendar, CreditCard } from 'lucide-react';

interface Package {
  id: string;
  name: string;
  price: number;
  classCount: number;
  validityDays: number;
  description: string;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [packageData, setPackageData] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);

  const sessionId = searchParams.get('session_id');
  const packageId = searchParams.get('package_id');

  useEffect(() => {
    const fetchPackageData = async () => {
      try {
        if (packageId) {
          const response = await fetch(`/api/packages/${packageId}`);
          if (response.ok) {
            const data = await response.json();
            setPackageData(data);
          }
        }
      } catch (error) {
        console.error('Error fetching package data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPackageData();
  }, [packageId]);

  const handleGoToAccount = () => {
    router.push('/mi-cuenta');
  };

  const handleBookClass = () => {
    router.push('/reservar');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  if (!sessionId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-red-500 text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">
              Error en la confirmación
            </h1>
            <p className="text-gray-600 mb-6">
              No se pudo confirmar tu compra. Si realizaste un pago, por favor contacta con nosotros.
            </p>
            <Button onClick={handleGoHome}>
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-3xl text-green-600">
            ¡Compra Exitosa!
          </CardTitle>
          <CardDescription className="text-lg">
            Tu paquete de clases ha sido activado correctamente
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : packageData ? (
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Package className="h-5 w-5 text-blue-600" />
                <h3 className="text-xl font-semibold">{packageData.name}</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-600">Precio:</span>
                  <span className="font-semibold">${packageData.price}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-600">Clases:</span>
                  <span className="font-semibold">{packageData.classCount}</span>
                </div>
                
                <div className="flex items-center space-x-2 col-span-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-600">Válido por:</span>
                  <span className="font-semibold">{packageData.validityDays} días</span>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm">
                {packageData.description}
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                Paquete Activado
              </h3>
              <p className="text-blue-600">
                Tu paquete de clases ha sido añadido a tu cuenta y ya puedes empezar a reservar.
              </p>
            </div>
          )}
          
          <div className="border-t pt-6 space-y-4">
            <h4 className="text-lg font-semibold text-gray-800">
              ¿Qué sigue?
            </h4>
            
            <div className="grid gap-3">
              <Button 
                onClick={handleBookClass}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Reservar clase
              </Button>
              
              <Button 
                onClick={handleGoToAccount}
                variant="outline"
                className="w-full"
              >
                Ver mis paquetes en mi cuenta
              </Button>
            </div>
          </div>
          
          <div className="border-t pt-6">
            <p className="text-sm text-gray-500 mb-4">
              Recibirás un email de confirmación con los detalles de tu compra.
            </p>
            
            <Button 
              onClick={handleGoHome}
              variant="ghost"
              className="text-gray-600 hover:text-gray-800"
            >
              Volver al inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfirmacionPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
            <p>Cargando confirmación...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
