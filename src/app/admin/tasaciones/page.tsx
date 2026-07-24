'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ClipboardCheck,
  Phone,
  Mail,
  Clock,
  Search,
  X,
  Building2,
  MapPin,
  CheckCircle2,
  User,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface TasacionRequest {
  id: string
  nombre: string
  telefono: string
  email: string
  tipoPropiedad: string
  zona: string
  mensaje: string
  contacted: boolean
  createdAt: string
}

const tipoLabels: Record<string, string> = {
  casa: 'Casa',
  departamento: 'Departamento',
  chalet: 'Chalet',
  ph: 'PH',
  hotel: 'Hotel',
  lote: 'Lote',
  local: 'Local',
  campo: 'Campo',
  oficina: 'Oficina',
  quinta: 'Quinta',
}

export default function AdminTasaciones() {
  const [tasaciones, setTasaciones] = useState<TasacionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTasacion, setSelectedTasacion] = useState<TasacionRequest | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [filterPending, setFilterPending] = useState(false)

  const fetchTasaciones = useCallback(async () => {
    try {
      const res = await fetch('/api/tasaciones')
      if (res.ok) {
        const data = await res.json()
        setTasaciones(data)
      }
    } catch {
      toast.error('Error al cargar tasaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasaciones()
  }, [fetchTasaciones])

  async function markContacted(id: string, currentContacted: boolean) {
    try {
      const res = await fetch(`/api/tasaciones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacted: !currentContacted }),
      })
      if (res.ok) {
        setTasaciones((prev) =>
          prev.map((t) => (t.id === id ? { ...t, contacted: !currentContacted } : t))
        )
        toast.success(currentContacted ? 'Marcada como pendiente' : 'Marcada como contactada')
      }
    } catch {
      toast.error('Error al actualizar')
    }
  }

  function openDetail(tasacion: TasacionRequest) {
    setSelectedTasacion(tasacion)
    setDetailOpen(true)
  }

  const pendingCount = tasaciones.filter((t) => !t.contacted).length

  const filtered = tasaciones.filter((t) => {
    const matchesSearch =
      t.nombre.toLowerCase().includes(search.toLowerCase()) ||
      t.zona.toLowerCase().includes(search.toLowerCase()) ||
      t.tipoPropiedad.toLowerCase().includes(search.toLowerCase()) ||
      t.telefono.includes(search)
    const matchesFilter = filterPending ? !t.contacted : true
    return matchesSearch && matchesFilter
  })

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
          <h2 className="text-2xl font-bold text-navy">Tasaciones</h2>
          <p className="text-navy-light mt-1">
            {tasaciones.length} solicitudes en total • {pendingCount} pendientes
          </p>
        </div>
        <Button
          variant={filterPending ? 'default' : 'outline'}
          onClick={() => setFilterPending(!filterPending)}
          className={filterPending ? 'bg-gold hover:bg-gold-dark text-white' : 'border-gold/30 text-gold-dark hover:bg-gold/10'}
        >
          <ClipboardCheck className="w-4 h-4 mr-2" />
          {filterPending ? 'Ver todas' : 'Pendientes'}
          {pendingCount > 0 && !filterPending && (
            <Badge className="ml-2 bg-red-500 text-white text-[10px] px-1.5">{pendingCount}</Badge>
          )}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lavender-light" />
        <Input
          placeholder="Buscar por nombre, zona o tipo..."
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

      {/* Tasaciones list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-lavender mx-auto mb-3" />
            <p className="text-navy-light">No se encontraron solicitudes de tasación</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((tasacion) => (
            <Card
              key={tasacion.id}
              className={`cursor-pointer hover:shadow-md transition-all ${
                !tasacion.contacted ? 'border-rose-200 bg-rose-50/30' : ''
              }`}
              onClick={() => openDetail(tasacion)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tasacion.contacted ? 'bg-teal-soft' : 'bg-rose-100'
                    }`}>
                      <User className={`w-5 h-5 ${tasacion.contacted ? 'text-gold-dark' : 'text-rose-500'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy">{tasacion.nombre}</h3>
                      <p className="text-xs text-lavender-light">{new Date(tasacion.createdAt).toLocaleDateString('es-AR')}</p>
                    </div>
                  </div>
                  <Badge className={`${
                    tasacion.contacted
                      ? 'bg-teal-soft text-gold-dark border-0'
                      : 'bg-rose-100 text-rose-600 border-0'
                  } text-[10px]`}>
                    {tasacion.contacted ? 'Contactado' : 'Pendiente'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-navy">
                    <Building2 className="w-4 h-4 text-gold flex-shrink-0" />
                    <span>{tipoLabels[tasacion.tipoPropiedad] || tasacion.tipoPropiedad}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-navy">
                    <MapPin className="w-4 h-4 text-gold flex-shrink-0" />
                    <span>{tasacion.zona}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-navy">
                    <Phone className="w-4 h-4 text-gold flex-shrink-0" />
                    <span>{tasacion.telefono}</span>
                  </div>
                  {tasacion.email && (
                    <div className="flex items-center gap-2 text-sm text-navy">
                      <Mail className="w-4 h-4 text-gold flex-shrink-0" />
                      <span className="truncate">{tasacion.email}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-lavender/30">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      markContacted(tasacion.id, tasacion.contacted)
                    }}
                    className={`${
                      tasacion.contacted
                        ? 'border-lavender/50 text-navy-light hover:bg-surface'
                        : 'border-gold-light text-gold-dark hover:bg-teal-soft'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {tasacion.contacted ? 'Pendiente' : 'Contactado'}
                  </Button>
                  <a href={`tel:${tasacion.telefono}`} onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" className="bg-gold hover:bg-gold-dark text-white">
                      <Phone className="w-4 h-4 mr-1" />
                      Llamar
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-navy">Detalle de Tasación</DialogTitle>
          </DialogHeader>
          {selectedTasacion && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  selectedTasacion.contacted ? 'bg-teal-soft' : 'bg-rose-100'
                }`}>
                  <User className={`w-7 h-7 ${selectedTasacion.contacted ? 'text-gold-dark' : 'text-rose-500'}`} />
                </div>
                <div>
                  <p className="font-bold text-lg text-navy">{selectedTasacion.nombre}</p>
                  <Badge className={`${
                    selectedTasacion.contacted
                      ? 'bg-teal-soft text-gold-dark border-0'
                      : 'bg-rose-100 text-rose-600 border-0'
                  }`}>
                    {selectedTasacion.contacted ? 'Contactado' : 'Pendiente'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface rounded-lg">
                  <p className="text-xs text-lavender-light mb-1">Teléfono</p>
                  <p className="text-sm text-navy font-medium">{selectedTasacion.telefono}</p>
                </div>
                <div className="p-3 bg-surface rounded-lg">
                  <p className="text-xs text-lavender-light mb-1">Email</p>
                  <p className="text-sm text-navy font-medium truncate">{selectedTasacion.email || 'No proporcionado'}</p>
                </div>
                <div className="p-3 bg-surface rounded-lg">
                  <p className="text-xs text-lavender-light mb-1">Tipo de Propiedad</p>
                  <p className="text-sm text-navy font-medium">{tipoLabels[selectedTasacion.tipoPropiedad] || selectedTasacion.tipoPropiedad}</p>
                </div>
                <div className="p-3 bg-surface rounded-lg">
                  <p className="text-xs text-lavender-light mb-1">Zona</p>
                  <p className="text-sm text-navy font-medium">{selectedTasacion.zona}</p>
                </div>
              </div>

              {selectedTasacion.mensaje && (
                <div className="p-3 bg-surface rounded-lg">
                  <p className="text-xs text-lavender-light mb-1">Mensaje</p>
                  <p className="text-sm text-navy whitespace-pre-wrap">{selectedTasacion.mensaje}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-lavender-light flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(selectedTasacion.createdAt).toLocaleString('es-AR')}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markContacted(selectedTasacion.id, selectedTasacion.contacted)}
                    className="border-navy/20 text-navy"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {selectedTasacion.contacted ? 'Marcar pendiente' : 'Marcar contactado'}
                  </Button>
                  <a href={`tel:${selectedTasacion.telefono}`}>
                    <Button size="sm" className="bg-gold hover:bg-gold-dark text-white">
                      <Phone className="w-4 h-4 mr-1" />
                      Llamar
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
