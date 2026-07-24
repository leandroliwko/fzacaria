'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  MapPin, CheckCircle2, Info, ExternalLink,
  RefreshCw, Trash2, Building2, Copy, Link2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface ZPListing {
  id: string
  propertyId: string
  zpStatus: string
  zpId: string
  createdAt: string
  property?: {
    id: string
    title: string
    code: string
    operation: string
  }
}

export default function AdminZonaProp() {
  const [listings, setListings] = useState<ZPListing[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const feedUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://fzacaria.com.ar'}/api/zonaprop/feed`

  const fetchListings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/zonaprop/toggle')
      if (res.ok) {
        const data = await res.json()
        setListings(data.listings || [])
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  async function handleUnpublish(propertyId: string) {
    try {
      const res = await fetch('/api/zonaprop/toggle', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      })
      if (res.ok) {
        toast.success('Propiedad eliminada del feed de ZonaProp')
        fetchListings()
      } else {
        toast.error('Error al eliminar')
      }
    } catch {
      toast.error('Error de conexión')
    }
  }

  async function handleSyncAll() {
    setSyncing(true)
    try {
      await fetchListings()
      toast.success('Listado sincronizado')
    } catch {
      toast.error('Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  function copyFeedUrl() {
    navigator.clipboard.writeText(feedUrl)
    toast.success('URL del feed copiada al portapapeles')
  }

  async function previewFeed() {
    window.open(feedUrl, '_blank')
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy">ZonaProp</h2>
          <p className="text-navy-light mt-1">Gestioná la integración con ZonaProp mediante XML Feed</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncAll}
          disabled={syncing}
          className="text-navy border-navy/20"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
          Sincronizar
        </Button>
      </div>

      {/* How it works */}
      <Card className="border-2 border-green-400">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-5 h-5" />
            ¿Cómo funciona la integración con ZonaProp?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm text-green-800">
              A diferencia de Mercado Libre, ZonaProp funciona con un <strong>sistema de integración por XML Feed</strong>.
              Esto significa que ZonaProp lee un archivo XML desde tu sitio web y sincroniza las propiedades automáticamente.
            </p>
          </div>
          <ol className="text-sm text-navy-light space-y-3 list-decimal list-inside">
            <li className="text-navy">
              Marcá las propiedades que querés publicar con el botón <strong>&quot;ZP&quot;</strong> en la página de Propiedades
            </li>
            <li className="text-navy">
              Registrate como <strong>profesional/inmobiliaria</strong> en{' '}
              <a href="https://www.zonaprop.com.ar/publica-tu-propiedad/profesional.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                ZonaProp Profesional
              </a>
            </li>
            <li className="text-navy">
              En tu cuenta de ZonaProp, andá a <strong>&quot;Integraciones&quot;</strong> y solicitá la integración por XML Feed
            </li>
            <li className="text-navy">
              Proporcioná la URL del feed XML:
              <div className="mt-2 flex items-center gap-2">
                <code className="bg-navy text-green-400 px-3 py-2 rounded font-mono text-xs flex-1 overflow-x-auto">
                  {feedUrl}
                </code>
                <Button size="sm" variant="outline" onClick={copyFeedUrl} className="flex-shrink-0">
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar
                </Button>
              </div>
            </li>
            <li className="text-navy">
              ZonaProp validará el feed y comenzará a sincronizar automáticamente tus propiedades
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Feed URL Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-5 h-5" />
            URL del Feed XML
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-soft rounded-lg p-3 font-mono text-sm text-navy overflow-x-auto">
              {feedUrl}
            </div>
            <Button size="sm" onClick={copyFeedUrl} className="bg-gold hover:bg-gold-dark text-white">
              <Copy className="w-4 h-4 mr-1" />
              Copiar
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={previewFeed} className="text-navy border-navy/20">
              <ExternalLink className="w-4 h-4 mr-1" />
              Ver Feed XML
            </Button>
            <p className="text-xs text-navy-light">
              El feed se actualiza automáticamente con las propiedades marcadas
            </p>
          </div>
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              El feed incluye: datos de la propiedad, fotos, ubicación (coordenadas), precios, temporadas, amenities, y datos de contacto de la inmobiliaria.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Listed Properties */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-5 h-5" />
            Propiedades en el Feed
            {listings.length > 0 && (
              <Badge variant="outline" className="ml-auto text-xs">{listings.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="w-10 h-10 text-lavender mx-auto mb-3" />
              <p className="text-navy-light text-sm">
                No hay propiedades en el feed de ZonaProp
              </p>
              <p className="text-navy-light text-xs mt-2">
                Andá a <a href="/admin/propiedades" className="text-gold underline">Propiedades</a> y hacé clic en &quot;ZP&quot; para agregar
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between p-3 bg-soft rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-green-500" />
                    <div className="min-w-0">
                      <p className="font-medium text-navy text-sm truncate">
                        {listing.property?.title || `Propiedad ${listing.propertyId}`}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-navy-light">
                        <span className="font-mono">{listing.property?.code || ''}</span>
                        <span>•</span>
                        <span>Activa en feed</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUnpublish(listing.propertyId)}
                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                    title="Quitar del feed de ZonaProp"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-navy-light space-y-2">
              <p><strong className="text-navy">Ventajas del XML Feed:</strong> Una vez configurada la integración con ZonaProp, tus propiedades se sincronizan automáticamente. Cuando agregues o quites propiedades del feed, ZonaProp lo detectará y actualizará sus listados.</p>
              <p><strong className="text-navy">Planes de ZonaProp:</strong> ZonaProp ofrece publicación gratuita (baja visibilidad, un aviso por mes) y planes de pago (Simple, Superdestacado) con mayor exposición. Contactá a ZonaProp para conocer los precios actuales.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
