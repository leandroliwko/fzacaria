'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon issue with bundlers
// We don't use markers for this project (only circles), but just in case
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// 4 cuadras = ~400 metros (una cuadra argentina ≈ 100m)
const CIRCLE_RADIUS_METERS = 400

// Default center: Pinamar, Buenos Aires, Argentina
const DEFAULT_CENTER: [number, number] = [-37.1067, -56.8688]
const DEFAULT_ZOOM = 14

interface PropertyMapInnerProps {
  latitude: number | null
  longitude: number | null
  location: string
  editable: boolean
  onPositionChange?: (lat: number, lng: number) => void
}

export default function PropertyMapInner({
  latitude,
  longitude,
  location,
  editable,
  onPositionChange,
}: PropertyMapInnerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const centerMarkerRef = useRef<L.CircleMarker | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Prevent double initialization in React strict mode
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapRef.current, {
      center: latitude && longitude ? [latitude, longitude] : DEFAULT_CENTER,
      zoom: latitude && longitude ? 15 : DEFAULT_ZOOM,
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true,
    })

    // Use OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    // Draw the semi-transparent red circle if coordinates exist
    if (latitude && longitude) {
      drawCircle(map, latitude, longitude)
    }

    // If editable, allow clicking to set position
    if (editable) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng
        drawCircle(map, lat, lng)
        onPositionChange?.(lat, lng)
      })
    }

    mapInstanceRef.current = map

    // Fix Leaflet rendering issue with dynamically loaded containers
    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update circle when coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (latitude && longitude) {
      drawCircle(map, latitude, longitude)
      map.setView([latitude, longitude], 15)
    }
  }, [latitude, longitude])

  function drawCircle(map: L.Map, lat: number, lng: number) {
    // Remove existing circle and center marker
    if (circleRef.current) {
      circleRef.current.remove()
      circleRef.current = null
    }
    if (centerMarkerRef.current) {
      centerMarkerRef.current.remove()
      centerMarkerRef.current = null
    }

    // Draw semi-transparent red circle (4 cuadras radius)
    const circle = L.circle([lat, lng], {
      radius: CIRCLE_RADIUS_METERS,
      color: '#525641',         // Verde Agua Oscuro border
      fillColor: '#6d7357',     // Verde Agua Medio fill
      fillOpacity: 0.15,        // semi-transparent
      weight: 2,                // border width
      dashArray: '8, 6',        // dashed border
    }).addTo(map)

    // Tooltip showing the approximate area text
    circle.bindTooltip('Zona aproximada (4 cuadras)', {
      permanent: false,
      direction: 'top',
      className: 'map-tooltip',
    })

    circleRef.current = circle
  }

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="w-full rounded-xl overflow-hidden border border-lavender/50"
        style={{ height: editable ? '400px' : '280px' }}
      />
      {editable && (
        <div className="absolute top-3 left-3 z-[1000] bg-cream/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
          <p className="text-xs text-navy font-medium">
            Hacé clic en el mapa para ubicar la propiedad
          </p>
          <p className="text-[10px] text-lavender-light">
            Se dibujará un círculo de 4 cuadras a la redonda
          </p>
        </div>
      )}
      {!editable && latitude && longitude && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-cream/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
          <p className="text-[10px] text-navy-light">
            Ubicación aproximada · Zona de 4 cuadras
          </p>
        </div>
      )}
    </div>
  )
}
