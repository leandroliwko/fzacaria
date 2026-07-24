'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Bed,
  Bath,
  Maximize,
  Maximize2,
  MapPin,
  Heart,
  MessageCircle,
  Phone,
  Share2,
  FileDown,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Home,
  Building,
  TreePine,
  Warehouse,
  LandPlot,
  Store,
  Briefcase,
  Castle,
  Car,
  Waves,
  TreeDeciduous,
  Flame,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Info,
  Snowflake,
  Thermometer,
  Coffee,
  Sun,
  Droplets,
  Droplet,
  Dumbbell,
  Dog,
  UtensilsCrossed,
  Tv,
  Wind,
  Zap,
  GraduationCap,
  Toilet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import dynamic from 'next/dynamic'
import AvailabilityCalendar from '@/components/inmobiliaria/AvailabilityCalendar'
import PropertyLabel from './PropertyLabel'
import { resolveImageUrl } from '@/lib/imageUrl'

const MapComponent = dynamic(() => import('@/components/ui/map'), { ssr: false })

interface Temporada {
  id: string
  name: string
  startDate: string
  endDate: string
  price: string
  currency: string
  available: boolean
}

// Interface for DB-sourced properties
interface Property {
  id: string
  title: string
  type: string
  operation: string
  price: string
  location: string
  bedrooms: number
  bathrooms: number
  area: number
  image: string
  images: string
  video?: string
  description: string
  extras: string
  features: string
  coveredArea?: number
  totalArea?: number
  featured: boolean
  active: boolean
  label?: string | null
  code?: string
  latitude?: number
  longitude?: number
  tempStart?: string | null
  tempEnd?: string | null
  temporadas?: Temporada[]
  createdAt: string
  updatedAt: string
}

const typeIcons: Record<string, any> = {
  casa: Home,
  departamento: Building,
  chalet: Castle,
  ph: Building,
  lote: LandPlot,
  local: Store,
  galpon: Warehouse,
  campo: TreePine,
  oficina: Briefcase,
  quinta: Warehouse,
  hotel: Building,
}

const typeLabels: Record<string, string> = {
  casa: 'Casa',
  departamento: 'Departamento',
  chalet: 'Chalet',
  ph: 'PH',
  lote: 'Lote / Terreno',
  local: 'Local Comercial',
  galpon: 'Galpón',
  campo: 'Campo',
  oficina: 'Oficina',
  quinta: 'Quinta',
  hotel: 'Hotel',
}

const operationBadgeColor: Record<string, string> = {
  venta: 'bg-gold text-white',
  alquiler: 'bg-navy-light text-white',
  temporario: 'bg-teal-pale text-white',
}

const operationLabel: Record<string, string> = {
  venta: 'Venta',
  alquiler: 'Alquiler',
  temporario: 'Temporario',
}

const extraIcons: Record<string, any> = {
  Cochera: Car,
  Parrilla: Flame,
  Pileta: Waves,
  Jardín: TreeDeciduous,
  Parque: TreePine,
  WiFi: Wifi,
  'Aire acond.': Snowflake,
  'A/C': Snowflake,
  Seguridad: ShieldCheck,
  Amoblado: Coffee,
  Calefacción: Thermometer,
  Balcón: Sun,
  Laundry: Droplets,
  Gimnasio: Dumbbell,
  Mascotas: Dog,
  Cocina: UtensilsCrossed,
  TV: Tv,
  Ventilador: Wind,
  Luz: Zap,
  'Cerca de Escuelas': GraduationCap,
  'Agua Corriente': Droplet,
  'Cloacas': Toilet,
  'Gas Natural': Flame,
}

const defaultImage = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80'

// Safely parse a date that may be a full ISO string or a date-only string
function parseDate(dateStr: string): Date {
  if (dateStr.includes('T')) {
    return new Date(dateStr)
  }
  return new Date(dateStr + 'T00:00:00')
}

// Format price with currency symbol
function formatTempPrice(price: string, currency: string): string {
  if (!price) return ''
  if (price.startsWith('U$S') || price.startsWith('$')) return price
  const symbol = currency === 'ARS' ? '$' : 'U$S'
  return `${symbol} ${price}`
}

export default function PropertyDetail({
  property,
  open,
  onClose,
}: {
  property: Property | null
  open: boolean
  onClose: () => void
}) {
  const [currentImage, setCurrentImage] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [shareFeedback, setShareFeedback] = useState('')
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const handleDownloadPdf = async () => {
    if (!property) return
    setDownloadingPdf(true)
    try {
      const res = await fetch(`/api/property/pdf/${property.id}`)
      if (!res.ok) throw new Error('Error generando PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${property.code && property.code !== 'PENDING' ? property.code : 'propiedad'}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF download error:', error)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleShare = async () => {
    const propertyUrl = `${window.location.origin}/propiedad/${property!.id}`
    const shareData = {
      title: property!.title,
      text: `${property!.title} - ${property!.price} | ${property!.location}`,
      url: propertyUrl,
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(
          `${property!.title} - ${property!.price} | ${property!.location} ${propertyUrl}`
        )
        setShareFeedback('¡Link copiado!')
        setTimeout(() => setShareFeedback(''), 2000)
      } catch {
        setShareFeedback('No se pudo copiar')
        setTimeout(() => setShareFeedback(''), 2000)
      }
    }
  }

  if (!property) return null

  // Parse comma-separated strings from DB
  const extrasArray = property.extras
    ? property.extras.split(',').map(e => e.trim()).filter(Boolean)
    : []

  const featuresArray = property.features
    ? property.features.split(',').map(f => f.trim()).filter(Boolean)
    : []

  // Parse images - support both JSON array and comma-separated formats
  let imagesArray: string[] = []
  if (property.images) {
    try {
      const parsed = JSON.parse(property.images)
      if (Array.isArray(parsed)) {
        imagesArray = parsed.filter(Boolean)
      } else {
        imagesArray = property.images.split(',').map(img => img.trim()).filter(Boolean)
      }
    } catch {
      imagesArray = property.images.split(',').map(img => img.trim()).filter(Boolean)
    }
  }

  // Build gallery: main image first, then additional images
  const galleryImages = [
    resolveImageUrl(property.image) || defaultImage,
    ...imagesArray.filter(img => img !== property.image).map(img => resolveImageUrl(img) || img),
  ].filter(Boolean)

  const description =
    property.description ||
    `Excelente ${typeLabels[property.type]?.toLowerCase() || 'propiedad'} ubicado/a en ${property.location}. ` +
    `Esta propiedad cuenta con ${property.bedrooms > 0 ? `${property.bedrooms} dormitorio${property.bedrooms > 1 ? 's' : ''}` : ''}` +
    `${property.bedrooms > 0 && property.bathrooms > 0 ? ', ' : ''}` +
    `${property.bathrooms > 0 ? `${property.bathrooms} baño${property.bathrooms > 1 ? 's' : ''}` : ''}` +
    `${(property.bedrooms > 0 || property.bathrooms > 0) && property.area > 0 ? ' y ' : '.'}` +
    `${property.area > 0 ? ` una superficie de ${property.area.toLocaleString()} m².` : ''}` +
    ` \n\nLa propiedad se encuentra en excelente estado de conservación y ofrece espacios amplios y luminosos. ` +
    `Ideal para quienes buscan confort y calidad de vida en una zona privilegiada. ` +
    `${extrasArray.length > 0 ? `Entre sus amenities se destacan: ${extrasArray.join(', ').toLowerCase()}.` : ''}` +
    ` \n\nNo dude en consultar para obtener más información o coordinar una visita.`

  const features = featuresArray.length > 0 ? featuresArray : [
    'Escritura al día',
    'Servicios conectados',
    'Zona residencial',
    'Fácil acceso',
    ...(extrasArray.includes('Apto crédito') ? ['Apto crédito'] : ['Consultar crédito']),
  ]

  const nextImage = () => setCurrentImage((c) => (c + 1) % galleryImages.length)
  const prevImage = () => setCurrentImage((c) => (c - 1 + galleryImages.length) % galleryImages.length)

  const nextFullscreenImage = () => setCurrentImage((c) => (c + 1) % galleryImages.length)
  const prevFullscreenImage = () => setCurrentImage((c) => (c - 1 + galleryImages.length) % galleryImages.length)

  const TypeIcon = typeIcons[property.type] || Home

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl bg-cream rounded-2xl shadow-2xl my-4 sm:my-8 mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-30 w-11 h-11 bg-cream/95 shadow-lg rounded-full flex items-center justify-center text-navy-dark hover:bg-red-50 hover:text-red-600 transition-all duration-200 border border-lavender/50"
              title="Cerrar"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Image Gallery */}
            <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden cursor-pointer" onClick={() => setFullscreenOpen(true)}>
              <img
                src={galleryImages[currentImage]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              <PropertyLabel label={property.label} size="lg" />

              {/* Expand button - bottom right */}
              <button
                onClick={(e) => { e.stopPropagation(); setFullscreenOpen(true) }}
                className="absolute bottom-4 right-4 z-10 w-9 h-9 bg-navy-dark/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-navy-dark/70 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              {/* Gallery Navigation */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prevImage() }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-cream/90 rounded-full flex items-center justify-center shadow-md hover:bg-cream transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-navy" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); nextImage() }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-cream/90 rounded-full flex items-center justify-center shadow-md hover:bg-cream transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-navy" />
                  </button>
                  {/* Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {galleryImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImage(i)}
                        className={`h-2 rounded-full transition-all ${
                          i === currentImage ? 'w-6 bg-cream' : 'w-2 bg-cream/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Image count */}
              {galleryImages.length > 1 && (
                <div className="absolute bottom-4 left-4 bg-navy-dark/60 backdrop-blur-sm rounded-full px-3 py-1 text-white text-xs z-10">
                  {currentImage + 1} / {galleryImages.length}
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none max-w-[calc(100%-32px)]">
                <Badge className={`${operationBadgeColor[property.operation] || 'bg-soft text-white'} text-xs font-semibold px-3 py-1`}>
                  {operationLabel[property.operation] || property.operation}
                </Badge>
                {property.featured && (
                  <Badge className="bg-gold text-white text-xs font-semibold px-3 py-1">
                    Destacada
                  </Badge>
                )}
              </div>

              {/* Favorite + Share */}
              <div className="absolute top-4 left-4 flex gap-2 mt-10" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className="w-9 h-9 bg-cream/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-cream transition-colors shadow-sm"
                >
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      isFavorite ? 'fill-red-500 text-red-500' : 'text-navy-light'
                    }`}
                  />
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="w-9 h-9 bg-cream/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-cream transition-colors shadow-sm"
                  title="Descargar PDF"
                >
                  {downloadingPdf ? (
                    <Loader2 className="w-4 h-4 text-navy-light animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4 text-navy-light" />
                  )}
                </button>
                <button
                  onClick={handleShare}
                  className="w-9 h-9 bg-cream/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-cream transition-colors shadow-sm relative"
                >
                  <Share2 className="w-4 h-4 text-navy-light" />
                  {shareFeedback && (
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-navy text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {shareFeedback}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-8">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left - Main Info */}
                <div className="flex-1">
                  {/* Title */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TypeIcon className="w-5 h-5 text-gold" />
                      <span className="text-gold font-medium text-sm uppercase tracking-wider">
                        {typeLabels[property.type] || property.type}
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-navy">
                      {property.title}
                    </h2>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2 text-navy-light mb-6">
                    <MapPin className="w-4 h-4 text-gold" />
                    <span>{property.location}</span>
                  </div>

                  {/* Quick Features */}
                  {(property.bedrooms > 0 || property.bathrooms > 0 || property.area > 0) && (
                    <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-lavender/30">
                      {property.bedrooms > 0 && (
                        <div className="flex items-center gap-2 bg-surface rounded-xl px-4 py-3">
                          <Bed className="w-5 h-5 text-navy" />
                          <div>
                            <div className="text-lg font-bold text-navy">{property.bedrooms}</div>
                            <div className="text-xs text-navy-light">Dormitorios</div>
                          </div>
                        </div>
                      )}
                      {property.bathrooms > 0 && (
                        <div className="flex items-center gap-2 bg-surface rounded-xl px-4 py-3">
                          <Bath className="w-5 h-5 text-navy" />
                          <div>
                            <div className="text-lg font-bold text-navy">{property.bathrooms}</div>
                            <div className="text-xs text-navy-light">Baños</div>
                          </div>
                        </div>
                      )}
                      {property.area > 0 && (
                        <div className="flex items-center gap-2 bg-surface rounded-xl px-4 py-3">
                          <Maximize className="w-5 h-5 text-navy" />
                          <div>
                            <div className="text-lg font-bold text-navy">{property.area.toLocaleString()}</div>
                            <div className="text-xs text-navy-light">m² Superficie</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Temporario - Segmentos de Temporada */}
                  {property.operation === 'temporario' && (
                    <div className="mb-6">
                      <div className="bg-gradient-to-r from-teal-soft via-teal-pale/30 to-teal-soft rounded-2xl p-5 border border-gold/20">
                        <h3 className="font-bold text-navy text-lg mb-4 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-gold" />
                          Disponibilidad por Temporada
                        </h3>
                        {property.temporadas && property.temporadas.length > 0 ? (
                          <div className="space-y-3">
                            {property.temporadas.map((temp, idx) => {
                              const start = temp.startDate ? parseDate(temp.startDate) : null
                              const end = temp.endDate ? parseDate(temp.endDate) : null
                              const diff = start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : 0
                              return (
                                <div
                                  key={temp.id || idx}
                                  className={`rounded-xl p-4 transition-all ${
                                    temp.available
                                      ? 'bg-cream border border-gold/20'
                                      : 'bg-surface/50 border border-lavender/20 opacity-60'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-full bg-gold/20 text-gold text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                                      <h4 className="font-semibold text-navy text-sm">{temp.name || `Temporada ${idx + 1}`}</h4>
                                    </div>
                                    <Badge className={`${temp.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'} border-0 text-[10px]`}>
                                      {temp.available ? 'Disponible' : 'Reservado'}
                                    </Badge>
                                  </div>
                                  <div className="flex flex-col sm:flex-row items-center gap-3">
                                    <div className="flex-1 bg-white rounded-lg p-3 text-center w-full">
                                      <div className="text-[10px] font-semibold text-gold uppercase tracking-wider mb-0.5">Ingreso</div>
                                      <div className="text-xl font-bold text-navy">{start?.toLocaleDateString('es-AR', { day: 'numeric' })}</div>
                                      <div className="text-xs text-navy-light capitalize">{start?.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}</div>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                      <div className="text-gold font-bold text-xs">{diff}d</div>
                                      <svg className="w-4 h-4 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                    </div>
                                    <div className="flex-1 bg-white rounded-lg p-3 text-center w-full">
                                      <div className="text-[10px] font-semibold text-gold uppercase tracking-wider mb-0.5">Egreso</div>
                                      <div className="text-xl font-bold text-navy">{end?.toLocaleDateString('es-AR', { day: 'numeric' })}</div>
                                      <div className="text-xs text-navy-light capitalize">{end?.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}</div>
                                    </div>
                                  </div>
                                  {temp.price && (
                                    <div className="mt-2 text-center">
                                      <span className="text-gold font-bold text-sm">{formatTempPrice(temp.price, temp.currency)}</span>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            <p className="text-[10px] text-navy-light/60 text-center pt-2">Consultá por disponibilidad y precios según temporada</p>
                          </div>
                        ) : property.tempStart && property.tempEnd ? (
                          <AvailabilityCalendar tempStart={property.tempStart} tempEnd={property.tempEnd} />
                        ) : null}
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="font-bold text-navy text-lg mb-3 flex items-center gap-2">
                      <Info className="w-5 h-5 text-gold" />
                      Descripción
                    </h3>
                    <div className="text-navy leading-relaxed whitespace-pre-line">
                      {description}
                    </div>
                  </div>

                  {/* Amenities / Extras */}
                  {extrasArray.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-bold text-navy text-lg mb-3">
                        Amenities y Características
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {extrasArray.map((extra) => {
                          const Icon = extraIcons[extra] || CheckCircle2
                          return (
                            <div
                              key={extra}
                              className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2"
                            >
                              <Icon className="w-4 h-4 text-gold flex-shrink-0" />
                              <span className="text-sm text-navy-dark">{extra}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Features list */}
                  <div className="mb-6">
                    <h3 className="font-bold text-navy text-lg mb-3 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-gold" />
                      Información Legal
                    </h3>
                    <div className="space-y-2">
                      {features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-navy text-sm">
                          <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Video */}
                  {property.video && (
                    <div className="mb-6">
                      <h3 className="font-bold text-navy text-lg mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gold">
                          <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
                          <rect x="2" y="6" width="14" height="12" rx="2" />
                        </svg>
                        Video de la Propiedad
                      </h3>
                      <div className="rounded-xl overflow-hidden border border-lavender/50">
                        <video
                          src={property.video}
                          controls
                          className="w-full"
                          preload="metadata"
                          controlsList="nodownload"
                        >
                          Tu navegador no soporta el elemento de video.
                        </video>
                      </div>
                    </div>
                  )}

                  {/* Map section */}
                  <div className="mb-6">
                    <h3 className="font-bold text-navy text-lg mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-gold" />
                      Ubicación
                    </h3>
                    <div className="rounded-xl overflow-hidden border border-lavender/50 h-48">
                      <MapComponent
                        latitude={property.latitude || -37.1067}
                        longitude={property.longitude || -56.8688}
                        zoom={15}
                        height="100%"
                        interactive={false}
                        showCircle={true}
                        circleRadius={400}
                        showMarker={false}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 px-1">
                      <p className="text-navy-light text-xs">{property.location}</p>
                      <a
                        href={`https://www.google.com/maps/search/${encodeURIComponent(property.location + ' Buenos Aires Argentina')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold text-xs font-medium hover:text-gold-dark transition-colors"
                      >
                        Ver en Google Maps →
                      </a>
                    </div>
                  </div>
                </div>

                {/* Right - Contact Sidebar */}
                <div className="lg:w-80 flex-shrink-0">
                  <div className="bg-surface rounded-2xl p-6 sticky top-4">
                    {/* Price / Temporada Prices */}
                    <div className="mb-4 pb-4 border-b border-lavender/50">
                      {property.operation === 'temporario' && property.temporadas && property.temporadas.length > 0 ? (
                        <div>
                          <div className="text-sm font-semibold text-navy-light mb-2">Temporario · {typeLabels[property.type] || property.type}</div>
                          <div className="space-y-2.5">
                            {property.temporadas.map((temp, idx) => {
                              const sDate = temp.startDate ? parseDate(temp.startDate) : null
                              const eDate = temp.endDate ? parseDate(temp.endDate) : null
                              const validDates = sDate && eDate && !isNaN(sDate.getTime()) && !isNaN(eDate.getTime())
                              const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
                              return (
                                <div key={idx} className={`flex flex-col px-3 py-2 rounded-lg ${temp.available ? 'bg-cream border border-gold/15' : 'bg-surface/50 border border-lavender/20 opacity-50'}`}>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${temp.available ? 'bg-green-500' : 'bg-red-400'}`} />
                                      <span className="text-sm text-navy truncate font-medium">{temp.name || `Temp. ${idx + 1}`}</span>
                                    </div>
                                    {temp.price ? (
                                      <span className="text-lg font-bold text-gold flex-shrink-0">{formatTempPrice(temp.price, temp.currency)}</span>
                                    ) : (
                                      <span className="text-sm text-navy-light flex-shrink-0">Consultar</span>
                                    )}
                                  </div>
                                  {validDates && (
                                    <span className="text-xs text-navy-light mt-0.5 ml-3">{fmtDate(sDate!)} → {fmtDate(eDate!)}</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-3xl font-bold text-navy">{property.price}</div>
                          <div className="text-navy-light text-sm mt-1">
                            {operationLabel[property.operation] || property.operation} · {typeLabels[property.type] || property.type}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Contact Buttons */}
                    <div className="space-y-3 mb-6">
                      <a
                        href={`https://wa.me/5492255612345?text=Hola! Me interesa la propiedad: ${property.title} - ${property.price}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Button className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold h-12">
                          <MessageCircle className="w-5 h-5 mr-2" />
                          Consultar por WhatsApp
                        </Button>
                      </a>

                      <a href="tel:+5492255612345" className="block">
                        <Button
                          variant="outline"
                          className="w-full border-navy text-navy hover:bg-navy hover:text-white font-semibold h-12"
                        >
                          <Phone className="w-5 h-5 mr-2" />
                          Llamar Ahora
                        </Button>
                      </a>
                    </div>

                    {/* Schedule Visit */}
                    <div className="bg-navy/5 rounded-xl p-4 mb-6">
                      <h4 className="font-semibold text-navy text-sm mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gold" />
                        Solicitar Visita
                      </h4>
                      <p className="text-navy-light text-xs mb-3">
                        Coordiná una visita con nuestro equipo sin compromiso.
                      </p>
                      <a
                        href={`https://wa.me/5492255612345?text=Hola! Quiero coordinar una visita para: ${property.title}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" className="w-full bg-gold hover:bg-gold-dark text-white font-semibold">
                          Agendar Visita
                        </Button>
                      </a>
                    </div>

                    {/* Agent Info */}
                    <div className="flex items-center gap-3 p-3 bg-cream rounded-xl">
                      <div className="w-12 h-12 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                        <span className="text-gold font-bold text-sm">FZ</span>
                      </div>
                      <div>
                        <div className="font-semibold text-navy text-sm">Florencia Zacaría</div>
                        <div className="text-lavender-light text-xs">Martillera Matriculada</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Fullscreen Image Viewer */}
      <AnimatePresence>
        {open && fullscreenOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-navy-dark/95 flex items-center justify-center"
            onClick={() => setFullscreenOpen(false)}
          >
            {/* Close */}
            <button
              onClick={() => setFullscreenOpen(false)}
              className="absolute top-4 right-4 z-10 w-12 h-12 bg-lavender/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-cream/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Image counter */}
            <div className="absolute top-4 left-4 bg-lavender/20 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium">
              {currentImage + 1} / {galleryImages.length}
            </div>

            {/* Main Image */}
            <motion.img
              key={currentImage}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={galleryImages[currentImage]}
              alt={property.title}
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Navigation Arrows */}
            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevFullscreenImage() }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-lavender/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-cream/20 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextFullscreenImage() }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-lavender/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-cream/20 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Thumbnail strip */}
            {galleryImages.length > 1 && (
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-navy-dark/60 backdrop-blur-sm rounded-xl p-2 max-w-[90vw] overflow-x-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      i === currentImage ? 'border-gold opacity-100' : 'border-transparent opacity-50 hover:opacity-75'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  )
}
