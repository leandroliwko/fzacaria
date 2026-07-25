'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Building2, Plus, Pencil, Trash2, Star, Search, X,
  Image as ImageIcon, MapPin, Bed, Bath, Maximize, Home,
  Calendar, ExternalLink, Loader2, AlertTriangle, CheckCircle2,
  XCircle, Link2, ShoppingCart, RefreshCw,
  LayoutGrid, Grid3x3, List, GripVertical, ArrowUp, ArrowDown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { resolveImageUrl } from '@/lib/imageUrl'
import PropertyLabel from '@/components/inmobiliaria/PropertyLabel'

interface TemporadaItem {
  id?: string
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
  code?: string
  location: string
  bedrooms: number
  bathrooms: number
  area: number
  image: string
  images: string
  video: string
  description: string
  extras: string
  features: string
  featured: boolean
  active: boolean
  label?: string | null
  order?: number
  latitude: number
  longitude: number
  createdAt: string
  updatedAt: string
  temporadas?: TemporadaItem[]
  createdBy?: { id: string; name: string; email: string } | null
}

type ViewMode = 'large' | 'small' | 'list'

const propertyTypeLabels: Record<string, string> = {
  casa: 'Casa', departamento: 'Depto', chalet: 'Chalet', ph: 'PH',
  lote: 'Lote', local: 'Local', campo: 'Campo', oficina: 'Oficina',
  quinta: 'Quinta', hotel: 'Hotel',
}

const operationTypes = [
  { value: 'venta', label: 'Venta' },
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'temporario', label: 'Temporario' },
]

const typeFilterOptions = [
  { value: 'casa', label: 'Casas' }, { value: 'departamento', label: 'Deptos' },
  { value: 'chalet', label: 'Chalets' }, { value: 'ph', label: 'PH' },
  { value: 'lote', label: 'Lotes' }, { value: 'local', label: 'Locales' },
  { value: 'galpon', label: 'Galpones' }, { value: 'campo', label: 'Campos' },
  { value: 'oficina', label: 'Oficinas' }, { value: 'quinta', label: 'Quintas' },
  { value: 'hotel', label: 'Hoteles' },
]

export default function AdminPropiedades() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [operationFilter, setOperationFilter] = useState('todos')
  const [typeFilter, setTypeFilter] = useState('todos')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [mlConnected, setMlConnected] = useState(false)
  const [mlConfigured, setMlConfigured] = useState(false)
  const [mlAuthUrl, setMlAuthUrl] = useState('')
  const [mlMessage, setMlMessage] = useState('')
  const [mlListings, setMlListings] = useState<Record<string, any>>({})
  const [zpListings, setZpListings] = useState<Record<string, any>>({})
  const [cbListings, setCbListings] = useState<Record<string, any>>({})
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('large')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const dragCounter = useRef(0)

  const fetchProperties = useCallback(async () => {
    try {
      // cache: 'no-store' prevents Next.js fetch cache so we always get fresh data
      const res = await fetch('/api/properties', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setProperties(data)
      }
    } catch {
      toast.error('Error al cargar propiedades')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMLStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/mercadolibre/auth', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setMlConfigured(data.configured || false)
        setMlConnected(data.connected || false)
        if (data.authUrl) setMlAuthUrl(data.authUrl)
        if (data.message) setMlMessage(data.message)
      }
    } catch {}

    // Fetch ML listings (only if configured)
    try {
      const res = await fetch('/api/mercadolibre/status', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const map: Record<string, any> = {}
        if (data.listings) {
          data.listings.forEach((l: any) => { map[l.propertyId] = l })
        }
        setMlListings(map)
      }
    } catch {}

    // Fetch ZonaProp listings
    try {
      const res = await fetch('/api/zonaprop/toggle', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const map: Record<string, any> = {}
        if (data.listings) {
          data.listings.forEach((l: any) => { map[l.propertyId] = l })
        }
        setZpListings(map)
      }
    } catch {}

    // Fetch Cabaprop listings
    try {
      const res = await fetch('/api/cabaprop/toggle', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const map: Record<string, any> = {}
        if (data.listings) {
          data.listings.forEach((l: any) => { map[l.propertyId] = l })
        }
        setCbListings(map)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchProperties()
    fetchMLStatus()
  }, [fetchProperties, fetchMLStatus])

  // Refetch when window regains focus (user switches back to the tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchProperties()
      fetchMLStatus()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchProperties, fetchMLStatus])

  // Check for ML callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('ml_connected')) {
      toast.success('¡Mercado Libre conectado!')
      window.history.replaceState({}, '', '/admin/propiedades')
      fetchMLStatus()
    }
    if (params.get('ml_error')) {
      toast.error(`Error ML: ${params.get('ml_error')}`)
      window.history.replaceState({}, '', '/admin/propiedades')
    }
  }, [fetchMLStatus])

  async function handleMLPublish(propertyId: string) {
    setPublishingId(propertyId)
    try {
      const res = await fetch('/api/mercadolibre/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('¡Publicada en Mercado Libre!')
        fetchMLStatus()
      } else if (data.needsAuth) {
        toast.error('Conectá tu cuenta de Mercado Libre primero')
        if (mlAuthUrl) window.open(mlAuthUrl, '_blank')
      } else {
        let errMsg = data.details || data.error || 'Error al publicar en ML'
        // Provide helpful message for quota errors
        if (errMsg.includes('Not available quota') || errMsg.includes('quota')) {
          errMsg = 'Sin quota disponible en Mercado Libre. Andá a Mercado Libre > Diagnosticar para verificar el estado de tu cuenta. Puede que necesites vincular MercadoPago o que tu quota mensual gratuita esté agotada.'
        }
        toast.error(errMsg, { duration: 12000 })
      }
    } catch (err: any) {
      toast.error('Error de conexión: ' + (err.message || ''), { duration: 8000 })
    } finally {
      setPublishingId(null)
    }
  }

  async function handleMLUnpublish(propertyId: string) {
    try {
      const res = await fetch('/api/mercadolibre/publish', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      })
      if (res.ok) {
        toast.success('Publicación eliminada de ML')
        fetchMLStatus()
      } else {
        toast.error('Error al eliminar de ML')
      }
    } catch {
      toast.error('Error de conexión')
    }
  }

  async function handleMLSync(propertyId: string) {
    setSyncingId(propertyId)
    try {
      const res = await fetch('/api/mercadolibre/publish', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.descWarning) {
          toast.success('Datos actualizados en ML (la descripción tuvo un error, pero el resto se actualizó)', { duration: 8000 })
        } else {
          toast.success('¡Descripción y datos sincronizados con Mercado Libre!')
        }
        fetchMLStatus()
      } else if (data.needsAuth) {
        toast.error('Conectá tu cuenta de Mercado Libre primero')
        if (mlAuthUrl) window.open(mlAuthUrl, '_blank')
      } else {
        toast.error(data.error || data.details || 'Error al sincronizar con ML', { duration: 8000 })
      }
    } catch (err: any) {
      toast.error('Error de conexión: ' + (err.message || ''))
    } finally {
      setSyncingId(null)
    }
  }

  async function handleDelete() {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/properties/${deletingId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Propiedad eliminada')
        // Refresh server-side cache, then refetch client-side data
        router.refresh()
        fetchProperties()
      } else {
        throw new Error()
      }
    } catch {
      toast.error('Error al eliminar propiedad')
    } finally {
      setDeleteDialogOpen(false)
      setDeletingId(null)
    }
  }

  async function toggleField(id: string, field: 'active' | 'featured', value: boolean) {
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (res.ok) {
        setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
        toast.success(`Propiedad ${value ? 'activada' : 'desactivada'}`)
      }
    } catch {
      toast.error('Error al actualizar')
    }
  }

  const filtered = properties.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase())
    const matchOp = operationFilter === 'todos' || p.operation === operationFilter
    const matchType = typeFilter === 'todos' || p.type === typeFilter
    return matchSearch && matchOp && matchType
  })

  // ─── Drag-and-drop reordering ───
  // Reorder the in-memory `properties` array (move draggingId to where dragOverId is)
  function applyReorder(dragId: string, overId: string) {
    if (dragId === overId) return
    setProperties((prev) => {
      const next = [...prev]
      const fromIdx = next.findIndex((p) => p.id === dragId)
      const toIdx = next.findIndex((p) => p.id === overId)
      if (fromIdx < 0 || toIdx < 0) return prev
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
  }

  // Persist new order to backend (assigns 0,1,2,... based on current array position)
  async function persistOrder() {
    setSavingOrder(true)
    try {
      const items = properties.map((p, idx) => ({ id: p.id, order: idx }))
      const res = await fetch('/api/properties/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Error al guardar el orden')
      }
    } catch {
      toast.error('Error de conexión al guardar el orden')
    } finally {
      setSavingOrder(false)
    }
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    // Necesario para que Firefox dispare dragend
    e.dataTransfer.setData('text/plain', id)
  }

  function handleDragEnter(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (draggingId && draggingId !== id) {
      setDragOverId(id)
      applyReorder(draggingId, id)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDragLeave() {
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setDragOverId(null)
    }
  }

  function handleDragEnterContainer(e: React.DragEvent) {
    dragCounter.current += 1
  }

  async function handleDragEnd() {
    if (draggingId) {
      setDraggingId(null)
      setDragOverId(null)
      dragCounter.current = 0
      // Persistir el nuevo orden en backend
      await persistOrder()
    }
  }

  // Mover manualmente con flechas (accesibilidad / fallback al drag)
  async function moveProperty(id: string, direction: 'up' | 'down') {
    setProperties((prev) => {
      const next = [...prev]
      const idx = next.findIndex((p) => p.id === id)
      if (idx < 0) return prev
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= next.length) return prev
      ;[next[idx], next[targetIdx]] = [next[targetIdx], next[idx]]
      return next
    })
    // Pequeño delay para que el state se asiente antes de persistir
    setTimeout(() => { persistOrder() }, 50)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy">Propiedades</h2>
          <p className="text-navy-light mt-1">
            {properties.length} propiedades en total
            {savingOrder && <span className="ml-2 text-xs text-gold">· guardando orden…</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* View mode switcher */}
          <div className="flex items-center gap-1 bg-cream border border-lavender/40 rounded-lg p-1">
            <button
              onClick={() => setViewMode('large')}
              title="Vista grande"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'large'
                  ? 'bg-navy text-white shadow'
                  : 'text-navy-light hover:bg-lavender/20 hover:text-navy'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('small')}
              title="Vista pequeña"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'small'
                  ? 'bg-navy text-white shadow'
                  : 'text-navy-light hover:bg-lavender/20 hover:text-navy'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Vista en lista"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-navy text-white shadow'
                  : 'text-navy-light hover:bg-lavender/20 hover:text-navy'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => router.push('/admin/propiedades/nueva')} className="bg-gold hover:bg-gold-dark text-white shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Propiedad
          </Button>
        </div>
      </div>

      {/* Drag-and-drop hint */}
      <div className="text-xs text-navy-light bg-gold/5 border border-gold/20 rounded-md px-3 py-2 flex items-center gap-2">
        <GripVertical className="w-3.5 h-3.5 text-gold" />
        <span>
          Arrastrá las propiedades para reordenarlas. El orden se guarda automáticamente al soltar.
          También podés usar las flechas <ArrowUp className="w-3 h-3 inline" /> / <ArrowDown className="w-3 h-3 inline" /> en cada tarjeta.
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lavender-light" />
        <Input
          placeholder="Buscar por título, ubicación o tipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 border-navy/20 focus:border-gold"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-lavender-light" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {[{ value: 'todos', label: 'Todos' }, ...operationTypes].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setOperationFilter(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                operationFilter === filter.value
                  ? 'bg-navy text-white shadow-md shadow-navy/20'
                  : 'bg-cream text-navy-light hover:bg-soft border border-lavender/40'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter('todos')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              typeFilter === 'todos'
                ? 'bg-gold text-white shadow-md shadow-gold/20'
                : 'bg-cream text-navy-light hover:bg-gold/10 border border-lavender/40'
            }`}
          >
            Todos
          </button>
          {typeFilterOptions.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                typeFilter === t.value
                  ? 'bg-gold text-white shadow-md shadow-gold/20'
                  : 'bg-cream text-navy-light hover:bg-gold/10 border border-lavender/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Properties Grid — multi-vista con drag-and-drop */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-lavender mx-auto mb-3" />
            <p className="text-navy-light">No se encontraron propiedades</p>
          </CardContent>
        </Card>
      ) : viewMode === 'small' ? (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnterContainer}
          onDragLeave={handleDragLeave}
        >
          {filtered.map((property, idx) => (
            <Card
              key={property.id}
              draggable
              onDragStart={(e) => handleDragStart(e, property.id)}
              onDragEnter={(e) => handleDragEnter(e, property.id)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              className={`overflow-hidden hover:shadow-md transition-shadow group relative cursor-grab active:cursor-grabbing ${
                draggingId === property.id ? 'opacity-40 ring-2 ring-gold' : ''
              } ${dragOverId === property.id ? 'ring-2 ring-navy' : ''}`}
            >
              <div className="relative h-28 bg-soft overflow-hidden">
                {property.image ? (
                  <img
                    src={resolveImageUrl(property.image)}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-lavender" />
                  </div>
                )}
                <PropertyLabel label={property.label} size="sm" />
                <div className="absolute top-1 left-1 flex gap-0.5">
                  <Badge className="bg-navy text-white border-0 text-[8px] px-1 py-0">
                    {propertyTypeLabels[property.type] || property.type}
                  </Badge>
                </div>
                {property.featured && (
                  <div className="absolute top-1 right-1">
                    <Star className="w-3 h-3 text-gold fill-gold" />
                  </div>
                )}
                {!property.active && (
                  <div className="absolute inset-0 bg-navy-dark/60 flex items-center justify-center">
                    <Badge className="bg-red-500 text-white border-0 text-[8px]">Inactiva</Badge>
                  </div>
                )}
                <div className="absolute bottom-1 right-1 z-30 flex gap-0.5 bg-white/80 backdrop-blur rounded p-0.5">
                  <button
                    onClick={() => moveProperty(property.id, 'up')}
                    disabled={idx === 0}
                    title="Subir"
                    className="p-0.5 rounded hover:bg-lavender/20 disabled:opacity-30"
                  >
                    <ArrowUp className="w-2.5 h-2.5 text-navy" />
                  </button>
                  <button
                    onClick={() => moveProperty(property.id, 'down')}
                    disabled={idx === filtered.length - 1}
                    title="Bajar"
                    className="p-0.5 rounded hover:bg-lavender/20 disabled:opacity-30"
                  >
                    <ArrowDown className="w-2.5 h-2.5 text-navy" />
                  </button>
                </div>
              </div>
              <CardContent className="p-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded">{property.code || '—'}</span>
                </div>
                <h3 className="font-semibold text-navy text-xs truncate">{property.title}</h3>
                <div className="flex items-center gap-0.5 mt-0.5 text-navy-light text-[10px]">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{property.location}</span>
                </div>
                <p className="text-sm font-bold text-gold mt-1 truncate">{property.price}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-lavender-light">
                  {property.bedrooms > 0 && (
                    <span className="flex items-center gap-0.5"><Bed className="w-2.5 h-2.5" />{property.bedrooms}</span>
                  )}
                  {property.bathrooms > 0 && (
                    <span className="flex items-center gap-0.5"><Bath className="w-2.5 h-2.5" />{property.bathrooms}</span>
                  )}
                  {property.area > 0 && (
                    <span className="flex items-center gap-0.5"><Maximize className="w-2.5 h-2.5" />{property.area}m²</span>
                  )}
                </div>
                <div className="mt-2 pt-1.5 border-t border-lavender/30 flex items-center gap-1">
                  <button
                    onClick={() => router.push(`/admin/propiedades/${property.id}/editar`)}
                    title="Editar"
                    className="p-1 rounded hover:bg-lavender/20 text-navy"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      setDeletingId(property.id)
                      setDeleteDialogOpen(true)
                    }}
                    title="Eliminar"
                    className="p-1 rounded hover:bg-red-50 text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <div className="ml-auto flex items-center gap-1">
                    <Switch
                      checked={property.active}
                      onCheckedChange={(v) => toggleField(property.id, 'active', v)}
                      className="data-[state=checked]:bg-gold scale-75"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <div
          className="flex flex-col gap-2"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnterContainer}
          onDragLeave={handleDragLeave}
        >
          {filtered.map((property, idx) => (
            <Card
              key={property.id}
              draggable
              onDragStart={(e) => handleDragStart(e, property.id)}
              onDragEnter={(e) => handleDragEnter(e, property.id)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              className={`overflow-hidden hover:shadow-md transition-shadow group relative cursor-grab active:cursor-grabbing ${
                draggingId === property.id ? 'opacity-40 ring-2 ring-gold' : ''
              } ${dragOverId === property.id ? 'ring-2 ring-navy' : ''}`}
            >
              <div className="flex">
                <div className="flex flex-col items-center justify-center bg-lavender/10 px-1 py-2 cursor-grab active:cursor-grabbing gap-0.5">
                  <button
                    onClick={() => moveProperty(property.id, 'up')}
                    disabled={idx === 0}
                    title="Subir"
                    className="p-0.5 rounded hover:bg-lavender/20 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3 h-3 text-navy" />
                  </button>
                  <GripVertical className="w-3 h-3 text-navy-light" />
                  <button
                    onClick={() => moveProperty(property.id, 'down')}
                    disabled={idx === filtered.length - 1}
                    title="Bajar"
                    className="p-0.5 rounded hover:bg-lavender/20 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3 h-3 text-navy" />
                  </button>
                </div>
                <div className="relative w-24 h-24 bg-soft flex-shrink-0 overflow-hidden">
                  {property.image ? (
                    <img
                      src={resolveImageUrl(property.image)}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-lavender" />
                    </div>
                  )}
                  <PropertyLabel label={property.label} size="sm" />
                  {!property.active && (
                    <div className="absolute inset-0 bg-navy-dark/60 flex items-center justify-center">
                      <Badge className="bg-red-500 text-white border-0 text-[8px]">Inactiva</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="flex-1 p-3 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded">{property.code || '—'}</span>
                        <h3 className="font-semibold text-navy text-sm truncate">{property.title}</h3>
                        <Badge className="bg-navy text-white border-0 text-[9px]">
                          {propertyTypeLabels[property.type] || property.type}
                        </Badge>
                        <Badge className={`${
                          property.operation === 'venta' ? 'bg-gold' :
                          property.operation === 'alquiler' ? 'bg-navy-light' : 'bg-teal-pale'
                        } text-white border-0 text-[9px]`}>
                          {operationTypes.find((t) => t.value === property.operation)?.label || property.operation}
                        </Badge>
                        {property.featured && (
                          <Star className="w-3.5 h-3.5 text-gold fill-gold" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-navy-light text-xs">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{property.location}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-lavender-light">
                        {property.bedrooms > 0 && (
                          <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{property.bedrooms}</span>
                        )}
                        {property.bathrooms > 0 && (
                          <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{property.bathrooms}</span>
                        )}
                        {property.area > 0 && (
                          <span className="flex items-center gap-1"><Maximize className="w-3 h-3" />{property.area}m²</span>
                        )}
                        {property.createdBy && (
                          <span className="text-[10px] text-lavender-light/80">por {property.createdBy.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <p className="text-base font-bold text-gold">{property.price}</p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/admin/propiedades/${property.id}/editar`)}
                          title="Editar"
                          className="p-1.5 rounded hover:bg-lavender/20 text-navy"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingId(property.id)
                            setDeleteDialogOpen(true)
                          }}
                          title="Eliminar"
                          className="p-1.5 rounded hover:bg-red-50 text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Switch
                          checked={property.active}
                          onCheckedChange={(v) => toggleField(property.id, 'active', v)}
                          className="data-[state=checked]:bg-gold scale-75"
                        />
                        <span className="text-[10px] text-navy-light">Activa</span>
                        <Switch
                          checked={property.featured}
                          onCheckedChange={(v) => toggleField(property.id, 'featured', v)}
                          className="data-[state=checked]:bg-gold scale-75 ml-1"
                        />
                        <span className="text-[10px] text-navy-light">Dest.</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnterContainer}
          onDragLeave={handleDragLeave}
        >
          {filtered.map((property, idx) => (
            <Card
              key={property.id}
              draggable
              onDragStart={(e) => handleDragStart(e, property.id)}
              onDragEnter={(e) => handleDragEnter(e, property.id)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              className={`overflow-hidden hover:shadow-lg transition-shadow group relative ${
                draggingId === property.id ? 'opacity-40 ring-2 ring-gold' : ''
              } ${dragOverId === property.id ? 'ring-2 ring-navy' : ''}`}
            >
              {/* Drag handle overlay */}
              <div className="absolute top-2 right-2 z-30 flex flex-col gap-1 bg-white/80 backdrop-blur rounded p-0.5 shadow-sm">
                <button
                  onClick={() => moveProperty(property.id, 'up')}
                  disabled={idx === 0}
                  title="Subir"
                  className="p-1 rounded hover:bg-lavender/20 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowUp className="w-3 h-3 text-navy" />
                </button>
                <div className="cursor-grab active:cursor-grabbing flex justify-center" title="Arrastrá para reordenar">
                  <GripVertical className="w-3 h-3 text-navy-light" />
                </div>
                <button
                  onClick={() => moveProperty(property.id, 'down')}
                  disabled={idx === filtered.length - 1}
                  title="Bajar"
                  className="p-1 rounded hover:bg-lavender/20 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowDown className="w-3 h-3 text-navy" />
                </button>
              </div>
              {/* Image */}
              <div className="relative h-48 bg-soft overflow-hidden">
                {property.image ? (
                  <img
                    src={resolveImageUrl(property.image)}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-lavender" />
                  </div>
                )}
                <PropertyLabel label={property.label} size="sm" />
                <div className="absolute top-2 left-2 flex gap-1">
                  <Badge className="bg-navy text-white border-0 text-[10px]">
                    {propertyTypeLabels[property.type] || property.type}
                  </Badge>
                  <Badge className={`${
                    property.operation === 'venta' ? 'bg-gold' :
                    property.operation === 'alquiler' ? 'bg-navy-light' : 'bg-teal-pale'
                  } text-white border-0 text-[10px]`}>
                    {operationTypes.find((t) => t.value === property.operation)?.label || property.operation}
                  </Badge>
                </div>
                {property.featured && (
                  <div className="absolute top-2 right-2">
                    <Star className="w-5 h-5 text-gold fill-gold" />
                  </div>
                )}
                {!property.active && (
                  <div className="absolute inset-0 bg-navy-dark/60 flex items-center justify-center">
                    <Badge className="bg-red-500 text-white border-0">Inactiva</Badge>
                  </div>
                )}
              </div>

              {/* Content */}
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gold bg-gold/10 px-2 py-0.5 rounded">{property.code || '—'}</span>
                  <h3 className="font-semibold text-navy truncate">{property.title}</h3>
                </div>
                <div className="flex items-center gap-1 mt-1 text-navy-light text-sm">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{property.location}</span>
                </div>
                {property.createdBy && (
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-lavender-light">
                    <div className="w-4 h-4 rounded-full bg-navy/10 flex items-center justify-center text-[8px] font-bold text-navy flex-shrink-0">
                      {property.createdBy.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">por {property.createdBy.name}</span>
                  </div>
                )}

                {/* Price / Temporada Prices */}
                {property.operation === 'temporario' && property.temporadas && property.temporadas.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {property.temporadas.map((temp, idx) => {
                      const prefix = temp.currency === 'ARS' ? '$' : 'U$S'
                      const priceDisplay = temp.price ? `${prefix} ${temp.price}` : 'Consultar'
                      const parseD = (s: string) => { const d = new Date(s.includes('T') ? s : s + 'T00:00:00'); return isNaN(d.getTime()) ? null : d }
                      const startD = temp.startDate ? parseD(temp.startDate) : null
                      const endD = temp.endDate ? parseD(temp.endDate) : null
                      const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
                      return (
                        <div key={idx} className="flex items-center justify-between gap-1 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${temp.available ? 'bg-green-500' : 'bg-red-400'}`} />
                            <span className="text-navy truncate font-medium">{temp.name || `Temp. ${idx + 1}`}</span>
                            {startD && endD && (
                              <span className="text-navy-light flex-shrink-0">{fmtDate(startD)} → {fmtDate(endD)}</span>
                            )}
                          </div>
                          <span className="text-gold font-bold flex-shrink-0">{priceDisplay}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-lg font-bold text-gold mt-2">{property.price}</p>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-lavender-light">
                  {property.bedrooms > 0 && (
                    <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{property.bedrooms}</span>
                  )}
                  {property.bathrooms > 0 && (
                    <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{property.bathrooms}</span>
                  )}
                  {property.area > 0 && (
                    <span className="flex items-center gap-1"><Maximize className="w-3 h-3" />{property.area}m²</span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-lavender/30 space-y-3">
                  {/* Row 1: Toggles (Activa / Destacada) — full width */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={property.active}
                        onCheckedChange={(v) => toggleField(property.id, 'active', v)}
                        className="data-[state=checked]:bg-gold"
                      />
                      <span className="text-xs text-navy-light">Activa</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={property.featured}
                        onCheckedChange={(v) => toggleField(property.id, 'featured', v)}
                        className="data-[state=checked]:bg-gold"
                      />
                      <span className="text-xs text-navy-light">Destacada</span>
                    </div>
                  </div>
                  {/* Row 2: Portal abbreviations (ZP / CB / ML) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wide text-lavender-light mr-1">Publicar:</span>
                    {/* ZonaProp button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (zpListings[property.id]) {
                          try {
                            await fetch('/api/zonaprop/toggle', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ propertyId: property.id }),
                            })
                            toast.success('Quitada del feed de ZonaProp')
                            fetchMLStatus()
                          } catch {
                            toast.error('Error al quitar de ZonaProp')
                          }
                        } else {
                          try {
                            const res = await fetch('/api/zonaprop/toggle', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ propertyId: property.id }),
                            })
                            if (res.ok) {
                              toast.success('Agregada al feed de ZonaProp')
                              fetchMLStatus()
                            } else {
                              toast.error('Error al agregar a ZonaProp')
                            }
                          } catch {
                            toast.error('Error de conexión')
                          }
                        }
                      }}
                      className={`h-9 w-9 ${zpListings[property.id] ? 'text-green-600 hover:bg-green-100' : 'text-lavender-light hover:bg-lavender/20 hover:text-navy-light'}`}
                      title={zpListings[property.id] ? 'Quitar de ZonaProp' : 'Agregar a ZonaProp feed'}
                    >
                      <span className="text-xs font-bold">ZP</span>
                    </Button>
                    {/* Cabaprop button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (cbListings[property.id]) {
                          try {
                            await fetch('/api/cabaprop/toggle', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ propertyId: property.id }),
                            })
                            toast.success('Eliminada de Cabaprop')
                            fetchMLStatus()
                          } catch {
                            toast.error('Error al quitar de Cabaprop')
                          }
                        } else {
                          try {
                            const res = await fetch('/api/cabaprop/toggle', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ propertyId: property.id }),
                            })
                            if (res.ok) {
                              const data = await res.json()
                              if (data.cbStatus === 'error') {
                                toast.error(data.errorMessage || 'Error al publicar en Cabaprop')
                              } else {
                                toast.success('Publicada en Cabaprop')
                              }
                              fetchMLStatus()
                            } else {
                              const err = await res.json()
                              toast.error(err.error || 'Error al publicar en Cabaprop')
                            }
                          } catch {
                            toast.error('Error de conexión')
                          }
                        }
                      }}
                      className={`h-9 w-9 ${cbListings[property.id] ? 'text-blue-600 hover:bg-blue-100' : 'text-lavender-light hover:bg-lavender/20 hover:text-navy-light'}`}
                      title={cbListings[property.id] ? 'Quitar de Cabaprop' : 'Publicar en Cabaprop'}
                    >
                      <span className="text-xs font-bold">CB</span>
                    </Button>
                    {/* Mercado Libre button — always visible */}
                    {mlListings[property.id]?.mlItemId ? (
                      <>
                        <a
                          href={mlListings[property.id].mlPermalink || `https://www.mercadolibre.com.ar`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100 text-green-700 hover:bg-green-200"
                          title="Ver en Mercado Libre"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMLSync(property.id)}
                          disabled={syncingId === property.id}
                          className="h-9 w-9 text-[#ffe600] hover:bg-[#ffe600]/10 hover:text-[#ffe600]"
                          title="Sincronizar cambios con Mercado Libre (descripción, precio, atributos, fotos)"
                        >
                          {syncingId === property.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (!mlConfigured) {
                            toast.error('Configurá las credenciales de Mercado Libre primero (ML_APP_ID y ML_APP_SECRET)')
                          } else if (!mlConnected) {
                            if (mlAuthUrl) window.open(mlAuthUrl, '_blank')
                            else toast.error('No se pudo obtener la URL de conexión a ML')
                          } else {
                            handleMLPublish(property.id)
                          }
                        }}
                        disabled={publishingId === property.id}
                        className={`h-9 w-9 ${mlConfigured && mlConnected ? 'text-[#ffe600] hover:bg-[#ffe600]/10 hover:text-[#ffe600]' : 'text-lavender-light hover:bg-lavender/20 hover:text-navy-light'}`}
                        title={!mlConfigured ? 'Mercado Libre no configurado' : !mlConnected ? 'Conectar Mercado Libre' : 'Publicar en Mercado Libre'}
                      >
                        {publishingId === property.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs font-bold">ML</span>}
                      </Button>
                    )}
                    {/* Pixel Inmobiliario button — external link to CRM (visible for Pixel-imported properties) */}
                    {property.code?.startsWith('PIXEL-') && (
                      <a
                        href={`https://pixelinmobiliario.com.ar/propiedad/${property.code.replace('PIXEL-', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 w-9 flex items-center justify-center rounded-md text-[#abd305] hover:bg-[#abd305]/10 hover:text-[#8fb000]"
                        title="Ver en Pixel Inmobiliario CRM"
                      >
                        <span className="text-xs font-bold">PX</span>
                      </a>
                    )}
                    {/* Facebook Marketplace button — external link for manual publishing */}
                    <a
                      href="https://www.facebook.com/marketplace/create/item/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 w-9 flex items-center justify-center rounded-md text-[#1877F2] hover:bg-[#1877F2]/10"
                      title="Publicar en Facebook Marketplace (manual)"
                    >
                      <span className="text-xs font-bold">FB</span>
                    </a>
                  </div>
                  {/* Row 3: Edit + Delete actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/propiedades/${property.id}/editar`)}
                      className="h-9 px-3 text-navy border-navy/20 hover:text-gold hover:border-gold/40"
                    >
                      <Pencil className="w-4 h-4 mr-1.5" />
                      <span className="text-xs">Editar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDeletingId(property.id)
                        setDeleteDialogOpen(true)
                      }}
                      className="h-9 px-3 text-red-500 border-red-200 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      <span className="text-xs">Eliminar</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar propiedad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la propiedad y todos sus datos asociados (temporadas, imágenes).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
