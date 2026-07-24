'use client'

import { useEffect, useRef } from 'react'

// Load Leaflet CSS dynamically
if (typeof window !== 'undefined') {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
  link.crossOrigin = ''
  if (!document.querySelector('link[href*="leaflet"]')) {
    document.head.appendChild(link)
  }
}

interface MapProps {
  latitude: number
  longitude: number
  zoom?: number
  height?: string
  interactive?: boolean
  showCircle?: boolean
  circleRadius?: number // in meters
  showMarker?: boolean
  markerLabel?: string
  onLocationChange?: (lat: number, lng: number) => void
  className?: string
}

export default function MapComponent({
  latitude,
  longitude,
  zoom = 16,
  height = '100%',
  interactive = false,
  showCircle = false,
  circleRadius = 400,
  showMarker = true,
  markerLabel = '',
  onLocationChange,
  className = '',
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const circleRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Dynamic import of Leaflet
    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return

      const map = L.map(mapRef.current, {
        center: [latitude, longitude],
        zoom: zoom,
        scrollWheelZoom: interactive,
        dragging: interactive,
        touchZoom: interactive,
        doubleClickZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Custom icon - with optional label tag
      const markerLabelHtml = markerLabel
        ? `<div style="position:absolute;bottom:100%;left:50%;transform:translateX(-50%);white-space:nowrap;background:#7A4E9B;color:#fff;font-size:12px;font-weight:600;padding:4px 10px;border-radius:6px;margin-bottom:4px;box-shadow:0 2px 8px rgba(0,0,0,0.25);font-family:system-ui,sans-serif;">${markerLabel}</div>`
        : ''

      const customIcon = L.divIcon({
        html: `${markerLabelHtml}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#6d7357" width="36" height="36" stroke="#7A4E9B" stroke-width="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
        className: '',
      })

      if (showMarker) {
        const marker = L.marker([latitude, longitude], { icon: customIcon, draggable: interactive })
          .addTo(map)
        markerRef.current = marker

        if (interactive && onLocationChange) {
          marker.on('dragend', () => {
            const pos = marker.getLatLng()
            onLocationChange(pos.lat, pos.lng)
          })
        }
      }

      if (showCircle) {
        const circle = L.circle([latitude, longitude], {
          radius: circleRadius,
          color: '#DC2626',
          fillColor: '#DC2626',
          fillOpacity: 0.5,
          weight: 3,
          opacity: 1,
          dashArray: '10, 8',
        }).addTo(map)
        circleRef.current = circle
      }

      // Click to set location in interactive mode
      if (interactive && onLocationChange) {
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng])
          }
          if (circleRef.current) {
            circleRef.current.setLatLng([lat, lng])
          }
          onLocationChange(lat, lng)
        })
      }

      mapInstanceRef.current = map

      // Fix leaflet rendering issue
      setTimeout(() => {
        map.invalidateSize()
      }, 200)
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update position when props change
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], zoom)
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude])
      }
      if (circleRef.current) {
        circleRef.current.setLatLng([latitude, longitude])
      }
    }
  }, [latitude, longitude, zoom])

  return (
    <div
      ref={mapRef}
      className={`w-full rounded-xl ${className}`}
      style={{ height: height }}
    />
  )
}
