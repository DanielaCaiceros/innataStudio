"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth" // Asegúrate
import { NextApiRequest, NextApiResponse } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { format, startOfWeek, endOfWeek, addDays } from "date-fns" // format, startOfWeek, endOfWeek, addDays are used for loadScheduledClasses and useEffect for selectedSchedule
import { es } from "date-fns/locale" // Used with format
// Icons PlusCircle, Search, Clock, Users, Edit, Trash2, CalendarIcon are moved to child tabs or no longer used directly by ClassesPage
import { useToast } from "@/components/ui/use-toast"
import { ClassType, Instructor, ScheduledClass, timeSlots, convertUtcToLocalDateForDisplay, formatTime } from "./typesAndConstants"; 
import ClassTypesTab from "./components/ClassTypesTab";
import WeeklyScheduleTab from "./components/WeeklyScheduleTab";
import CalendarViewTab from "./components/CalendarViewTab";
import SpecialClassesTab from "./components/SpecialClassesTab";
import { AdminBranchFilter } from "@/components/admin/AdminBranchFilter";
import { getBranchBikeCapacity } from "@/lib/config/branch-bike-layouts";

// UI components Card*, Calendar removed as their usage is now within child tabs
// Helper functions are now imported from typesAndConstants

export default function ClassesPage() {
  const { toast } = useToast()

  const getBranchName = (branchId: string) => {
    if (branchId === "1") return "SAHAGÚN"
    if (branchId === "2") return "APAN"
    return `ID ${branchId}`
  }

  const getBranchCapacity = (branchId: string) => {
    const parsed = Number.parseInt(branchId, 10)
    return getBranchBikeCapacity(Number.isInteger(parsed) ? parsed : null)
  }

  // Estado de sucursal
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")

  // Estados para tipos de clase
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  // searchTerm, isNewClassTypeOpen, newClassTypeForm are moved to ClassTypesTab
  // isEditClassTypeOpen, selectedClassType are moved to ClassTypesTab

  // Estados para horarios
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date()) // Keep for week navigation passed to WeeklyScheduleTab and potentially CalendarViewTab
  const [date, setDate] = useState<Date | undefined>(new Date()) 
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]) 
  const [instructors, setInstructors] = useState<Instructor[]>([]) 
  const [isLoading, setIsLoading] = useState(false) 

  // States lifted back from WeeklyScheduleTab
  const [isNewScheduleOpen, setIsNewScheduleOpen] = useState(false);
  const [newScheduleForm, setNewScheduleForm] = useState({
    classTypeId: "",
    instructorId: "",
    date: "",
    time: "",
    branchId: "",
  });
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledClass | null>(null);
  const [editScheduleForm, setEditScheduleForm] = useState({
    classTypeId: "",
    instructorId: "",
    date: "",
    time: "",
    branchId: "",
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadClassTypes()
    loadInstructors()
  }, [])

  // Cargar clases programadas cuando cambia la semana o la sucursal
  useEffect(() => {
    loadScheduledClasses()
  }, [selectedWeek, selectedBranchId])

  // Si el admin filtra por una sucursal específica, preseleccionar esa sucursal en formularios
  useEffect(() => {
    if (selectedBranchId !== "all") {
      setNewScheduleForm((prev) => ({ ...prev, branchId: selectedBranchId }))
      setEditScheduleForm((prev) => ({ ...prev, branchId: prev.branchId || selectedBranchId }))
    }
  }, [selectedBranchId])

  // useEffect for populating editScheduleForm (lifted back)
  useEffect(() => {
    if (selectedSchedule) {
      setEditScheduleForm({
        classTypeId: selectedSchedule.classType.id.toString(),
        instructorId: selectedSchedule.instructor.id.toString(),
        date: format(convertUtcToLocalDateForDisplay(selectedSchedule.date), "yyyy-MM-dd"),
        time: formatTime(selectedSchedule.time),
        branchId: selectedSchedule.branch_id?.toString() || "",
      });
    }
  }, [selectedSchedule]);

  // Funciones para tipos de clase
  const loadClassTypes = async () => {
    try {
      const response = await fetch("/api/admin/class-types")
      if (response.ok) {
        const data = await response.json()
        setClassTypes(data)
      }
    } catch (error) {
      console.error("Error loading class types:", error)
    }
  }

  const loadInstructors = async () => {
    try {
      const response = await fetch("/api/admin/instructors")
      if (response.ok) {
        const data = await response.json()
        setInstructors(data)
      }
    } catch (error) {
      console.error("Error loading instructors:", error)
    }
  }

  const loadScheduledClasses = async () => {
    // weekStart and weekEnd are now derived inside WeeklyScheduleTab based on selectedWeek,
    // or this function needs to calculate them if it's truly global.
    // For now, assuming loadScheduledClasses in page.tsx will fetch all or be adapted.
    // The provided WeeklyScheduleTab.tsx fetches based on its internal currentWeekStart/End.
    // This function in page.tsx should fetch based on the *selectedWeek* prop for consistency.
    const currentGlobalWeekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
    const currentGlobalWeekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
    try {
      const startDate = format(currentGlobalWeekStart, "yyyy-MM-dd")
      const endDate = format(currentGlobalWeekEnd, "yyyy-MM-dd")

      // Construir URL con filtro de sucursal
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      if (selectedBranchId !== "all") {
        params.append("branchId", selectedBranchId);
      }

      const response = await fetch(`/api/admin/scheduled-classes?${params.toString()}`)

      if (response.ok) {
        const data = await response.json()
        setScheduledClasses(data)
      }
    } catch (error) {
      console.error("Error loading scheduled classes:", error)
    }
  }

  // handleCreateClassType moved to ClassTypesTab

  // Handlers lifted back from WeeklyScheduleTab
  const createScheduledClass = async (payload: {
    classTypeId: string
    instructorId: string
    date: string
    time: string
    branchId: string
  }) => {
    const response = await fetch("/api/admin/scheduled-classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        branchId: parseInt(payload.branchId),
        maxCapacity: String(getBranchCapacity(payload.branchId)),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al programar la clase")
    }
  }

  const handleCreateSchedule = async (options?: { keepDialogOpen?: boolean }) => {
    if (!newScheduleForm.classTypeId || !newScheduleForm.instructorId || !newScheduleForm.date || !newScheduleForm.time || !newScheduleForm.branchId) {
      toast({ title: "Error", description: "Todos los campos son obligatorios (incluyendo sucursal)", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await createScheduledClass(newScheduleForm)

      const createdBranchName = getBranchName(newScheduleForm.branchId)
      toast({ title: "Éxito", description: `Clase programada exitosamente en ${createdBranchName}` })

      await loadScheduledClasses()

      if (options?.keepDialogOpen) {
        setNewScheduleForm((prev) => ({
          ...prev,
          time: "",
        }))
      } else {
        setIsNewScheduleOpen(false)
        setNewScheduleForm({ classTypeId: "", instructorId: "", date: "", time: "", branchId: selectedBranchId !== "all" ? selectedBranchId : "" })
      }
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Error de conexión", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSchedule = async () => {
    if (!selectedSchedule) return;
    if (!editScheduleForm.classTypeId || !editScheduleForm.instructorId || !editScheduleForm.date || !editScheduleForm.time || !editScheduleForm.branchId) {
      toast({ title: "Error", description: "Todos los campos son obligatorios (incluyendo sucursal)", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/scheduled-classes/${selectedSchedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editScheduleForm,
          branchId: parseInt(editScheduleForm.branchId),
          maxCapacity: String(getBranchCapacity(editScheduleForm.branchId))
        }),
      });
      if (response.ok) {
        const branchName = getBranchName(editScheduleForm.branchId)
        toast({ title: "Éxito", description: `Clase actualizada exitosamente en ${branchName}` });
        setIsEditScheduleOpen(false);
        setSelectedSchedule(null); // Clear selected schedule
        await loadScheduledClasses();
      } else {
        const errorData = await response.json();
        toast({ title: "Error", description: errorData.error || "Error al actualizar la clase", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta clase programada?")) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/scheduled-classes/${scheduleId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast({ title: "Éxito", description: "Clase eliminada exitosamente" });
        await loadScheduledClasses();
      } else {
        const errorData = await response.json();
        toast({ title: "Error", description: errorData.error || "Error al eliminar la clase", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // getClassesForDay and formatTime are now inside WeeklyScheduleTab
  // Filtrar tipos de clase - moved to ClassTypesTab

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A102A]">Gestión de Clases y Horarios</h1>
          <p className="text-gray-600">Administra los tipos de clases y sus horarios semanales</p>
        </div>
        <AdminBranchFilter 
          selectedBranchId={selectedBranchId}
          onBranchChange={setSelectedBranchId}
        />
      </div>

      <Tabs defaultValue="class-types" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8 bg-gray-100">
          <TabsTrigger
            value="class-types"
            className="text-lg data-[state=active]:bg-[#4A102A] data-[state=active]:text-white"
          >
            Tipos de Clases
          </TabsTrigger>
          <TabsTrigger
            value="weekly-schedule"
            className="text-lg data-[state=active]:bg-[#4A102A] data-[state=active]:text-white"
          >
            Programar Clases
          </TabsTrigger>
          <TabsTrigger
            value="calendar-view"
            className="text-lg data-[state=active]:bg-[#4A102A] data-[state=active]:text-white"
          >
            Gestión de Clases
          </TabsTrigger>
          <TabsTrigger
            value="special-classes"
            className="text-lg data-[state=active]:bg-[#4A102A] data-[state=active]:text-white"
          >
            Clases Especiales
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TIPOS DE CLASES */}
        <TabsContent value="class-types">
          <ClassTypesTab classTypes={classTypes} loadClassTypes={loadClassTypes} />
        </TabsContent>

        {/* TAB 2: PROGRAMAR CLASES */}
        <TabsContent value="weekly-schedule">
          <WeeklyScheduleTab
            selectedWeek={selectedWeek}
            selectedBranchId={selectedBranchId}
            setSelectedWeek={setSelectedWeek}
            scheduledClasses={scheduledClasses}
            loadScheduledClasses={loadScheduledClasses}
            instructors={instructors}
            classTypes={classTypes}
            onOpenNewScheduleDialog={() => {
              if (selectedBranchId !== "all") {
                setNewScheduleForm((prev) => ({ ...prev, branchId: selectedBranchId }))
              }
              setIsNewScheduleOpen(true)
            }}
            onOpenEditScheduleDialog={(schedule) => { setSelectedSchedule(schedule); setIsEditScheduleOpen(true); }}
            onDeleteSchedule={handleDeleteSchedule}
          />
        </TabsContent>

        {/* TAB 3: GESTIÓN DE CLASES */}
        <TabsContent value="calendar-view">
          <CalendarViewTab
            scheduledClasses={scheduledClasses}
            selectedBranchId={selectedBranchId}
            date={date}
            setDate={setDate}
            setSelectedWeek={setSelectedWeek}
            onOpenEditScheduleDialog={(schedule) => { setSelectedSchedule(schedule); setIsEditScheduleOpen(true); }}
            onDeleteSchedule={handleDeleteSchedule}
            classTypes={classTypes}
            instructors={instructors}
          />
        </TabsContent>

        {/* TAB 4: CLASES ESPECIALES */}
        <TabsContent value="special-classes">
          <SpecialClassesTab
            classTypes={classTypes}
            instructors={instructors}
            specialClasses={scheduledClasses.filter((c) => c.isSpecial === true)}
            selectedBranchId={selectedBranchId}
            onReload={loadScheduledClasses}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Schedule Dialog is now managed by ClassesPage, but triggered from tabs */}

      {/* Dialogs for New and Edit Schedule - Lifted to ClassesPage */}
      <Dialog open={isNewScheduleOpen} onOpenChange={setIsNewScheduleOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Programar Nueva Clase</DialogTitle>
            <DialogDescription className="text-gray-600">Complete los detalles para programar una nueva clase</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newClassType">Tipo de Clase</Label>
                <Select value={newScheduleForm.classTypeId} onValueChange={(value) => setNewScheduleForm((prev) => ({ ...prev, classTypeId: value }))}>
                  <SelectTrigger className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    {classTypes.map((type) => (<SelectItem key={type.id} value={type.id.toString()}>{type.name} ({type.duration} min)</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newInstructor">Instructor</Label>
                <Select value={newScheduleForm.instructorId} onValueChange={(value) => setNewScheduleForm((prev) => ({ ...prev, instructorId: value }))}>
                  <SelectTrigger className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar instructor" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    {instructors.map((instructor) => (<SelectItem key={instructor.id} value={instructor.id.toString()}>{instructor.user.firstName} {instructor.user.lastName}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newDate">Fecha</Label>
                <Input type="date" id="newDate" value={newScheduleForm.date} onChange={(e) => setNewScheduleForm((prev) => ({ ...prev, date: e.target.value }))} className="bg-white border-gray-200 text-zinc-900" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newTime">Hora</Label>
                <Select value={newScheduleForm.time} onValueChange={(value) => setNewScheduleForm((prev) => ({ ...prev, time: value }))}>
                  <SelectTrigger className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar hora" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    {timeSlots.map((time) => (<SelectItem key={time} value={time}>{time}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newBranch">Sucursal</Label>
                <Select value={newScheduleForm.branchId} onValueChange={(value) => setNewScheduleForm((prev) => ({ ...prev, branchId: value }))}>
                  <SelectTrigger className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    <SelectItem value="1">SAHAGÚN</SelectItem>
                    <SelectItem value="2">APAN</SelectItem>
                  </SelectContent>
                </Select>
                {selectedBranchId !== "all" && (
                  <p className="text-xs text-blue-700">Sucursal preseleccionada según el filtro activo.</p>
                )}
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> La capacidad máxima se establece automáticamente según la sucursal seleccionada ({newScheduleForm.branchId ? getBranchCapacity(newScheduleForm.branchId) : "-"} bicis).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewScheduleOpen(false)} className="border-gray-200 text-zinc-900 hover:bg-gray-100">Cancelar</Button>
            <Button variant="outline" className="border-gray-200 text-zinc-900 hover:bg-gray-100" onClick={() => handleCreateSchedule({ keepDialogOpen: true })} disabled={isLoading}>{isLoading ? "Guardando..." : "Guardar y crear otra"}</Button>
            <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white" onClick={() => handleCreateSchedule()} disabled={isLoading}>{isLoading ? "Programando..." : "Programar Clase"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditScheduleOpen} onOpenChange={(isOpen) => { setIsEditScheduleOpen(isOpen); if (!isOpen) setSelectedSchedule(null); }}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Editar Clase Programada</DialogTitle>
            <DialogDescription className="text-gray-600">Modifica los detalles de la clase programada</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFormClassType">Tipo de Clase</Label>
                <Select value={editScheduleForm.classTypeId} onValueChange={(value) => setEditScheduleForm((prev) => ({ ...prev, classTypeId: value }))}>
                  <SelectTrigger id="editFormClassType" className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    {classTypes.map((type) => (<SelectItem key={`edit-${type.id}`} value={type.id.toString()}>{type.name} ({type.duration} min)</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editFormInstructor">Instructor</Label>
                <Select value={editScheduleForm.instructorId} onValueChange={(value) => setEditScheduleForm((prev) => ({ ...prev, instructorId: value }))}>
                  <SelectTrigger id="editFormInstructor" className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar instructor" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    {instructors.map((instructor) => (<SelectItem key={`edit-${instructor.id}`} value={instructor.id.toString()}>{instructor.user.firstName} {instructor.user.lastName}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editFormDate">Fecha</Label>
                <Input type="date" id="editFormDate" value={editScheduleForm.date} onChange={(e) => setEditScheduleForm((prev) => ({ ...prev, date: e.target.value }))} className="bg-white border-gray-200 text-zinc-900"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editFormTime">Hora</Label>
                <Select value={editScheduleForm.time} onValueChange={(value) => setEditScheduleForm((prev) => ({ ...prev, time: value }))}>
                  <SelectTrigger id="editFormTime" className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar hora" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    {timeSlots.map((time) => (<SelectItem key={`edit-${time}`} value={time}>{time}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editFormBranch">Sucursal</Label>
                <Select value={editScheduleForm.branchId} onValueChange={(value) => setEditScheduleForm((prev) => ({ ...prev, branchId: value }))}>
                  <SelectTrigger id="editFormBranch" className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    <SelectItem value="1">SAHAGÚN</SelectItem>
                    <SelectItem value="2">APAN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> La capacidad máxima se mantiene según la sucursal seleccionada ({editScheduleForm.branchId ? getBranchCapacity(editScheduleForm.branchId) : "-"} bicis).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditScheduleOpen(false); setSelectedSchedule(null); }} className="border-gray-200 text-zinc-900 hover:bg-gray-100">Cancelar</Button>
            <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white" onClick={handleEditSchedule} disabled={isLoading}>{isLoading ? "Actualizando..." : "Actualizar Clase"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
