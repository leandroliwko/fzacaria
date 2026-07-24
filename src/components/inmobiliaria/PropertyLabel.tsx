'use client'

/**
 * Cartel horizontal pegado al lado derecho de la foto, verticalmente centrado.
 *
 * - Contenedor absoluto posicionado en `right:0` y `top:50%` con translate-y(-50%).
 * - Sin rotación — texto horizontal legible.
 * - `whitespace-nowrap` garantiza que la frase se lea completa.
 * - Funciona dentro de contenedores con `overflow-hidden`.
 *
 *   <div className="relative">
 *     <img ... />
 *     <PropertyLabel label="RESERVADO" />
 *   </div>
 *
 * Si label es null/undefined/vacío no renderiza nada.
 */

const LABEL_STYLES: Record<string, string> = {
  RESERVADO: 'bg-amber-500',
  VENDIDO: 'bg-red-600',
}

const LABEL_TEXT: Record<string, string> = {
  RESERVADO: 'RESERVADO',
  VENDIDO: 'VENDIDO',
}

interface PropertyLabelProps {
  label?: string | null
  /** Tamaño del cartel — 'sm' para thumbnails chicos, 'md' para cards normales, 'lg' para detalle */
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'text-[10px] px-2.5 py-1 rounded-l-md',
  md: 'text-xs px-3 py-1.5 rounded-l-md',
  lg: 'text-sm px-4 py-2 rounded-l-lg',
}

export default function PropertyLabel({
  label,
  size = 'md',
}: PropertyLabelProps) {
  if (!label) return null
  const normalized = String(label).toUpperCase().trim()
  if (!LABEL_STYLES[normalized]) return null

  const bgClass = LABEL_STYLES[normalized]
  const text = LABEL_TEXT[normalized]
  const sizeClass = SIZE_CLASSES[size]

  return (
    <div
      className="pointer-events-none absolute right-0 top-[calc(50%+50px)] z-20 -translate-y-1/2"
      aria-label={text}
    >
      <div
        className={`${bgClass} text-white font-extrabold tracking-[0.15em] uppercase shadow-xl ring-1 ring-white/50 whitespace-nowrap ${sizeClass}`}
        style={{
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        {text}
      </div>
    </div>
  )
}
