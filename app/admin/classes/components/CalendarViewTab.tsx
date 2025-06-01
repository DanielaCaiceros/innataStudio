"use client";

import * as React from "react";
import { useState, useEffect } from "react"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar"; 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"; 
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Edit, Trash2, Users, Clock } from "lucide-react";
import { ScheduledClass, ClassType, Instructor, convertUtcToLocalDateForDisplay, formatTime } from "../typesAndConstants"; 

// Helper functions are now imported

interface CalendarViewTabProps {
  scheduledClasses: ScheduledClass[];
  date: Date | undefined; 
  setDate: (date: Date | undefined) => void;
  setSelectedWeek: (date: Date) => void; 
  onOpenEditScheduleDialog: (schedule: ScheduledClass) => void;
  onDeleteSchedule: (scheduleId: number) => Promise<void>;
  classTypes: ClassType[];
  instructors: Instructor[];
}

export default function CalendarViewTab({
  scheduledClasses,
  date,
  setDate,
  setSelectedWeek,
  onOpenEditScheduleDialog,
  onDeleteSchedule,
  classTypes, 
  instructors 
}: CalendarViewTabProps) {
  
  const filteredClasses = scheduledClasses.filter(cls => {
    if (!date) return true; 
    const classDateForDisplay = convertUtcToLocalDateForDisplay(cls.date);
    return format(classDateForDisplay, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
  });
  
  const noClassesForSelectedDate = date && filteredClasses.length === 0;
  const noClassesAtAll = scheduledClasses.length === 0 && !date; // This condition might need refinement based on whether scheduledClasses is for "all time" or "current week"

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
              <p className="font-medium">Todas las clases de la semana</p>
            </div>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-gray-200 text-zinc-900 hover:bg-gray-100 flex justify-between items-center">
                <span>Cambiar fecha</span>
                <CalendarIcon className="h-4 w-4 ml-2" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 p-0 overflow-hidden sm:max-w-[425px]">
              <DialogHeader className="px-6 pt-6"><DialogTitle className="text-[#4A102A]">Seleccionar Fecha</DialogTitle><DialogDescription>Elige una fecha para ver las clases programadas.</DialogDescription></DialogHeader>
              <div className="p-6 pt-2 flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => { if (newDate) { setDate(newDate); setSelectedWeek(newDate); } }}
                  locale={es}
                  className="bg-white text-zinc-900"
                  classNames={{ day_selected: "bg-brand-mint text-white", day_today: "bg-gray-100 text-zinc-900", day: "text-zinc-900 hover:bg-gray-100" }}
                />
              </div>
              <DialogFooter className="px-6 pb-6">
                <Button variant="outline" className="border-gray-200 text-zinc-900 hover:bg-gray-100" onClick={() => {
                    const closeButton = document.querySelector('[data-state="open"][role="dialog"] [data-state="open"]');
                    if (closeButton instanceof HTMLElement) { closeButton.click(); }
                  }}>Aceptar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="border-gray-200 text-zinc-900 hover:bg-gray-100" onClick={() => { const today = new Date(); setDate(today); setSelectedWeek(today); }}>Hoy</Button>
            <Button variant="outline" className="border-gray-200 text-zinc-900 hover:bg-gray-100" onClick={() => { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); setDate(tomorrow); setSelectedWeek(tomorrow); }}>Mañana</Button>
            <Button variant="outline" className="border-gray-200 text-zinc-900 hover:bg-gray-100" onClick={() => { setDate(undefined); }}>Ver todas (semana)</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {noClassesAtAll && !date ? ( // Show this if no date is selected and scheduledClasses for the week is empty
            <p className="text-center text-gray-500 py-8">No hay clases programadas para esta semana</p>
          ) : noClassesForSelectedDate ? (
             <p className="text-center text-gray-500 py-8">No hay clases programadas para el día {format(date!, "d 'de' MMMM", { locale: es })}</p>
          ) : (
            filteredClasses.map((cls) => (
              <div key={cls.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-[#4A102A]">{cls.classType.name}</h3>
                    <p className="text-gray-600">{cls.instructor.user.firstName} {cls.instructor.user.lastName}</p>
                    <p className="text-sm text-gray-500">
                      {format(convertUtcToLocalDateForDisplay(cls.date), "EEEE, d 'de' MMMM", { locale: es })} - {formatTime(cls.time)}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1"><Users className="h-4 w-4" />{cls.maxCapacity - cls.availableSpots}/{cls.maxCapacity} inscritos</span>
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{cls.classType.duration} minutos</span>
                    </div>
                    {cls.waitlist.length > 0 && (<p className="text-sm text-orange-600 mt-1">Lista de espera: {cls.waitlist.length} personas</p>)}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-gray-200 text-zinc-900 hover:bg-gray-100" onClick={() => onOpenEditScheduleDialog(cls)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="border-gray-200 text-zinc-900 hover:bg-gray-100" onClick={() => onDeleteSchedule(cls.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
          {/* This logic might need adjustment: if !date (all week view) and filteredClasses (which is all scheduledClasses) is empty, it should show no classes for the week */}
          {!date && scheduledClasses.length === 0 && (
             <p className="text-center text-gray-500 py-8">No hay clases programadas para esta semana</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
