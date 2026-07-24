'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, CheckCircle2, Info, ExternalLink,
  RefreshCw, Trash2, Copy, Link2, Key,
  Save, AlertCircle, Settings2, Phone,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface CBListing {
  id: string
  propertyId: string
  cbStatus: string
  cbId: string
  cbPermalink: string
  errorMessage: string
  lastSynced: string | null
  createdAt: string
  property?: {
    id: string
    title: string
    code: string
    operation: string
  }
}

export default function AdminCabaprop() {
  const [listings, setListings] = useState<CBListing[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [matricula, setMatricula] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const fetchListings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cabaprop/toggle')
      if (res.ok) {
        const data = await res.json()
        setListings(data.listings || [])
        setConfigured(data.configured || false)
        setMatricula(data.matricula || '')
      }
    } catch {}
    setLoading(false)
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/cabaprop/settings')
      if (res.ok) {
        const data = await res.json()
        setConfigured(data.configured || false)
        setApiKey(data.apiKey || '')
        setWebhookUrl(data.webhookUrl || '')
        setMatricula(data.matricula || '')
      }
    } catch {}
    setSettingsLoaded(true)
  }, [])

  useEffect(() => {
    fetchListings()
    fetchSettings()
  }, [fetchListings, fetchSettings])

  async function handleSaveSettings() {
    if (!apiKey.trim()) {
      toast.error('Ingresá la API Key de Cabaprop')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/cabaprop/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          webhookUrl: webhookUrl.trim(),
          matricula: matricula.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Configuración guardada. Conectado como: ${data.info || 'OK'}`)
        setConfigured(true)
        fetchSettings()
      } else {
        toast.error(data.error || 'Error al guardar la configuración')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  async function handleUnpublish(propertyId: string) {
    try {
      const res = await fetch('/api/cabaprop/toggle', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      })
      if (res.ok) {
        toast.success('Propiedad eliminada de Cabaprop')
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

  const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    error: 'bg-red-500',
    paused: 'bg-yellow-500',
    pending: 'bg-blue-500',
  }

  const statusLabels: Record<string, string> = {
    active: 'Publicada',
    error: 'Error',
    paused: 'Pausada',
    pending: 'Pendiente',
  }

  if (loading && !settingsLoaded) {
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
          <h2 className="text-2xl font-bold text-navy">Cabaprop</h2>
          <p className="text-navy-light mt-1">Portal inmobiliario de CUCICBA - Publicá como matriculado</p>
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
      <Card className="border-2 border-blue-400">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-5 h-5" />
            ¿Qué es Cabaprop y cómo funciona?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Cabaprop</strong> es el portal inmobiliario oficial de <strong>CUCICBA</strong> (Colegio Único de Corredores Inmobiliarios de CABA).
              Es el único portal donde exclusivamente corredores matriculados pueden publicar propiedades, lo que le da mayor credibilidad y confianza a tus avisos.
            </p>
          </div>
          <ol className="text-sm text-navy-light space-y-3 list-decimal list-inside">
            <li className="text-navy">
              Registrate en <a href="https://cabaprop.com.ar" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">cabaprop.com.ar</a> con tu matrícula de CUCICBA
            </li>
            <li className="text-navy">
              Ingresá a <strong>cabaprop.com.ar/admin</strong> → <strong>Configuración</strong> → <strong>Integración</strong>
            </li>
            <li className="text-navy">
              Creá una <strong>API Key</strong> y copiala acá abajo
            </li>
            <li className="text-navy">
              Marcá las propiedades que querés publicar con el botón <strong>&quot;CB&quot;</strong> en la página de Propiedades
            </li>
            <li className="text-navy">
              Las propiedades se publicarán automáticamente en Cabaprop
            </li>
          </ol>
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              <strong>Requisito:</strong> Solo corredores inmobiliarios matriculados en CUCICBA pueden publicar. Contactá a Cabaprop por WhatsApp al <strong>+54 9 (11) 4064-2434</strong> para crear tu cuenta.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="w-5 h-5" />
            Configuración de API
            {configured ? (
              <Badge className="bg-green-100 text-green-700 border-0 text-xs ml-2">Conectado</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-600 border-0 text-xs ml-2">No configurado</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-navy mb-1 block">API Key *</label>
              <Input
                type="password"
                placeholder="Pegá tu API Key de Cabaprop"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-navy-light mt-1">
                Se genera en cabaprop.com.ar/admin → Configuración → Integración
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-navy mb-1 block">Matrícula CUCICBA</label>
              <Input
                placeholder="Ej: 1234"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-navy-light mt-1">
                Tu número de matrícula de corredor inmobiliario
              </p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-navy mb-1 block">Webhook URL (opcional)</label>
            <Input
              placeholder="https://fzacaria.com.ar/api/cabaprop/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-navy-light mt-1">
              Para recibir notificaciones de Cabaprop (consultas, cambios de estado)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveSettings}
              disabled={saving || !apiKey.trim()}
              className="bg-gold hover:bg-gold-dark text-white"
            >
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Verificando...' : 'Guardar y Verificar'}
            </Button>
            {configured && (
              <div className="flex items-center gap-1.5 text-green-600 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>API Key verificada</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Listed Properties */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-5 h-5" />
            Propiedades en Cabaprop
            {listings.length > 0 && (
              <Badge variant="outline" className="ml-auto text-xs">{listings.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!configured ? (
            <div className="text-center py-8">
              <Settings2 className="w-10 h-10 text-lavender mx-auto mb-3" />
              <p className="text-navy-light text-sm">
                Configurá tu API Key de Cabaprop primero
              </p>
              <p className="text-navy-light text-xs mt-2">
                Luego podés publicar propiedades desde la página de Propiedades
              </p>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-10 h-10 text-lavender mx-auto mb-3" />
              <p className="text-navy-light text-sm">
                No hay propiedades publicadas en Cabaprop
              </p>
              <p className="text-navy-light text-xs mt-2">
                Andá a <a href="/admin/propiedades" className="text-gold underline">Propiedades</a> y hacé clic en &quot;CB&quot; para publicar
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between p-3 bg-soft rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[listing.cbStatus] || 'bg-gray-400'}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-navy text-sm truncate">
                        {listing.property?.title || `Propiedad ${listing.propertyId}`}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-navy-light">
                        <span className="font-mono">{listing.property?.code || ''}</span>
                        <span>·</span>
                        <span>{statusLabels[listing.cbStatus] || listing.cbStatus}</span>
                        {listing.cbPermalink && (
                          <>
                            <span>·</span>
                            <a
                              href={listing.cbPermalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Ver en Cabaprop
                            </a>
                          </>
                        )}
                      </div>
                      {listing.errorMessage && (
                        <p className="text-xs text-red-500 mt-1 truncate">{listing.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUnpublish(listing.propertyId)}
                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                    title="Quitar de Cabaprop"
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
              <p><strong className="text-navy">Sobre Cabaprop:</strong> Es el portal oficial de CUCICBA, creado exclusivamente para corredores inmobiliarios matriculados. Las publicaciones son gratuitas e ilimitadas, lo que te diferencia de portales comerciales donde hay que pagar por cada aviso.</p>
              <p><strong className="text-navy">Ventajas:</strong> Publicación gratuita · Solo matriculados · Mayor confianza del cliente · Integración con CRM · Crecimiento del 900% en usuarios</p>
              <p><strong className="text-navy">Soporte:</strong> Contactá a Cabaprop por WhatsApp al <Phone className="w-3 h-3 inline" /> +54 9 (11) 4064-2434</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
