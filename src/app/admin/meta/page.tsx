'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Facebook, Instagram, CheckCircle2, Link2, AlertTriangle,
  ExternalLink, Loader2, RefreshCw, Trash2, Building2,
  Settings, Info, Save, Eye, EyeOff, Key,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface MetaListing {
  id: string
  propertyId: string
  fbPostId: string
  fbPermalink: string
  igMediaId: string
  igPermalink: string
  status: string
  target: string
  errorMessage: string
  lastSynced: string | null
  createdAt: string
  updatedAt: string
  property?: {
    id: string
    title: string
    code: string
    operation: string
    type: string
    location: string
  }
}

export default function AdminMeta() {
  const [configured, setConfigured] = useState(false)
  const [connected, setConnected] = useState(false)
  const [expired, setExpired] = useState(false)
  const [hasPage, setHasPage] = useState(false)
  const [hasIg, setHasIg] = useState(false)
  const [authUrl, setAuthUrl] = useState('')
  const [message, setMessage] = useState('')
  const [pageName, setPageName] = useState('')
  const [igUsername, setIgUsername] = useState('')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [daysUntilExpiry, setDaysUntilExpiry] = useState<number | null>(null)
  const [listings, setListings] = useState<MetaListing[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // Settings form
  const [appId, setAppId] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [redirectUri, setRedirectUri] = useState('https://fzacaria.com.ar/api/meta/auth/callback')
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/meta/status')
      if (res.ok) {
        const data = await res.json()
        setConfigured(data.configured || false)
        setConnected(data.connected || false)
        setExpired(data.expired || false)
        setHasPage(data.hasPage || false)
        setHasIg(data.hasIg || false)
        if (data.authUrl) setAuthUrl(data.authUrl)
        if (data.message) setMessage(data.message)
        if (data.pageName) setPageName(data.pageName)
        if (data.igUsername) setIgUsername(data.igUsername)
        if (data.userName) setUserName(data.userName)
        if (data.userEmail) setUserEmail(data.userEmail)
        if (data.expiresAt) setExpiresAt(data.expiresAt)
        if (typeof data.daysUntilExpiry === 'number') setDaysUntilExpiry(data.daysUntilExpiry)
      }
    } catch {}

    try {
      const res = await fetch('/api/meta/listings')
      if (res.ok) {
        const data = await res.json()
        setListings(data.listings || [])
      }
    } catch {}

    setLoading(false)
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/meta/settings')
      if (res.ok) {
        const data = await res.json()
        setAppId(data.appId || '')
        setRedirectUri(data.redirectUri || 'https://fzacaria.com.ar/api/meta/auth/callback')
        if (data.appSecretSet && !data.appId) {
          setAppSecret('')
        } else if (!data.appSecretSet) {
          setAppSecret('')
        }
      }
    } catch {}
    setSettingsLoaded(true)
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchSettings()
  }, [fetchStatus, fetchSettings])

  // Check for callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('meta_connected')) {
      const page = params.get('meta_page')
      const ig = params.get('meta_ig')
      toast.success(
        `¡Meta conectado!${page ? ` Página: ${page}` : ''}${ig ? ` · Instagram: @${ig}` : ''}`
      )
      window.history.replaceState({}, '', '/admin/meta')
      fetchStatus()
    }
    if (params.get('meta_error')) {
      toast.error(`Error Meta: ${params.get('meta_error')}`)
      window.history.replaceState({}, '', '/admin/meta')
    }
  }, [fetchStatus])

  async function handleSaveSettings() {
    if (!appId.trim() || !appSecret.trim()) {
      toast.error('App ID y App Secret son requeridos')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/meta/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: appId.trim(),
          appSecret: appSecret.trim(),
          redirectUri: redirectUri.trim(),
        }),
      })
      if (res.ok) {
        toast.success('Credenciales guardadas. Conectá tu cuenta de Facebook para empezar.')
        setAppSecret('')
        fetchStatus()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSettings() {
    if (!confirm('¿Eliminar las credenciales de Meta? Se desconectará la cuenta y se borrarán los tokens.')) return
    try {
      const res = await fetch('/api/meta/settings', { method: 'DELETE' })
      if (res.ok) {
        toast.success('Configuración eliminada')
        setAppId('')
        setAppSecret('')
        setPageName('')
        setIgUsername('')
        setConnected(false)
        fetchStatus()
      }
    } catch {
      toast.error('Error al eliminar')
    }
  }

  async function handleUnpublish(propertyId: string) {
    if (!confirm('¿Eliminar la publicación de Facebook e Instagram? Esto borrará los posts.')) return
    try {
      const res = await fetch('/api/meta/publish', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      })
      if (res.ok) {
        toast.success('Publicación eliminada de Meta')
        fetchStatus()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al eliminar de Meta')
      }
    } catch {
      toast.error('Error de conexión')
    }
  }

  async function handleSyncAll() {
    setSyncing(true)
    try {
      await fetchStatus()
      toast.success('Estado sincronizado')
    } catch {
      toast.error('Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    active: { label: 'Activa', color: 'bg-green-500' },
    pending: { label: 'Pendiente', color: 'bg-amber-500' },
    error: { label: 'Error', color: 'bg-red-500' },
    removed: { label: 'Eliminada', color: 'bg-gray-500' },
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
          <h2 className="text-2xl font-bold text-navy flex items-center gap-2">
            <Facebook className="w-6 h-6 text-[#1877F2]" />
            Meta Business
            <Instagram className="w-5 h-5 text-[#E1306C] ml-1" />
          </h2>
          <p className="text-navy-light mt-1">
            Conectá tu Página de Facebook + Instagram Business para publicar propiedades automáticamente
          </p>
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

      {/* Credentials Configuration Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="w-5 h-5" />
            Credenciales de Meta App
            {configured && (
              <Badge className="bg-green-600 text-white border-0 text-xs ml-2">Configurado</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-semibold">¿Cómo obtener las credenciales?</p>
              <ol className="list-decimal list-inside mt-1 space-y-0.5 text-xs">
                <li>
                  Andá a{' '}
                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    developers.facebook.com/apps
                  </a>{' '}
                  y creá una app de tipo &quot;Business&quot;
                </li>
                <li>Agregá los productos: Facebook Login + Instagram Graph API + Pages API</li>
                <li>
                  En &quot;Facebook Login → Settings&quot;, agregá este Redirect URI:{' '}
                  <code className="bg-white px-1 rounded">{redirectUri}</code>
                </li>
                <li>
                  En &quot;App Settings → Basic&quot; copiá el <strong>App ID</strong> y{' '}
                  <strong>App Secret</strong>
                </li>
                <li>
                  En &quot;App Review&quot;, pedí permisos avanzados para{' '}
                  <code className="bg-white px-1 rounded">pages_manage_posts</code> y{' '}
                  <code className="bg-white px-1 rounded">instagram_content_publish</code> (o dejá la app en
                  modo Desarrollo para pruebas con tu propia cuenta)
                </li>
                <li>
                  La Página de Facebook debe tener una <strong>Cuenta de Instagram Business</strong>{' '}
                  vinculada (Administrador de Página → Ajustes → Instagram)
                </li>
              </ol>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-navy mb-1.5 block">App ID</label>
              <Input
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="Ej: 1234567890123456"
                className="border-navy/20 focus:border-gold font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-navy mb-1.5 block">App Secret</label>
              <div className="relative">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder={configured ? '•••••••• (ingresá nuevo valor para cambiar)' : 'Ej: abc123def456...'}
                  className="border-navy/20 focus:border-gold font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-light hover:text-navy"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-navy mb-1.5 block">Redirect URI</label>
              <Input
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                className="border-navy/20 focus:border-gold font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSaveSettings}
              disabled={saving || !appId.trim() || !appSecret.trim()}
              className="bg-gold hover:bg-gold-dark text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Guardar Credenciales
            </Button>
            {configured && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSettings}
                className="text-red-500 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Eliminar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card className={`border-2 ${!configured ? 'border-amber-400' : connected ? 'border-green-400' : 'border-blue-400'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Facebook className="w-5 h-5 text-[#1877F2]" />
            Estado de Conexión
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!configured ? (
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-800">Credenciales no configuradas</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Ingresá tu App ID y App Secret en el formulario de arriba para empezar.
                </p>
              </div>
            </div>
          ) : connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-800">Cuenta de Meta conectada</h4>
                  <p className="text-sm text-green-700 mt-0.5">
                    Ya podés publicar propiedades en Facebook e Instagram desde el panel de propiedades.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {pageName && (
                  <div className="bg-soft rounded-lg p-3">
                    <p className="text-navy-light text-xs flex items-center gap-1">
                      <Facebook className="w-3 h-3 text-[#1877F2]" /> Página de Facebook
                    </p>
                    <p className="font-medium text-navy">{pageName}</p>
                  </div>
                )}
                {igUsername && (
                  <div className="bg-soft rounded-lg p-3">
                    <p className="text-navy-light text-xs flex items-center gap-1">
                      <Instagram className="w-3 h-3 text-[#E1306C]" /> Instagram Business
                    </p>
                    <p className="font-medium text-navy">@{igUsername}</p>
                  </div>
                )}
                {userName && (
                  <div className="bg-soft rounded-lg p-3">
                    <p className="text-navy-light text-xs">Usuario autorizado</p>
                    <p className="font-medium text-navy">{userName}</p>
                  </div>
                )}
                {expiresAt && (
                  <div className="bg-soft rounded-lg p-3">
                    <p className="text-navy-light text-xs">Token expira</p>
                    <p className="font-mono text-navy text-xs">
                      {new Date(expiresAt).toLocaleString('es-AR')}
                      {daysUntilExpiry !== null && (
                        <span
                          className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                            daysUntilExpiry < 7
                              ? 'bg-red-100 text-red-700'
                              : daysUntilExpiry < 14
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {daysUntilExpiry} días
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
              {daysUntilExpiry !== null && daysUntilExpiry < 7 && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    El token de usuario expira en {daysUntilExpiry} día{daysUntilExpiry === 1 ? '' : 's'}. Hacé
                    clic en &quot;Sincronizar&quot; para renovarlo automáticamente (lo renovamos si faltan menos de 7 días).
                  </p>
                </div>
              )}
              {!hasIg && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    La Página seleccionada no tiene una Cuenta de Instagram Business vinculada. Solo se podrá
                    publicar en Facebook. Para vincular Instagram, andá a Administrador de Página → Ajustes → Instagram.
                  </p>
                </div>
              )}
            </div>
          ) : expired ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800">Token expirado</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Hacé clic en el botón para volver a conectar tu cuenta de Facebook.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => authUrl ? window.open(authUrl, '_blank') : fetchStatus()}
                className="bg-[#1877F2] hover:bg-[#1864d6] text-white font-semibold"
                size="lg"
              >
                <Facebook className="w-5 h-5 mr-2" />
                Reconectar con Facebook
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Link2 className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800">Credenciales guardadas</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Falta conectar tu cuenta de Facebook. Hacé clic en el botón para autorizar la app.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => authUrl ? window.open(authUrl, '_blank') : fetchStatus()}
                className="bg-[#1877F2] hover:bg-[#1864d6] text-white font-semibold"
                size="lg"
              >
                <Facebook className="w-5 h-5 mr-2" />
                Conectar con Facebook
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Published Listings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-5 h-5" />
            Publicaciones en Facebook e Instagram
            {listings.length > 0 && (
              <Badge variant="outline" className="ml-auto text-xs">{listings.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <div className="text-center py-8">
              <Facebook className="w-10 h-10 text-[#1877F2]/40 mx-auto mb-3" />
              <p className="text-navy-light text-sm">
                {!configured
                  ? 'Configurá las credenciales para empezar a publicar'
                  : !connected
                  ? 'Conectá tu cuenta de Facebook para empezar a publicar'
                  : 'No hay propiedades publicadas en Facebook o Instagram todavía'}
              </p>
              {configured && connected && (
                <p className="text-navy-light text-xs mt-2">
                  Andá a{' '}
                  <a href="/admin/propiedades" className="text-gold underline">
                    Propiedades
                  </a>{' '}
                  y hacé clic en &quot;FB&quot; o &quot;IG&quot; para publicar
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => {
                const statusInfo = statusLabels[listing.status] || statusLabels.error
                return (
                  <div key={listing.id} className="flex items-center justify-between p-3 bg-soft rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusInfo.color}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-navy text-sm truncate">
                          {listing.property?.title || `Propiedad ${listing.propertyId}`}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-navy-light flex-wrap mt-0.5">
                          <span className="font-mono">{listing.property?.code || ''}</span>
                          <span>·</span>
                          <span>{statusInfo.label}</span>
                          <span>·</span>
                          <span className="uppercase">{listing.target}</span>
                          {listing.lastSynced && (
                            <>
                              <span>·</span>
                              <span>Sinc: {new Date(listing.lastSynced).toLocaleString('es-AR')}</span>
                            </>
                          )}
                        </div>
                        {listing.errorMessage && (
                          <p className="text-xs text-red-500 mt-1">{listing.errorMessage}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {listing.fbPermalink && (
                        <a
                          href={listing.fbPermalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 w-8 flex items-center justify-center rounded-md bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20"
                          title="Ver en Facebook"
                        >
                          <Facebook className="w-4 h-4" />
                        </a>
                      )}
                      {listing.igPermalink && (
                        <a
                          href={listing.igPermalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 w-8 flex items-center justify-center rounded-md bg-[#E1306C]/10 text-[#E1306C] hover:bg-[#E1306C]/20"
                          title="Ver en Instagram"
                        >
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {listing.status !== 'removed' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUnpublish(listing.propertyId)}
                          className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                          title="Eliminar publicación de Meta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
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
              <p>
                <strong className="text-navy">¿Cómo funciona?</strong> Marcá una propiedad con el botón{' '}
                &quot;FB&quot; o &quot;IG&quot; en la página de Propiedades para publicarla automáticamente en
                tu Página de Facebook y/o Instagram Business.
              </p>
              <p>
                La publicación incluye foto(s) de la propiedad + título, precio, ubicación, amenities, datos de
                contacto y un link a la ficha de la propiedad en fzacaria.com.ar.
              </p>
              <p className="text-xs">
                <strong>Requisitos de Meta:</strong> Cuenta de Instagram Business (no personal) vinculada a la
                Página de Facebook, y la app debe estar en modo &quot;Live&quot; o tu cuenta de Facebook debe
                estar listada como &quot;Desarrollador&quot; de la app.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
