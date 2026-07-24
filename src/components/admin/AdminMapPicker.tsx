'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface AdminMapPickerProps {
  latitude: number
  longitude: number
  onChange: (lat: number, lng: number) => void
}

export default function AdminMapPicker({ latitude, longitude, onChange }: AdminMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Circle | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      scrollWheelZoom: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    // Semi-transparent red circle (~400m radius = 4 cuadras)
    const circle = L.circle([latitude, longitude], {
      radius: 400,
      color: '#525641',
      fillColor: '#6d7357',
      fillOpacity: 0.12,
      weight: 2,
      opacity: 0.5,
    }).addTo(map)

    markerRef.current = circle
    mapInstanceRef.current = map

    // Click to move the circle
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      circle.setLatLng([lat, lng])
      onChange(lat, lng)
    })

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update circle position when props change (from form)
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude])
      mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom())
    }
  }, [latitude, longitude])

  return (
    <div className="space-y-2">
      <div ref={mapRef} className="w-full h-64 rounded-xl border border-lavender/50 overflow-hidden" />
      <p className="text-xs text-lavender-light flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
        Hacé clic en el mapa para ubicar la propiedad. El círculo rojo indica la zona aproximada (~4 cuadras).
      </p>
    </div>
  )
}
