'use client'

import * as React from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'

import { cn } from '@/lib/utils'

interface DatePickerProps {
  date: string | undefined
  onDateChange: (date: string | undefined) => void
  placeholder?: string
  minDate?: string | undefined
  className?: string
  label?: string
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function DatePicker({
  date,
  onDateChange,
  placeholder = 'Seleccionar fecha',
  minDate,
  className,
  label,
}: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => {
    if (date) {
      try { return startOfMonth(new Date(date + 'T00:00:00')) } catch { return startOfMonth(new Date()) }
    }
    return startOfMonth(new Date())
  })

  const selectedDate = date ? new Date(date + 'T00:00:00') : undefined
  const minDateObj = minDate ? new Date(minDate + 'T00:00:00') : undefined
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Monday-based offset
  const firstDayOfWeek = monthStart.getDay()
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  const handleSelect = (day: Date) => {
    const year = day.getFullYear()
    const month = String(day.getMonth() + 1).padStart(2, '0')
    const d = String(day.getDate()).padStart(2, '0')
    onDateChange(`${year}-${month}-${d}`)
  }

  const isDisabled = (day: Date) => {
    const dayStart = new Date(day); dayStart.setHours(0,0,0,0)
    if (minDateObj) {
      const minStart = new Date(minDateObj); minStart.setHours(0,0,0,0)
      if (dayStart < minStart) return true
    }
    // Disable days before today
    if (dayStart < todayStart) return true
    return false
  }

  const isSelected = (day: Date) => {
    if (!selectedDate) return false
    return day.toDateString() === selectedDate.toDateString()
  }

  const isToday = (day: Date) => {
    return day.toDateString() === new Date().toDateString()
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-navy-dark mb-1">{label}</label>
      )}
      {/* Selected date display */}
      <div className="flex items-center gap-2">
        <div className={cn(
          'flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border text-sm',
          selectedDate
            ? 'border-gold bg-gold/5 text-navy font-medium'
            : 'border-lavender/50 text-navy-light'
        )}>
          <CalendarIcon className="w-4 h-4 text-gold flex-shrink-0" />
          {selectedDate ? (
            <span>{format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}</span>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
        {selectedDate && (
          <button
            type="button"
            onClick={() => onDateChange(undefined)}
            className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
            title="Limpiar fecha"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Inline Calendar */}
      <div className="bg-cream border border-lavender/30 rounded-xl p-3 shadow-sm">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
            className="p-1.5 rounded-lg hover:bg-navy/5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-navy" />
          </button>
          <span className="text-sm font-bold text-navy capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
            className="p-1.5 rounded-lg hover:bg-navy/5 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-navy" />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAY_NAMES.map(day => (
            <div key={day} className="text-[10px] font-medium text-navy-light text-center py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {daysInMonth.map(day => {
            const disabled = isDisabled(day)
            const selected = isSelected(day)
            const todayFlag = isToday(day)

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={disabled}
                onClick={() => handleSelect(day)}
                className={cn(
                  'aspect-square flex items-center justify-center text-xs rounded-md transition-all',
                  selected && 'bg-gold text-white font-bold shadow-sm hover:bg-gold/90',
                  !selected && !disabled && 'text-navy hover:bg-gold/10 font-medium',
                  !selected && disabled && 'text-navy-light/30 cursor-not-allowed',
                  todayFlag && !selected && 'ring-1 ring-gold/40 font-semibold',
                )}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
