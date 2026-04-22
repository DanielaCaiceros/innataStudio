"use client"

import { useState, useEffect, useCallback } from "react"
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Users, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface WeeklyScheduledClass {
  id: number
  classType: {
    id: number
    name: string
    duration: number
    description?: string | null
  }
  instructor: {
    id: number
    name: string
    profileImage?: string | null
  }
  coInstructors?: Array<{
    id: number
    name: string
    profileImage?: string | null
  }>
  date: string
  time: string
  maxCapacity: number
  availableSpots: number
  enrolledCount: number
  isSpecial?: boolean
  specialPrice?: number | null
  specialMessage?: string | null
}

interface WeeklyClassSelectorProps {
  branchId: number
  selectedClassId: number | null
  onSelectClass: (cls: WeeklyScheduledClass) => void
  refreshKey?: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimeFromISO(isoString: string) {
  const d = new Date(isoString)
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

function getUTCDateStr(isoString: string) {
  return isoString.slice(0, 10)
}

function isPastClass(cls: WeeklyScheduledClass) {
  const [h, m] = formatTimeFromISO(cls.time).split(":").map(Number)
  const classDate = new Date(cls.date.slice(0, 10) + "T00:00:00Z")
  // DB stores times as Mexico City local time (UTC-6) tagged as UTC, so add 6h to get real UTC
  classDate.setUTCHours(h + 6, m, 0, 0)
  return classDate < new Date()
}

const DAY_LABELS_SHORT = ["L", "M", "X", "J", "V", "S", "D"]
const DAY_LABELS_FULL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

// ─── Main component ──────────────────────────────────────────────────────────

export function WeeklyClassSelector({
  branchId,
  selectedClassId,
  onSelectClass,
  refreshKey,
}: WeeklyClassSelectorProps) {
  const [referenceWeek, setReferenceWeek] = useState(() => new Date())
  const [classes, setClasses] = useState<WeeklyScheduledClass[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Default selected day: today's index (Mon=0…Sun=6), clamped to current week
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const day = new Date().getDay()
    return day === 0 ? 6 : day - 1
  })

  const weekStart = startOfWeek(referenceWeek, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchWeekClasses = useCallback(async () => {
    setIsLoading(true)
    try {
      const startDate = format(weekStart, "yyyy-MM-dd")
      const endDate = format(addDays(weekStart, 6), "yyyy-MM-dd")
      const res = await fetch(
        `/api/scheduled-clases/week?startDate=${startDate}&endDate=${endDate}&branchId=${branchId}`
      )
      if (res.ok) {
        const data: WeeklyScheduledClass[] = await res.json()
        setClasses(data)
      }
    } catch (e) {
      console.error("Error fetching weekly classes:", e)
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format(weekStart, "yyyy-MM-dd"), branchId, refreshKey])

  useEffect(() => {
    fetchWeekClasses()
  }, [fetchWeekClasses])

  // ── Derived data ─────────────────────────────────────────────────────────

  // Unique time slots that have classes this week (sorted)
  const allTimes = Array.from(
    new Set(classes.map((cls) => formatTimeFromISO(cls.time)))
  ).sort()

  const getClassesFor = (dayIndex: number, time?: string) => {
    const dayStr = format(days[dayIndex], "yyyy-MM-dd")
    return classes.filter((cls) => {
      const classDay = getUTCDateStr(cls.date)
      const classTime = formatTimeFromISO(cls.time)
      return classDay === dayStr && (time === undefined || classTime === time)
    })
  }

  const isToday = (dayIndex: number) =>
    format(days[dayIndex], "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")

  const isCurrentWeek = format(weekStart, "yyyy-MM-dd") === format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")

  // ── Week navigation ──────────────────────────────────────────────────────
  const goToPrevWeek = () => setReferenceWeek((w) => subWeeks(w, 1))
  const goToNextWeek = () => {
    setReferenceWeek((w) => addWeeks(w, 1))
    setSelectedDayIndex(0) // reset to Monday on new week
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPrevWeek}
          className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full px-3"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1 text-sm">Anterior</span>
        </Button>

        <div className="text-center">
          <p className="font-semibold text-brand-cream text-sm sm:text-base">
            {format(weekStart, "d", { locale: es })}
            {" – "}
            {format(addDays(weekStart, 6), "d 'de' MMMM yyyy", { locale: es })}
          </p>
          {isCurrentWeek && (
            <span className="text-xs text-brand-cream font-medium">Semana actual</span>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextWeek}
          className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full px-3"
        >
          <span className="hidden sm:inline mr-1 text-sm">Siguiente</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          {/* ─── MOBILE: day tabs + vertical list ─────────────────────── */}
          <div className="block lg:hidden">
            {/* Day pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide snap-x snap-mandatory">
              {days.map((day, i) => {
                const hasClasses = getClassesFor(i).length > 0
                const today = isToday(i)
                const selected = selectedDayIndex === i
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDayIndex(i)}
                    className={`
                      flex-shrink-0 snap-start flex flex-col items-center
                      px-3.5 py-2.5 rounded-2xl transition-all duration-150
                      ${selected
                        ? "bg-brand-cream text-white shadow-md scale-105"
                        : today
                        ? "bg-[#4A102A]/8 text-brand-cream border border-[#4A102A]/20"
                        : "bg-brand-cream text-gray-500 border border-gray-100"
                      }
                    `}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide">
                      {DAY_LABELS_SHORT[i]}
                    </span>
                    <span className="text-lg font-bold leading-tight">{format(day, "d")}</span>
                    {/* Dot indicator for days with classes */}
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 transition-colors ${
                        hasClasses
                          ? selected
                            ? "bg-white/70"
                            : "bg-brand-cream/50"
                          : "bg-transparent"
                      }`}
                    />
                  </button>
                )
              })}
            </div>

            {/* Classes for selected day */}
            {(() => {
              const dayClasses = getClassesFor(selectedDayIndex)
              if (dayClasses.length === 0) {
                return (
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-sm">No hay clases este día</p>
                  </div>
                )
              }
              const times = Array.from(
                new Set(dayClasses.map((cls) => formatTimeFromISO(cls.time)))
              ).sort()
              return (
                <div className="space-y-5">
                  {times.map((time) => (
                    <div key={time}>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 pl-1">
                        {time}
                      </p>
                      <div className="space-y-2">
                        {dayClasses
                          .filter((cls) => formatTimeFromISO(cls.time) === time)
                          .map((cls) => (
                            <ClassCard
                              key={cls.id}
                              cls={cls}
                              isSelected={selectedClassId === cls.id}
                              isDisabled={cls.availableSpots === 0 || isPastClass(cls)}
                              onClick={() => onSelectClass(cls)}
                            />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* ─── DESKTOP: time × day grid ──────────────────────────────── */}
          <div className="hidden lg:block overflow-x-auto">
            <div className="min-w-[750px]">
              {/* Header row */}
              <div className="grid grid-cols-8 gap-1.5 mb-1.5">
                <div className="rounded-xl p-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                  Hora
                </div>
                {days.map((day, i) => {
                  const today = isToday(i)
                  return (
                    <div
                      key={i}
                      className={`rounded-xl p-2.5 text-center transition-colors ${
                        today
                          ? "bg-brand-cream text-white"
                          : "bg-gray-50 text-gray-700"
                      }`}
                    >
                      <p className="text-xs font-semibold">{DAY_LABELS_FULL[i]}</p>
                      <p className={`text-xl font-bold leading-tight ${today ? "text-white" : "text-gray-900"}`}>
                        {format(day, "d")}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Time rows */}
              {allTimes.length === 0 ? (
                <div className="text-center py-14 text-gray-400 text-sm">
                  No hay clases programadas esta semana.
                </div>
              ) : (
                allTimes.map((time) => (
                  <div key={time} className="grid grid-cols-8 gap-1.5 mb-1.5">
                    <div className="rounded-xl bg-gray-50 flex items-center justify-center text-sm font-semibold text-gray-500 min-h-[90px]">
                      {time}
                    </div>
                    {days.map((_, dayIndex) => {
                      const dayClasses = getClassesFor(dayIndex, time)
                      return (
                        <div
                          key={dayIndex}
                          className={`rounded-xl min-h-[90px] flex flex-col gap-1.5 p-1 ${
                            dayClasses.length === 0 ? "bg-gray-50/60" : ""
                          }`}
                        >
                          {dayClasses.map((cls) => (
                            <ClassCard
                              key={cls.id}
                              cls={cls}
                              isSelected={selectedClassId === cls.id}
                              isDisabled={cls.availableSpots === 0 || isPastClass(cls)}
                              onClick={() => onSelectClass(cls)}
                              compact
                            />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Class Card ──────────────────────────────────────────────────────────────

interface ClassCardProps {
  cls: WeeklyScheduledClass
  isSelected: boolean
  isDisabled: boolean
  onClick: () => void
  compact?: boolean
}

function ClassCard({ cls, isSelected, isDisabled, onClick, compact = false }: ClassCardProps) {
  const isFull = cls.availableSpots === 0
  const isSpecial = cls.isSpecial === true

  const containerClass = [
    "w-full text-left rounded-xl transition-all duration-150 group",
    compact ? "p-2" : "p-3.5",
    isSelected
      ? isSpecial
        ? "bg-amber-500 shadow-md ring-2 ring-amber-400/30"
        : "bg-brand-cream shadow-md ring-2 ring-brand-cream/30"
      : isDisabled
      ? "bg-gray-100/80 cursor-not-allowed opacity-70"
      : isSpecial
      ? "bg-amber-50 border border-amber-300 hover:border-amber-400 hover:shadow-sm cursor-pointer active:scale-[0.98]"
      : "bg-white border border-gray-200 hover:border-brand-cream/40 hover:shadow-sm cursor-pointer active:scale-[0.98]",
  ].join(" ")

  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={containerClass}
    >
      {/* Special badge */}
      {isSpecial && cls.specialPrice && (
        <div className={`mb-1.5 inline-flex items-center rounded-full px-2 py-0.5 ${compact ? "text-[9px]" : "text-xs"} font-bold ${isSelected ? "bg-white/20 text-white" : "bg-amber-200 text-amber-800"}`}>
          ⭐ ${cls.specialPrice} MXN
        </div>
      )}

      {/* Coach row */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <p
            className={`font-bold leading-tight truncate ${
              compact ? "text-xs" : "text-sm"
            } ${isSelected ? "text-white" : isDisabled ? "text-gray-400" : isSpecial ? "text-amber-800" : "text-brand-cream"}`}
          >
            {cls.classType.name}
          </p>
          <p
            className={`truncate ${compact ? "text-[10px]" : "text-xs"} ${
              isSelected ? "text-white/75" : isDisabled ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {[cls.instructor.name.split(" ")[0], ...(cls.coInstructors?.map((ci) => ci.name.split(" ")[0]) ?? [])].join(" & ")}
          </p>
        </div>
      </div>

      {/* Spots + duration */}
      <div
        className={`flex items-center gap-2 ${compact ? "text-[10px]" : "text-xs"} ${
          isSelected ? "text-white/70" : isDisabled ? "text-gray-400" : "text-gray-400"
        }`}
      >
        <span className="flex items-center gap-0.5">
          <Users className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
          {isFull ? (
            <span className={`font-semibold ${isSelected ? "text-white/80" : "text-red-500"}`}>
              Sin cupo
            </span>
          ) : (
            <span>
              {cls.availableSpots} lugar{cls.availableSpots !== 1 ? "es" : ""}
            </span>
          )}
        </span>
        <span>·</span>
        <span className="flex items-center gap-0.5">
          <Clock className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
          {cls.classType.duration}min
        </span>
      </div>
    </button>
  )
}
