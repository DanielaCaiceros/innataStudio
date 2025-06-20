// components/admin/UnlimitedWeekPackageManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Calendar, Users, Clock, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UnlimitedWeekPackage {
  id: number;
  user: {
    name: string;
    email: string;
  };
  purchaseDate: string;
  expiryDate: string;
  paymentStatus: string;
  paymentMethod: string;
  isActive: boolean;
  classesUsed: number;
  classesRemaining: number;
  totalReservations: number;
}

export default function UnlimitedWeekPackageManager() {
  const [packages, setPackages] = useState<UnlimitedWeekPackage[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<UnlimitedWeekPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('active');
  const { toast } = useToast();

  useEffect(() => {
    fetchUnlimitedWeekPackages();
  }, []);

  useEffect(() => {
    filterPackages();
  }, [packages, searchTerm, selectedTab]);

  const fetchUnlimitedWeekPackages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/packages/unlimited-week');
      const data = await response.json();
      
      if (response.ok) {
        setPackages(data.packages || []);
      } else {
        throw new Error(data.error || 'Error al cargar paquetes');
      }
    } catch (error) {
      console.error('Error fetching unlimited week packages:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los paquetes de semana ilimitada",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterPackages = () => {
    let filtered = packages;

    // Filtrar por tab
    switch (selectedTab) {
      case 'active':
        filtered = filtered.filter(pkg => pkg.isActive && pkg.paymentStatus === 'paid');
        break;
      case 'pending':
        filtered = filtered.filter(pkg => pkg.paymentStatus === 'pending');
        break;
      case 'expired':
        filtered = filtered.filter(pkg => !pkg.isActive || new Date(pkg.expiryDate) < new Date());
        break;
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(pkg => 
        pkg.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPackages(filtered);
  };

  const handleActivatePackage = async (packageId: number) => {
    try {
      const response = await fetch('/api/admin/packages/unlimited-week/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPackageId: packageId,
          paymentConfirmed: true
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Paquete activado",
          description: "El paquete de semana ilimitada ha sido activado exitosamente",
        });
        fetchUnlimitedWeekPackages(); // Recargar lista
      } else {
        throw new Error(data.error || 'Error al activar paquete');
      }
    } catch (error) {
      console.error('Error activating package:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al activar paquete",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (pkg: UnlimitedWeekPackage) => {
    if (pkg.paymentStatus === 'pending') {
      return <Badge variant="destructive">Pendiente Pago</Badge>;
    }
    if (!pkg.isActive || new Date(pkg.expiryDate) < new Date()) {
      return <Badge variant="secondary">Expirado</Badge>;
    }
    return <Badge variant="default" className="bg-green-600">Activo</Badge>;
  };

  const getUsagePercentage = (used: number, total: number = 25) => {
    return Math.round((used / total) * 100);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          Gestión Semana Ilimitada
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Buscador */}
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="expired">Expirados</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPackages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{pkg.user.name}</div>
                        <div className="text-sm text-gray-500">{pkg.user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(pkg.purchaseDate), 'dd MMM', { locale: es })}</div>
                        <div className="text-gray-500">
                          hasta {format(new Date(pkg.expiryDate), 'dd MMM yy', { locale: es })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-sm">
                          {pkg.classesUsed}/25
                        </div>
                        <div className="w-16 h-2 bg-gray-200 rounded">
                          <div 
                            className="h-2 bg-purple-600 rounded"
                            style={{ width: `${getUsagePercentage(pkg.classesUsed)}%` }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(pkg)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={pkg.paymentMethod === 'cash' ? 'outline' : 'secondary'}>
                        {pkg.paymentMethod === 'cash' ? 'Efectivo' : 'Online'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {pkg.paymentStatus === 'pending' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleActivatePackage(pkg.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Activar
                          </Button>
                        )}
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Users className="h-4 w-4 mr-1" />
                              Ver Detalles
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Detalles - {pkg.user.name}</DialogTitle>
                            </DialogHeader>
                            <PackageDetails packageId={pkg.id} />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredPackages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay paquetes para mostrar
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Componente para mostrar detalles del paquete
interface PackageDetailsProps {
  packageId: number;
}

function PackageDetails({ packageId }: PackageDetailsProps) {
  const [details, setDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPackageDetails();
  }, [packageId]);

  const fetchPackageDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/packages/unlimited-week/${packageId}`);
      const data = await response.json();
      
      if (response.ok) {
        setDetails(data);
      }
    } catch (error) {
      console.error('Error fetching package details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-4">Cargando detalles...</div>;
  }

  if (!details) {
    return <div className="p-4">No se pudieron cargar los detalles</div>;
  }

  return (
    <div className="space-y-6">
      {/* Información general */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="font-semibold text-purple-800">Información del Paquete</h4>
          <div className="text-sm space-y-1">
            <div><strong>Período:</strong> {format(new Date(details.purchaseDate), 'dd MMM yyyy', { locale: es })} - {format(new Date(details.expiryDate), 'dd MMM yyyy', { locale: es })}</div>
            <div><strong>Estado:</strong> {details.isActive ? 'Activo' : 'Inactivo'}</div>
            <div><strong>Pago:</strong> {details.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'} ({details.paymentMethod === 'cash' ? 'Efectivo' : 'Online'})</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold text-purple-800">Estadísticas de Uso</h4>
          <div className="text-sm space-y-1">
            <div><strong>Clases usadas:</strong> {details.classesUsed}/25</div>
            <div><strong>Clases restantes:</strong> {details.classesRemaining}</div>
            <div><strong>Total reservaciones:</strong> {details.reservations?.length || 0}</div>
          </div>
        </div>
      </div>

      {/* Lista de reservaciones */}
      {details.reservations && details.reservations.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-purple-800">Reservaciones</h4>
          <div className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clase</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.reservations.map((reservation: any) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="text-sm">{reservation.className}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(reservation.date), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(`1970-01-01T${reservation.time}`), 'HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          reservation.status === 'confirmed' ? 'default' :
                          reservation.status === 'cancelled' ? 'secondary' :
                          reservation.status === 'no_show' ? 'destructive' : 'outline'
                        }
                        className="text-xs"
                      >
                        {reservation.status === 'confirmed' ? 'Confirmada' :
                         reservation.status === 'cancelled' ? 'Cancelada' :
                         reservation.status === 'no_show' ? 'No asistió' : reservation.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Uso diario */}
      {details.dailyUsage && Object.keys(details.dailyUsage).length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-purple-800">Uso por Día</h4>
          <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
            {Object.entries(details.dailyUsage).map(([date, classes]: [string, any]) => (
              <div key={date} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                <span>{format(new Date(date), 'EEEE dd/MM', { locale: es })}</span>
                <Badge variant="outline">
                  {classes.length} clase{classes.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook personalizado para gestión de semana ilimitada
export const useUnlimitedWeekManagement = () => {
  const [packages, setPackages] = useState<UnlimitedWeekPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchPackages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/packages/unlimited-week');
      const data = await response.json();
      
      if (response.ok) {
        setPackages(data.packages || []);
        return data.packages;
      } else {
        throw new Error(data.error || 'Error al cargar paquetes');
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los paquetes",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const activatePackage = async (packageId: number) => {
    try {
      const response = await fetch('/api/admin/packages/unlimited-week/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPackageId: packageId,
          paymentConfirmed: true
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Paquete activado",
          description: "El paquete ha sido activado exitosamente",
        });
        
        // Actualizar la lista local
        setPackages(prev => prev.map(pkg => 
          pkg.id === packageId 
            ? { ...pkg, paymentStatus: 'paid', isActive: true }
            : pkg
        ));
        
        return data;
      } else {
        throw new Error(data.error || 'Error al activar paquete');
      }
    } catch (error) {
      console.error('Error activating package:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al activar paquete",
        variant: "destructive"
      });
      throw error;
    }
  };

  const applyPenalty = async (reservationId: number, reason?: string) => {
    try {
      const response = await fetch('/api/admin/unlimited-week/penalty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId,
          reason: reason || 'No se presentó a la clase - Semana Ilimitada'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Penalización aplicada",
          description: data.message,
        });
        return data;
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
      throw error;
    }
  };

  return {
    packages,
    isLoading,
    fetchPackages,
    activatePackage,
    applyPenalty,
    refreshPackages: fetchPackages
  };
};