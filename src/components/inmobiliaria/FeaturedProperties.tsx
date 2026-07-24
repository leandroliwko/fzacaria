'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bed,
  Bath,
  Maximize,
  MapPin,
  Heart,
  Eye,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  Share2,
  Building,
  Home,
  TreePine,
  Warehouse,
  LandPlot,
  Store,
  Briefcase,
  Castle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import dynamic from 'next/dynamic'
const PropertyDetail = dynamic(() => import('./PropertyDetail'), { ssr: false })
import { resolveImageUrl } from '@/lib/imageUrl'
import PropertyLabel from './PropertyLabel'

interface Temporada {
  id: string
  name: string
  startDate: string
  endDate: string
  price: string
  currency: string
  available: boolean
}

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

const operationFilters = [
  { value: 'todos', label: 'Todos' },
  { value: 'venta', label: 'Venta' },
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'temporario', label: 'Temporario' },
]

const typeFilters = [
  { value: 'todos', label: 'Todos' },
  { value: 'casa', label: 'Casas' },
  { value: 'departamento', label: 'Deptos' },
  { value: 'chalet', label: 'Chalets' },
  { value: 'ph', label: 'PH' },
  { value: 'lote', label: 'Lotes' },
  { value: 'local', label: 'Locales' },
  { value: 'galpon', label: 'Galpones' },
  { value: 'campo', label: 'Campos' },
  { value: 'oficina', label: 'Oficinas' },
  { value: 'quinta', label: 'Quintas' },
  { value: 'hotel', label: 'Hoteles' },
]

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

const defaultImage = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80'

// Safely parse a date that may be a full ISO string or a date-only string
function parseDate(dateStr: string): Date {
  if (dateStr.includes('T')) {
    return new Date(dateStr)
  }
  return new Date(dateStr + 'T00:00:00')
}

// Get currency symbol for display
function currencySymbol(currency: string): string {
  return currency === 'ARS' ? '$' : 'U$S'
}

// Format price with currency symbol
function formatTempPrice(price: string, currency: string): string {
  if (!price) return ''
  // If price already has a currency prefix, return as-is
  if (price.startsWith('U$S') || price.startsWith('$')) return price
  return `${currencySymbol(currency)} ${price}`
}

export default function FeaturedProperties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [operationFilter, setOperationFilter] = useState('todos')
  const [typeFilter, setTypeFilter] = useState('todos')
  const [showAll, setShowAll] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch('/api/properties')
      if (res.ok) {
        const data = await res.json()
        setProperties(data)
      }
    } catch {
      console.error('Error al cargar propiedades')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  // Listen for category clicks from PropertyCategories component
  useEffect(() => {
    const handleFilterByType = (e: Event) => {
      const customEvent = e as CustomEvent
      setTypeFilter(customEvent.detail)
      setShowAll(false)
    }
    window.addEventListener('filter-by-type', handleFilterByType)
    return () => window.removeEventListener('filter-by-type', handleFilterByType)
  }, [])

  // Respect the order returned by the backend (which mirrors the admin panel
  // manual ordering via drag-and-drop). Only filter, do NOT re-sort client-side.
  const filtered = properties.filter((p) => {
    const matchOp = operationFilter === 'todos' || p.operation === operationFilter
    const matchType = typeFilter === 'todos' || p.type === typeFilter
    return matchOp && matchType
  })

  const displayed = showAll ? filtered : filtered.slice(0, 6)

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const openDetail = (property: Property) => {
    setSelectedProperty(property)
    setDetailOpen(true)
  }

  const closeDetail = () => {
    setDetailOpen(false)
    setTimeout(() => setSelectedProperty(null), 300)
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

  const getExtras = (extras: string): string[] => {
    if (!extras) return []
    return extras.split(',').map(e => e.trim()).filter(Boolean)
  }

  return (
    <section id="propiedades" className="py-20 lg:py-28 bg-surface lavender-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-gold font-semibold text-sm tracking-[0.2em] uppercase">
            Nuestro Portfolio
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-3 mb-4">
            Propiedades Destacadas
          </h2>
          <div className="section-divider mb-6" />
          <p className="text-navy max-w-2xl mx-auto text-lg">
            Descubrí las mejores oportunidades en venta y alquiler. Propiedades
            seleccionadas con el más alto estándar de calidad.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-10"
        >
          {/* Operation Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {operationFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setOperationFilter(filter.value)
                  setShowAll(false)
                }}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  operationFilter === filter.value
                    ? 'bg-navy text-white shadow-lg shadow-navy/20'
                    : 'bg-cream text-navy hover:bg-soft border border-lavender/50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex flex-wrap justify-center gap-2">
            {typeFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setTypeFilter(filter.value)
                  setShowAll(false)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  typeFilter === filter.value
                    ? 'bg-gold text-white shadow-lg shadow-gold/20'
                    : 'bg-cream text-navy-light hover:bg-gold/10 border border-lavender/50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-gold animate-spin mb-4" />
            <p className="text-navy-light">Cargando propiedades...</p>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Home className="w-16 h-16 text-lavender mx-auto mb-4" />
            <p className="text-navy-light text-lg">No se encontraron propiedades</p>
            <p className="text-lavender-light text-sm mt-2">Probá con otros filtros o volvé más tarde</p>
          </motion.div>
        ) : (
          /* Properties Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <AnimatePresence mode="popLayout">
              {displayed.map((property, i) => {
                const TypeIcon = typeIcons[property.type] || Home
                const extras = getExtras(property.extras)
                return (
                  <motion.div
                    key={property.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  >
                    <Card
                      className="property-card overflow-hidden border-0 shadow-md group cursor-pointer"
                      onClick={() => openDetail(property)}
                    >
                      {/* Image */}
                      <div className="relative h-56 overflow-hidden">
                        <img
                          src={resolveImageUrl(property.image) || defaultImage}
                          alt={property.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        <PropertyLabel label={property.label} size="md" />

                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-2 max-w-[calc(100%-50px)]">
                          <Badge
                            className={`${operationBadgeColor[property.operation] || 'bg-soft text-white'} text-xs font-semibold px-3 py-1`}
                          >
                            {operationLabel[property.operation] || property.operation}
                          </Badge>
                          {property.featured && (
                            <Badge className="bg-gold text-white text-xs font-semibold px-3 py-1">
                              Destacada
                            </Badge>
                          )}
                        </div>

                        {/* Favorite */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(property.id)
                          }}
                          className="absolute top-3 right-3 w-9 h-9 bg-cream/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-cream transition-colors shadow-sm"
                        >
                          <Heart
                            className={`w-4 h-4 transition-colors ${
                              favorites.includes(property.id)
                                ? 'fill-red-500 text-red-500'
                                : 'text-navy-light'
                            }`}
                          />
                        </button>

                        {/* Price / Temporadas */}
                        <div className="absolute bottom-3 left-3 right-12">
                          {property.operation === 'temporario' && property.temporadas && property.temporadas.length > 0 ? (
                            <div className="space-y-1.5">
                              {property.temporadas.slice(0, 2).map((temp, idx) => {
                                const startDate = temp.startDate ? parseDate(temp.startDate) : null
                                const endDate = temp.endDate ? parseDate(temp.endDate) : null
                                const validDates = startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())
                                const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
                                return (
                                  <div key={idx} className="flex flex-col">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        {temp.available ? (
                                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                                        ) : (
                                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                        )}
                                        <span className="text-white text-[11px] font-semibold drop-shadow-md truncate">
                                          {temp.name || `Temporada ${idx + 1}`}
                                        </span>
                                      </div>
                                      {temp.price && (
                                        <span className="text-white text-[11px] font-bold drop-shadow-md flex-shrink-0">
                                          {formatTempPrice(temp.price, temp.currency)}
                                        </span>
                                      )}
                                    </div>
                                    {validDates && (
                                      <span className="text-white/80 text-[10px] drop-shadow-md ml-3">
                                        {fmtDate(startDate!)} → {fmtDate(endDate!)}
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                              {property.temporadas.length > 2 && (
                                <span className="text-white/70 text-[10px] drop-shadow-md">+{property.temporadas.length - 2} más</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-white font-bold text-xl drop-shadow-lg">
                              {property.price}
                            </span>
                          )}
                        </div>

                        {/* Type icon */}
                        <div className="absolute bottom-3 right-3 w-8 h-8 bg-cream/90 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <TypeIcon className="w-4 h-4 text-navy" />
                        </div>
                      </div>

                      {/* Content */}
                      <CardContent className="p-5">
                        <h3 className="font-bold text-navy text-lg mb-2 group-hover:text-gold-dark transition-colors">
                          {property.title}
                        </h3>

                        <div className="flex items-center gap-1 text-navy-light text-sm mb-4">
                          <MapPin className="w-3.5 h-3.5" />
                          {property.location}
                        </div>

                        {/* Features */}
                        {(property.bedrooms > 0 || property.bathrooms > 0) && (
                          <div className="flex items-center gap-4 mb-4 text-navy text-sm">
                            {property.bedrooms > 0 && (
                              <div className="flex items-center gap-1">
                                <Bed className="w-4 h-4" />
                                <span>{property.bedrooms}</span>
                              </div>
                            )}
                            {property.bathrooms > 0 && (
                              <div className="flex items-center gap-1">
                                <Bath className="w-4 h-4" />
                                <span>{property.bathrooms}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Maximize className="w-4 h-4" />
                              <span>{property.area.toLocaleString()} m²</span>
                            </div>
                          </div>
                        )}

                        {property.area > 0 && property.bedrooms === 0 && (
                          <div className="flex items-center gap-4 mb-4 text-navy text-sm">
                            <div className="flex items-center gap-1">
                              <Maximize className="w-4 h-4" />
                              <span>{property.area.toLocaleString()} m²</span>
                            </div>
                          </div>
                        )}

                        {/* Temporada segments on card body */}
                        {property.operation === 'temporario' && property.temporadas && property.temporadas.length > 0 && (
                          <div className="space-y-1.5 mb-4">
                            {property.temporadas.map((temp, idx) => {
                              const start = temp.startDate ? parseDate(temp.startDate) : null
                              const end = temp.endDate ? parseDate(temp.endDate) : null
                              const isValid = start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())
                              const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
                              return (
                                <div
                                  key={idx}
                                  className={`px-3 py-2 rounded-lg text-xs ${
                                    temp.available
                                      ? 'bg-gradient-to-r from-teal-soft/60 to-teal-pale/30 border border-gold/20'
                                      : 'bg-surface/50 border border-lavender/20 opacity-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${temp.available ? 'bg-green-500' : 'bg-red-400'}`} />
                                      <span className="font-semibold text-navy truncate">{temp.name || `Temporada ${idx + 1}`}</span>
                                    </div>
                                    {temp.price && (
                                      <span className="font-bold text-gold flex-shrink-0">{formatTempPrice(temp.price, temp.currency)}</span>
                                    )}
                                  </div>
                                  {isValid && (
                                    <div className="text-navy-light mt-0.5 ml-4">{fmtDate(start!)} → {fmtDate(end!)}</div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Extras */}
                        {extras.length > 0 && property.operation !== 'temporario' && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {extras.slice(0, 4).map((extra) => (
                              <span
                                key={extra}
                                className="text-xs bg-soft text-navy px-2 py-1 rounded-md"
                              >
                                {extra}
                              </span>
                            ))}
                            {extras.length > 4 && (
                              <span className="text-xs bg-soft text-navy-light px-2 py-1 rounded-md">
                                +{extras.length - 4} más
                              </span>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <a
                            href={`https://wa.me/542254449764?text=Hola! Me interesa la propiedad: ${property.title}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              className="w-full bg-gold hover:bg-gold-dark text-white"
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              WhatsApp
                            </Button>
                          </a>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-navy text-navy hover:bg-navy hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDetail(property)
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver Detalle
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-lavender text-navy-light hover:bg-gold/10 hover:text-gold hover:border-gold/50 px-2"
                            title="Compartir"
                            onClick={(e) => {
                              e.stopPropagation()
                              const url = `${window.location.origin}/propiedad/${property.id}`
                              if (navigator.share) {
                                navigator.share({
                                  title: property.title,
                                  text: `${property.title} - ${property.location}`,
                                  url,
                                }).catch(() => {})
                              } else {
                                navigator.clipboard.writeText(url).then(() => {
                                  const toast = document.createElement('div')
                                  toast.textContent = 'Link copiado!'
                                  toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0a1628;color:#c6a962;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.3);'
                                  document.body.appendChild(toast)
                                  setTimeout(() => toast.remove(), 2500)
                                })
                              }
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Show More */}
        {!loading && filtered.length > 6 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-10"
          >
            <Button
              onClick={() => setShowAll(!showAll)}
              variant="outline"
              size="lg"
              className="border-navy text-navy hover:bg-navy hover:text-white px-8"
            >
              {showAll ? 'Ver Menos' : `Ver Todas (${filtered.length})`}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Property Detail Modal */}
      <PropertyDetail
        property={selectedProperty}
        open={detailOpen}
        onClose={closeDetail}
      />
    </section>
  )
}
