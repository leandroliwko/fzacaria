'use client'

import { useState, useMemo } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, subMonths, isWithinInterval, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns'

interface AvailabilityCalendarProps {
  tempStart: string
  tempEnd: string
}

export default function AvailabilityCalendar({ tempStart, tempEnd }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    try {
      return startOfMonth(parseISO(tempStart))
    } catch {
      return new Date()
    }
  })

  const startDate = useMemo(() => {
    try {
      return parseISO(tempStart)
    } catch {
      return null
    }
  }, [tempStart])

  const endDate = useMemo(() => {
    try {
      return parseISO(tempEnd)
    } catch {
      return null
    }
  }, [tempEnd])

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  }, [startDate, endDate])

  // Determine which months to show
  const monthsToShow = useMemo(() => {
    if (!startDate || !endDate) return [currentMonth]
    const start = startOfMonth(startDate)
    const end = startOfMonth(endDate)
    const months: Date[] = []
    let current = start
    while (current <= end) {
      months.push(current)
      current = addMonths(current, 1)
    }
    return months.length > 1 ? months : [currentMonth, addMonths(currentMonth, 1)]
  }, [startDate, endDate, currentMonth])

  // Check if a day is in the available range
  const isDayAvailable = (day: Date) => {
    if (!startDate || !endDate) return false
    return isWithinInterval(day, { start: startDate, end: endDate })
  }

  // Check if a day is the start or end
  const isStart = (day: Date) => {
    if (!startDate) return false
    return day.getTime() === startDate.getTime()
  }

  const isEnd = (day: Date) => {
    if (!endDate) return false
    return day.getTime() === endDate.getTime()
  }

  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1))
  }

  // Navigate to the start month
  const goToStartMonth = () => {
    if (startDate) setCurrentMonth(startOfMonth(startDate))
  }

  if (!startDate || !endDate) return null

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-r from-teal-soft via-teal-pale/30 to-teal-soft rounded-xl p-5 border border-gold/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-navy text-base flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gold" />
            Disponibilidad Temporario
          </h4>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-navy-light">
              <div className="w-3 h-3 rounded bg-gold/30 border border-gold/50"></div>
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-navy-light">
              <div className="w-3 h-3 rounded bg-gold"></div>
              <span>Inicio / Fin</span>
            </div>
          </div>
        </div>

        {/* Date summary cards */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 bg-cream rounded-lg p-3 text-center border border-gold/20">
            <div className="text-[10px] font-semibold text-gold uppercase tracking-wider">Ingreso</div>
            <div className="text-lg font-bold text-navy">
              {startDate.toLocaleDateString('es-AR', { day: 'numeric' })}
            </div>
            <div className="text-xs text-navy-light capitalize">
              {startDate.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="text-gold font-bold text-sm">
              {totalDays}d
            </div>
            <svg className="w-4 h-4 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </div>
          <div className="flex-1 bg-cream rounded-lg p-3 text-center border border-gold/20">
            <div className="text-[10px] font-semibold text-gold uppercase tracking-wider">Egreso</div>
            <div className="text-lg font-bold text-navy">
              {endDate.toLocaleDateString('es-AR', { day: 'numeric' })}
            </div>
            <div className="text-xs text-navy-light capitalize">
              {endDate.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Calendar navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-navy/5 transition-colors"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4 text-navy" />
          </button>
          <button
            onClick={goToStartMonth}
            className="text-sm font-semibold text-navy hover:text-gold transition-colors"
          >
            Ir al período
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-navy/5 transition-colors"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4 text-navy" />
          </button>
        </div>

        {/* Two-month calendar view */}
        <div className="flex gap-4 overflow-x-auto pb-2">
          {monthsToShow.map((month, idx) => (
            <div key={idx} className="flex-shrink-0">
              <CalendarMonth
                month={month}
                startDate={startDate}
                endDate={endDate}
                isDayAvailable={isDayAvailable}
                isStart={isStart}
                isEnd={isEnd}
              />
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-gold/10">
          <p className="text-xs text-navy-light text-center">
            Período disponible: {startDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'long' })} - {endDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-[10px] text-navy-light/60 text-center mt-1">
            Consultá por disponibilidad y precios según temporada
          </p>
        </div>
      </div>
    </div>
  )
}

// Individual month calendar component
function CalendarMonth({
  month,
  startDate,
  endDate,
  isDayAvailable,
  isStart,
  isEnd,
}: {
  month: Date
  startDate: Date
  endDate: Date
  isDayAvailable: (day: Date) => boolean
  isStart: (day: Date) => boolean
  isEnd: (day: Date) => boolean
}) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Day names in Spanish
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  // Get the first day of the week (0 = Sunday, 1 = Monday)
  const firstDayOfWeek = monthStart.getDay()
  // Convert to Monday-based (0 = Monday)
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  return (
    <div className="w-full min-w-[260px]">
      {/* Month header */}
      <div className="text-center text-sm font-bold text-navy mb-2 capitalize">
        {month.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map(day => (
          <div key={day} className="text-[10px] font-medium text-navy-light text-center py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty cells for offset */}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Day cells */}
        {daysInMonth.map(day => {
          const available = isDayAvailable(day)
          const start = isStart(day)
          const end = isEnd(day)
          const today = new Date()
          const isToday = day.toDateString() === today.toDateString()
          const isPast = day < startOfMonth(today)

          return (
            <div
              key={day.toISOString()}
              className={`
                aspect-square flex items-center justify-center text-xs rounded-md relative
                ${start ? 'bg-gold text-white font-bold rounded-l-lg' : ''}
                ${end ? 'bg-gold text-white font-bold rounded-r-lg' : ''}
                ${available && !start && !end ? 'bg-gold/20 text-navy font-medium' : ''}
                ${!available && !isPast ? 'text-navy-light/40' : ''}
                ${isPast ? 'text-navy-light/20' : ''}
                ${isToday && !available ? 'ring-1 ring-gold/30' : ''}
              `}
            >
              {format(day, 'd')}
              {start && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold text-gold bg-cream px-1 rounded leading-tight">
                  IN
                </span>
              )}
              {end && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold text-gold bg-cream px-1 rounded leading-tight">
                  OUT
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
