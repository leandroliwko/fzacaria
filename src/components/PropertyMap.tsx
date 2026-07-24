'use client'

import { useEffect, useState } from 'react'
import { MapPin, Loader2, Search } from 'lucide-react'

// We need to dynamically import Leaflet components because they require `window`
// which is not available during SSR. We use a dynamic import pattern.

interface PropertyMapProps {
  latitude: number | null
  longitude: number | null
  location?: string
  // Admin mode: allows clicking to set position
  editable?: boolean
  onPositionChange?: (lat: number, lng: number) => void
}

export default function PropertyMap({
  latitude,
  longitude,
  location = '',
  editable = false,
  onPositionChange,
}: PropertyMapProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{
    latitude: number | null
    longitude: number | null
    location: string
    editable: boolean
    onPositionChange?: (lat: number, lng: number) => void
  }> | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    // Dynamic import to avoid SSR issues with Leaflet
    import('./PropertyMapInner')
      .then((mod) => setMapComponent(() => mod.default))
      .catch((err) => {
        console.error('Failed to load map:', err)
        setLoadError(true)
      })
  }, [])

  if (loadError) {
    return (
      <div className="w-full h-64 rounded-xl bg-soft flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-8 h-8 text-lavender-light mx-auto mb-2" />
          <p className="text-navy-light text-sm">No se pudo cargar el mapa</p>
        </div>
      </div>
    )
  }

  if (!MapComponent) {
    return (
      <div className="w-full h-64 rounded-xl bg-soft flex items-center justify-center animate-pulse">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-lavender-light mx-auto mb-2 animate-spin" />
          <p className="text-navy-light text-sm">Cargando mapa...</p>
        </div>
      </div>
    )
  }

  return (
    <MapComponent
      latitude={latitude}
      longitude={longitude}
      location={location}
      editable={editable}
      onPositionChange={onPositionChange}
    />
  )
}
