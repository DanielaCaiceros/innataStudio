import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"; // Import Input
import { Label } from "@/components/ui/label"; // Import Label
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Users, Edit, Trash2, CalendarIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ScheduledClass, ClassType, Instructor, formatTime, timeSlots, utcToLocalDate } from "@/app/admin/classes/typesAndConstants";
import { Dispatch, SetStateAction } from "react";

interface CalendarViewTabProps {
  scheduledClasses: ScheduledClass[];
  loadScheduledClasses: () => void;
  selectedWeek: Date;
  setSelectedWeek: (date: Date) => void;
  instructors: Instructor[];
  classTypes: ClassType[];
  date: Date | undefined;
  setDate: Dispatch<SetStateAction<Date | undefined>>;
}

export default function CalendarViewTab({
  scheduledClasses,
  loadScheduledClasses,
  selectedWeek,
  setSelectedWeek,
  instructors,
  classTypes,
  date,
  setDate
}: CalendarViewTabProps) {
  const { toast } = useToast();

  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledClass | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [editScheduleForm, setEditScheduleForm] = useState({
    classTypeId: "",
    instructorId: "",
    date: "",
    time: "",
    maxCapacity: "10",
  });

  useEffect(() => {
    if (selectedSchedule) {
      setEditScheduleForm({
        classTypeId: selectedSchedule.classType.id.toString(),
        instructorId: selectedSchedule.instructor.id.toString(),
        date: format(new Date(selectedSchedule.date), "yyyy-MM-dd"),
        time: formatTime(selectedSchedule.time),
        maxCapacity: selectedSchedule.maxCapacity.toString(),
      });
    }
  }, [selectedSchedule]);

  const handleEditSchedule = async () => {
    if (!selectedSchedule) return;

    if (
      !editScheduleForm.classTypeId ||
      !editScheduleForm.instructorId ||
      !editScheduleForm.date ||
      !editScheduleForm.time
    ) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/scheduled-classes/${selectedSchedule.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(editScheduleForm),
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Clase actualizada exitosamente",
        });
        setIsEditScheduleOpen(false);
        await loadScheduledClasses();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Error al actualizar la clase",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta clase programada?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/scheduled-classes/${scheduleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Clase eliminada exitosamente",
        });
        loadScheduledClasses();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Error al eliminar la clase",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <CardTitle className="text-lg text-[#4A102A]">Vista de Calendario</CardTitle>
          <CardDescription>Gestiona tus clases en formato de calendario</CardDescription>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {date ? (
            <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Fecha seleccionada:</p>
              <p className="font-medium">{format(date, 'PPP', { locale: es })}</p>
            </div>
          ) : (
            <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Vista:</p>
              <p className="font-medium">Todas las clases</p>
            </div>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-gray-200 text-zinc-900 hover:bg-gray-100 flex justify-between items-center"
              >
                <span>Cambiar fecha</span>
                <CalendarIcon className="h-4 w-4 ml-2" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 p-0 overflow-hidden sm:max-w-[425px]">
              <DialogHeader className="px-6 pt-6">
                <DialogTitle className="text-[#4A102A]">Seleccionar Fecha</DialogTitle>
                <DialogDescription>
                  Elige una fecha para ver las clases programadas.
                </DialogDescription>
              </DialogHeader>
              <div className="p-6 pt-2 flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    if (newDate) {
                      setDate(newDate);
                      setSelectedWeek(newDate);
                    }
                  }}
                  locale={es}
                  className="bg-white text-zinc-900"
                  classNames={{
                    day_selected: "bg-brand-mint text-white",
                    day_today: "bg-gray-100 text-zinc-900",
                    day: "text-zinc-900 hover:bg-gray-100"
                  }}
                />
              </div>
              <DialogFooter className="px-6 pb-6">
                <Button
                  variant="outline"
                  className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                  onClick={() => {
                    const closeButton = document.querySelector('[data-state="open"][role="dialog"] [data-state="open"]');
                    if (closeButton instanceof HTMLElement) {
                      closeButton.click();
                    }
                  }}
                >
                  Aceptar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
              onClick={() => {
                const today = new Date();
                setDate(today);
                setSelectedWeek(today);
              }}
            >
              Hoy
            </Button>

            <Button
              variant="outline"
              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setDate(tomorrow);
                setSelectedWeek(tomorrow);
              }}
            >
              Mañana
            </Button>

            <Button
              variant="outline"
              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
              onClick={() => {
                setDate(undefined);
              }}
            >
              Ver todas
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {scheduledClasses.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay clases programadas para esta semana</p>
          ) : (
            scheduledClasses.map((cls) => {
                const classDate = utcToLocalDate(cls.date);
                const classDateString = format(classDate, "yyyy-MM-dd");
                const selectedDateString = date ? format(date, "yyyy-MM-dd") : "";

              if (!date || classDateString === selectedDateString) {
                return (
                  <div key={cls.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-[#4A102A]">{cls.classType.name}</h3>
                        <p className="text-gray-600">
                          {cls.instructor.user.firstName} {cls.instructor.user.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(cls.date), "EEEE, d 'de' MMMM", { locale: es })} - {formatTime(cls.time)}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {cls.maxCapacity - cls.availableSpots}/{cls.maxCapacity} inscritos
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {cls.classType.duration} minutos
                          </span>
                        </div>
                        {cls.waitlist.length > 0 && (
                          <p className="text-sm text-orange-600 mt-1">
                            Lista de espera: {cls.waitlist.length} personas
                          </p>
                        )}
                        {cls.reservations.length > 0 && (
                          <p className="text-sm text-green-600 mt-1">
                            {cls.reservations.length} reservas confirmadas - No se puede eliminar
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                          onClick={() => {
                            setSelectedSchedule(cls);
                            setIsEditScheduleOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                          onClick={() => handleDeleteSchedule(cls.id)}
                          disabled={cls.reservations.length > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }).filter(Boolean)
          )}
          {date && scheduledClasses.filter(cls => {
            const classDate = new Date(cls.date);
            const classDateString = !isNaN(classDate.getTime()) ? format(classDate, "yyyy-MM-dd") : "";
            const selectedDateString = format(date, "yyyy-MM-dd");
            return classDateString === selectedDateString;
          }).length === 0 && (
            <p className="text-center text-gray-500 py-8">No hay clases programadas para el día {format(date, "d 'de' MMMM", { locale: es })}</p>
          )}
        </div>
      </CardContent>

      <Dialog open={isEditScheduleOpen} onOpenChange={setIsEditScheduleOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Editar Clase Programada</DialogTitle>
            <DialogDescription className="text-gray-600">
              Modifica los detalles de la clase programada
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editClassType">Tipo de Clase</Label>
                <Select
                  value={editScheduleForm.classTypeId}
                  onValueChange={(value) => setEditScheduleForm((prev) => ({ ...prev, classTypeId: value }))}
                >
                  <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    {classTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name} ({type.duration} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editInstructor">Instructor</Label>
                <Select
                  value={editScheduleForm.instructorId}
                  onValueChange={(value) => setEditScheduleForm((prev) => ({ ...prev, instructorId: value }))}
                >
                  <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                    <SelectValue placeholder="Seleccionar instructor" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id.toString()}>
                        {instructor.user.firstName} {instructor.user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDate">Fecha</Label>
                <Input
                  type="date"
                  value={editScheduleForm.date}
                  onChange={(e) => setEditScheduleForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="bg-white border-gray-200 text-zinc-900"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editTime">Hora</Label>
                <Select
                  value={editScheduleForm.time}
                  onValueChange={(value) => setEditScheduleForm((prev) => ({ ...prev, time: value }))}
                >
                  <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                    <SelectValue placeholder="Seleccionar hora" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editCapacity">Capacidad Máxima</Label>
                <Input
                  type="number"
                  value={editScheduleForm.maxCapacity}
                  onChange={(e) => setEditScheduleForm((prev) => ({ ...prev, maxCapacity: e.target.value }))}
                  className="bg-white border-gray-200 text-zinc-900"
                  min="1"
                  max="20"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditScheduleOpen(false)}
              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#4A102A] hover:bg-[#85193C] text-white"
              onClick={handleEditSchedule}
              disabled={isLoading}
            >
              {isLoading ? "Actualizando..." : "Actualizar Clase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 