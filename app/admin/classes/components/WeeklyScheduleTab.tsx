"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns"; // Keep only if used directly here
import { es } from "date-fns/locale";
import { CalendarIcon, Edit, Trash2, Users, Clock } from "lucide-react"; // Verify icons
import { useToast } from "@/components/ui/use-toast";
import { ClassType, Instructor, ScheduledClass, timeSlots, weekDays, convertUtcToLocalDateForDisplay, formatTime as importedFormatTime } from "../typesAndConstants"; // Adjusted path


interface WeeklyScheduleTabProps {
  selectedWeek: Date;
  setSelectedWeek: (date: Date) => void;
  scheduledClasses: ScheduledClass[];
  loadScheduledClasses: () => Promise<void>; // Kept, as it might be triggered by an internal refresh button someday
  instructors: Instructor[];
  classTypes: ClassType[];
  onOpenNewScheduleDialog: () => void;
  onOpenEditScheduleDialog: (schedule: ScheduledClass) => void;
  onDeleteSchedule: (scheduleId: number) => Promise<void>;
}

export default function WeeklyScheduleTab({
  selectedWeek,
  setSelectedWeek,
  scheduledClasses,
  loadScheduledClasses, // Kept
  instructors,
  classTypes,
  onOpenNewScheduleDialog,
  onOpenEditScheduleDialog,
  onDeleteSchedule,
}: WeeklyScheduleTabProps) {
  const { toast } = useToast(); // Still needed for delete confirmation if not handled by parent
  const [isLoading, setIsLoading] = useState(false); // This can be for loading view specific things, or removed if parent handles all loading states. Keeping for now if internal ops need it.

  // States for dialogs and forms are removed and managed by ClassesPage

  // Derived date calculations
  const currentWeekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });

  // Use imported formatTime, aliased to avoid conflict if necessary, though here it's fine.
  const formatTime = importedFormatTime;
  
  // Get classes for day function (from original page.tsx)
  const getClassesForDay = (dayOffset: number) => {
    const targetDate = addDays(currentWeekStart, dayOffset);
    // Use convertUtcToLocalDateForDisplay for targetDate to ensure comparison is with displayed date parts
    const targetDateString = format(targetDate, "yyyy-MM-dd"); 

    return scheduledClasses.filter((cls) => {
      const classDateForDisplay = convertUtcToLocalDateForDisplay(cls.date);
      const classDateString = format(classDateForDisplay, "yyyy-MM-dd");
      return classDateString === targetDateString;
    });
  };

  // useEffect for populating edit form is removed (managed by ClassesPage)
  // CRUD Handlers are removed (managed by ClassesPage)
  
  // JSX for the component
  return (
    <div>
      {/* Week Navigation and Programar Clase Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#4A102A]">
            Semana del {format(currentWeekStart, "d", { locale: es })} al{" "}
            {format(currentWeekEnd, "d 'de' MMMM yyyy", { locale: es })}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSelectedWeek(addDays(selectedWeek, -7))} className="border-gray-200 text-zinc-900 hover:bg-gray-100">
            ← Semana Anterior
          </Button>
          <Button variant="outline" onClick={() => setSelectedWeek(addDays(selectedWeek, 7))} className="border-gray-200 text-zinc-900 hover:bg-gray-100">
            Semana Siguiente →
          </Button>
          {/* Dialog for New Schedule is removed, trigger calls parent */}
          <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white" onClick={onOpenNewScheduleDialog}>
            <CalendarIcon className="h-4 w-4 mr-2" /> Programar Clase
          </Button>
        </div>
      </div>

      {/* Schedule Grid */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-8 gap-2 mb-4">
                <div className="bg-gray-100 p-4 font-bold text-center text-[#4A102A] rounded-lg">Hora</div>
                {weekDays.map((day, index) => (
                  <div key={day.key} className="bg-gray-100 p-4 font-bold text-center text-[#4A102A] rounded-lg">
                    <div>{day.label}</div>
                    <div className="text-sm font-normal text-gray-600">{format(addDays(currentWeekStart, index), "d/M")}</div>
                  </div>
                ))}
              </div>
              {timeSlots.map((time) => (
                <div key={time} className="grid grid-cols-8 gap-2 mb-2">
                  <div className="bg-gray-50 p-4 flex items-center justify-center text-gray-700 rounded-lg">{time}</div>
                  {weekDays.map((day, dayIndex) => {
                    const dayClasses = getClassesForDay(dayIndex).filter((cls) => formatTime(cls.time) === time);
                    return (
                      <div key={`${day.key}-${time}`} className={`p-2 rounded-lg min-h-[80px] ${dayClasses.length > 0 ? "bg-white border border-gray-200 shadow-sm" : "bg-gray-50"}`}>
                        {dayClasses.map((cls) => (
                          <div key={cls.id} className="relative group">
                            <div className="text-center">
                              <p className="font-bold text-sm text-[#4A102A]">{cls.classType.name}</p>
                              <p className="text-xs text-gray-600">{cls.instructor.user.firstName} {cls.instructor.user.lastName}</p>
                              <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mt-1">
                                <Users className="h-3 w-3" /><span>{cls.maxCapacity - cls.availableSpots}/{cls.maxCapacity}</span>
                                {cls.availableSpots === 0 && (
                                  <span className="ml-1 px-1.5 py-0.5 text-xxs font-semibold bg-red-100 text-red-700 rounded-full">
                                    LLENO
                                  </span>
                                )}
                                <Clock className="h-3 w-3 ml-1" /><span>{cls.classType.duration}min</span>
                              </div>
                            </div>
                            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-[#4A102A]" onClick={() => onOpenEditScheduleDialog(cls)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-[#C5172E]" onClick={() => onDeleteSchedule(cls.id)}>
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

      {/* Edit Schedule Dialog is removed and managed by ClassesPage */}
    </div>
  );
}
