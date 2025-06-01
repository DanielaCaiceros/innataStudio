import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Users, Edit, Trash2, CalendarIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ClassType, Instructor, ScheduledClass, timeSlots, weekDays, formatTime, formatDateForAPI, utcToLocalDate } from "@/app/admin/classes/typesAndConstants";

interface WeeklyScheduleTabProps {
  selectedWeek: Date;
  setSelectedWeek: (date: Date) => void;
  scheduledClasses: ScheduledClass[];
  loadScheduledClasses: () => void;
  instructors: Instructor[];
  classTypes: ClassType[];
}

export default function WeeklyScheduleTab({
  selectedWeek,
  setSelectedWeek,
  scheduledClasses,
  loadScheduledClasses,
  instructors,
  classTypes,
}: WeeklyScheduleTabProps) {
  const { toast } = useToast();

  const [isNewScheduleOpen, setIsNewScheduleOpen] = useState(false);
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledClass | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [newScheduleForm, setNewScheduleForm] = useState({
    classTypeId: "",
    instructorId: "",
    date: "",
    time: "",
    maxCapacity: "10",
  });

  const [editScheduleForm, setEditScheduleForm] = useState({
    classTypeId: "",
    instructorId: "",
    date: "",
    time: "",
    maxCapacity: "10",
  });

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });

  useEffect(() => {
    loadScheduledClasses();
  }, [selectedWeek, loadScheduledClasses]);

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

  const handleCreateSchedule = async () => {
    if (
      !newScheduleForm.classTypeId ||
      !newScheduleForm.instructorId ||
      !newScheduleForm.date ||
      !newScheduleForm.time
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
      // Use the helper function to format the date properly
      const formattedData = {
        ...newScheduleForm,
        date: formatDateForAPI(newScheduleForm.date)
      };
  
      const response = await fetch("/api/admin/scheduled-classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });
  
      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Clase programada exitosamente",
        });
        setIsNewScheduleOpen(false);
        setNewScheduleForm({
          classTypeId: "",
          instructorId: "",
          date: "",
          time: "",
          maxCapacity: "10",
        });
  
        await loadScheduledClasses();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Error al programar la clase",
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

  const getClassesForDay = (dayOffset: number) => {
    const targetDate = addDays(weekStart, dayOffset);
    const targetDateString = format(targetDate, "yyyy-MM-dd");
  
    return scheduledClasses.filter((cls) => {
      // Usar la función de conversión para asegurar que no cambie la fecha por zona horaria
      const classDate = utcToLocalDate(cls.date);
      const classDateString = format(classDate, "yyyy-MM-dd");
      
      return classDateString === targetDateString;
    });
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#4A102A]">
            Semana del {format(weekStart, "d", { locale: es })} al{" "}
            {format(weekEnd, "d 'de' MMMM yyyy", { locale: es })}
          </h2>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}
            className="border-gray-200 text-zinc-900 hover:bg-gray-100"
          >
            ← Semana Anterior
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
            className="border-gray-200 text-zinc-900 hover:bg-gray-100"
          >
            Semana Siguiente →
          </Button>
          <Dialog open={isNewScheduleOpen} onOpenChange={setIsNewScheduleOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white">
                <CalendarIcon className="h-4 w-4 mr-2" /> Programar Clase
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 text-zinc-900">
              <DialogHeader>
                <DialogTitle className="text-[#4A102A]">Programar Nueva Clase</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Complete los detalles para programar una nueva clase
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="classType">Tipo de Clase</Label>
                    <Select
                      value={newScheduleForm.classTypeId}
                      onValueChange={(value) => setNewScheduleForm((prev) => ({ ...prev, classTypeId: value }))}
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
                    <Label htmlFor="instructor">Instructor</Label>
                    <Select
                      value={newScheduleForm.instructorId}
                      onValueChange={(value) => setNewScheduleForm((prev) => ({ ...prev, instructorId: value }))}
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
                    <Label htmlFor="date">Fecha</Label>
                    <Input
                      type="date"
                      value={newScheduleForm.date}
                      onChange={(e) => setNewScheduleForm((prev) => ({ ...prev, date: e.target.value }))}
                      className="bg-white border-gray-200 text-zinc-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Hora</Label>
                    <Select
                      value={newScheduleForm.time}
                      onValueChange={(value) => setNewScheduleForm((prev) => ({ ...prev, time: value }))}
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
                    <Label htmlFor="capacity">Capacidad Máxima</Label>
                    <Input
                      type="number"
                      value={newScheduleForm.maxCapacity}
                      onChange={(e) => setNewScheduleForm((prev) => ({ ...prev, maxCapacity: e.target.value }))}
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
                  onClick={() => setIsNewScheduleOpen(false)}
                  className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-[#4A102A] hover:bg-[#85193C] text-white"
                  onClick={handleCreateSchedule}
                  disabled={isLoading}
                >
                  {isLoading ? "Programando..." : "Programar Clase"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-white border-gray-200">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-8 gap-2 mb-4">
                <div className="bg-gray-100 p-4 font-bold text-center text-[#4A102A] rounded-lg">Hora</div>
                {weekDays.map((day, index) => (
                  <div key={day.key} className="bg-gray-100 p-4 font-bold text-center text-[#4A102A] rounded-lg">
                    <div>{day.label}</div>
                    <div className="text-sm font-normal text-gray-600">
                      {format(addDays(weekStart, index), "d/M")}
                    </div>
                  </div>
                ))}
              </div>

              {timeSlots.map((time) => (
                <div key={time} className="grid grid-cols-8 gap-2 mb-2">
                  <div className="bg-gray-50 p-4 flex items-center justify-center text-gray-700 rounded-lg">
                    {time}
                  </div>
                  {weekDays.map((day, dayIndex) => {
                    const dayClasses = getClassesForDay(dayIndex).filter((cls) => formatTime(cls.time) === time);

                    return (
                      <div
                        key={`${day.key}-${time}`}
                        className={`p-2 rounded-lg min-h-[80px] ${
                          dayClasses.length > 0 ? "bg-white border border-gray-200 shadow-sm" : "bg-gray-50"
                        }`}
                      >
                        {dayClasses.map((cls) => (
                          <div key={cls.id} className="relative group">
                            <div className="text-center">
                              <p className="font-bold text-sm text-[#4A102A]">{cls.classType.name}</p>
                              <p className="text-xs text-gray-600">
                                {cls.instructor.user.firstName} {cls.instructor.user.lastName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(cls.date), "EEEE, d 'de' MMMM", { locale: es })} - {formatTime(cls.time)}
                              </p>
                              <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mt-1">
                                <Users className="h-3 w-3" />
                                <span>
                                  {cls.maxCapacity - cls.availableSpots}/{cls.maxCapacity}
                                </span>
                                <Clock className="h-3 w-3 ml-1" />
                                <span>{cls.classType.duration}min</span>
                              </div>
                              {cls.waitlist.length > 0 && (
                                <p className="text-xs text-orange-600 mt-1">
                                  Lista de espera: {cls.waitlist.length}
                                </p>
                              )}
                            </div>
                            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-gray-400 hover:text-[#4A102A]"
                                  onClick={() => {
                                    setSelectedSchedule(cls);
                                    setIsEditScheduleOpen(true);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-gray-400 hover:text-[#C5172E]"
                                  onClick={() => handleDeleteSchedule(cls.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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
    </>
  );
} 