'use client'

import { useMemo } from 'react'

interface VisitChartProps {
  data: Array<{ date: string; label: string; visits: number }>
  height?: number
}

export default function VisitChart({ data, height = 220 }: VisitChartProps) {
  const maxVisits = useMemo(() => Math.max(...data.map(d => d.visits), 1), [data])

  const chartWidth = 700
  const chartHeight = height - 40
  const barWidth = Math.max(4, Math.min(24, (chartWidth - 40) / data.length - 2))
  const gap = (chartWidth - 40 - barWidth * data.length) / (data.length - 1 || 1)

  // Find peak day
  const peakDay = useMemo(() => {
    const max = Math.max(...data.map(d => d.visits))
    return data.find(d => d.visits === max)
  }, [data])

  // Calculate 7-day average
  const avg7 = useMemo(() => {
    if (data.length < 7) return null
    const last7 = data.slice(-7)
    return Math.round(last7.reduce((sum, d) => sum + d.visits, 0) / 7)
  }, [data])

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${chartWidth} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = chartHeight - pct * (chartHeight - 20) - 10
          const val = Math.round(pct * maxVisits)
          return (
            <g key={i}>
              <line x1="35" y1={y} x2={chartWidth} y2={y} stroke="#C8B7D9" strokeWidth="0.5" strokeDasharray={pct === 0 ? '0' : '3,3'} opacity={pct === 0 ? 0.5 : 0.4} />
              <text x="30" y={y + 3} textAnchor="end" fontSize="9" fill="#9D7FB8" fontWeight="500">{val}</text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = maxVisits > 0 ? (d.visits / maxVisits) * (chartHeight - 30) : 0
          const x = 40 + i * (barWidth + gap)
          const y = chartHeight - 10 - barHeight
          const isPeak = d.visits === maxVisits && d.visits > 0
          const isToday = i === data.length - 1

          return (
            <g key={d.date}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={barWidth > 6 ? 3 : 1.5}
                fill={isPeak ? '#5D3A7A' : isToday ? '#7A4E9B' : '#B5A4D6'}
                opacity={d.visits === 0 ? 0.2 : 0.85}
              >
                <animate attributeName="height" from="0" to={barHeight} dur="0.6s" fill="freeze" />
                <animate attributeName="y" from={chartHeight - 10} to={y} dur="0.6s" fill="freeze" />
              </rect>

              {/* Value on top if significant */}
              {d.visits > 0 && (data.length <= 14 || isPeak || isToday) && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize="8"
                  fill={isPeak ? '#5D3A7A' : '#9D7FB8'}
                  fontWeight={isPeak ? '700' : '500'}
                >
                  {d.visits}
                </text>
              )}

              {/* X axis label - show every few days */}
              {(data.length <= 7 || i % Math.ceil(data.length / 7) === 0 || isToday) && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 2}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#9D7FB8"
                  transform={`rotate(-35, ${x + barWidth / 2}, ${chartHeight + 2})`}
                >
                  {d.label}
                </text>
              )}
            </g>
          )
        })}

        {/* 7-day average line */}
        {avg7 !== null && avg7 > 0 && (() => {
          const lineY = chartHeight - 10 - (avg7 / maxVisits) * (chartHeight - 30)
          return (
            <g>
              <line x1="40" y1={lineY} x2={chartWidth} y2={lineY} stroke="#6d7357" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.7" />
              <text x={chartWidth - 2} y={lineY - 4} textAnchor="end" fontSize="8" fill="#6d7357" fontWeight="600">
                Prom: {avg7}
              </text>
            </g>
          )
        })()}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-navy-light">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#7A4E9B] opacity-85" />
          <span>Visitas diarias</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#5D3A7A]" />
          <span>Pico: {peakDay?.visits || 0}</span>
        </div>
        {avg7 !== null && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 bg-[#6d7357] rounded" style={{ borderTop: '1.5px dashed #6d7357' }} />
            <span>Promedio 7d: {avg7}</span>
          </div>
        )}
      </div>
    </div>
  )
}
