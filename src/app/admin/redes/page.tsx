'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Share2, RefreshCw, Plus, Users, Network as NetworkIcon,
  CheckCircle2, XCircle, Clock, Trash2, ExternalLink, Mail,
  Phone, MapPin, Percent, Building2, Globe, Shield,
  AlertCircle, Info, UserPlus, Edit, X, Send,
  ListChecks, Filter, Eye, AlertTriangle, RefreshCcw, Download, Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import PixelTab from '@/components/admin/PixelTab'

// ============================================================
// Types
// ============================================================

interface Portal {
  key: string
  name: string
  type: 'portal' | 'network' | 'crm' | 'social'
  description: string
  docs: string
  adminPath: string | null
  color: string
  textColor: string
  icon: string
  status: 'connected' | 'available' | 'pending' | 'error'
  statusDetail: string
  listings: number
}

interface Connection {
  id: string
  networkId: string
  inmoName: string
  inmoEmail: string
  inmoPhone: string
  inmoCity: string
  inmoMatricula: string
  message: string
  status: string
  creator: boolean
  requestedById: string
  actionedAt: string | null
  actionNotes: string
  createdAt: string
  network?: {
    id: string
    name: string
    city: string
    feePercent: number
  }
}

interface Network {
  id: string
  name: string
  description: string
  type: string
  feePercent: number
  active: boolean
  createdById: string
  createdByName: string
  contactEmail: string
  contactPhone: string
  city: string
  createdAt: string
  updatedAt: string
  connections: Connection[]
  pendingCount: number
  acceptedCount: number
  rejectedCount: number
}

type TabKey = 'portales' | 'publicaciones' | 'pixel' | 'redes' | 'conexiones'

// ============================================================
// Main component
// ============================================================

export default function AdminRedes() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('portales')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // Portals data
  const [portals, setPortals] = useState<Portal[]>([])
  const [portalStats, setPortalStats] = useState({ total: 0, connected: 0, pending: 0, available: 0 })

  // Networks data
  const [networks, setNetworks] = useState<Network[]>([])

  // Listings data (published properties per network)
  const [listingsData, setListingsData] = useState<{
    networks: Record<string, any>
    totals: { networks: number; listings: number; properties: number }
  } | null>(null)

  // Connections data
  const [pendingConns, setPendingConns] = useState<Connection[]>([])
  const [acceptedConns, setAcceptedConns] = useState<Connection[]>([])
  const [rejectedConns, setRejectedConns] = useState<Connection[]>([])
  const [connStats, setConnStats] = useState({ pending: 0, accepted: 0, rejected: 0, total: 0 })

  // Modals
  const [showNetworkModal, setShowNetworkModal] = useState(false)
  const [editingNetwork, setEditingNetwork] = useState<Network | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [invitingToNetwork, setInvitingToNetwork] = useState<Network | null>(null)

  // Fetchers
  const fetchPortals = useCallback(async () => {
    try {
      const res = await fetch('/api/redes/portals', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setPortals(data.portals || [])
        setPortalStats(data.stats || { total: 0, connected: 0, pending: 0, available: 0 })
      }
    } catch (err) {
      console.error('fetchPortals error:', err)
    }
  }, [])

  const fetchNetworks = useCallback(async () => {
    try {
      const res = await fetch('/api/redes/networks', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setNetworks(data.networks || [])
      }
    } catch (err) {
      console.error('fetchNetworks error:', err)
    }
  }, [])

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/redes/connections', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setPendingConns(data.pending || [])
        setAcceptedConns(data.accepted || [])
        setRejectedConns(data.rejected || [])
        setConnStats(data.stats || { pending: 0, accepted: 0, rejected: 0, total: 0 })
      }
    } catch (err) {
      console.error('fetchConnections error:', err)
    }
  }, [])

  const fetchListings = useCallback(async () => {
    try {
      const res = await fetch('/api/redes/listings', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setListingsData(data)
      }
    } catch (err) {
      console.error('fetchListings error:', err)
    }
  }, [])

  const syncAll = useCallback(async () => {
    setSyncing(true)
    await Promise.all([fetchPortals(), fetchNetworks(), fetchConnections(), fetchListings()])
    setSyncing(false)
    setLoading(false)
  }, [fetchPortals, fetchNetworks, fetchConnections, fetchListings])

  // Initial load + window focus refetch (anti-cache pattern)
  useEffect(() => {
    syncAll()
    const handleFocus = () => syncAll()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [syncAll])

  // ============================================================
  // Action handlers
  // ============================================================

  async function handleActionConnection(connectionId: string, action: 'accepted' | 'rejected' | 'cancelled') {
    const labels = {
      accepted: 'aceptar',
      rejected: 'rechazar',
      cancelled: 'cancelar',
    }
    if (!confirm(`¿Confirmás ${labels[action]} esta solicitud de conexión?`)) return

    try {
      const res = await fetch(`/api/redes/connections/${connectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Solicitud ${action === 'accepted' ? 'aceptada' : action === 'rejected' ? 'rechazada' : 'cancelada'} correctamente`)
        router.refresh()
        syncAll()
      } else {
        toast.error(data.error || 'Error al procesar la solicitud')
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  async function handleDeleteConnection(connectionId: string) {
    if (!confirm('¿Eliminar esta solicitud permanentemente?')) return
    try {
      const res = await fetch(`/api/redes/connections/${connectionId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Solicitud eliminada')
        router.refresh()
        syncAll()
      } else {
        toast.error(data.error || 'Error al eliminar')
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  async function handleDeleteNetwork(networkId: string) {
    if (!confirm('¿Eliminar esta red y todas sus conexiones? Esta acción no se puede deshacer.')) return
    try {
      const res = await fetch(`/api/redes/networks/${networkId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Red eliminada')
        router.refresh()
        syncAll()
      } else {
        toast.error(data.error || 'Error al eliminar la red')
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  // Re-publicar una propiedad en la red indicada.
  // Cada red tiene su propio endpoint de publish/upsert.
  async function handleRepublish(networkKey: string, propertyId: string): Promise<{ success: boolean; error?: string }> {
    const endpoints: Record<string, string> = {
      mercadolibre: '/api/mercadolibre/publish',
      zonaprop: '/api/zonaprop/toggle',
      cabaprop: '/api/cabaprop/toggle',
    }
    const ep = endpoints[networkKey]
    if (!ep) return { success: false, error: 'Red sin endpoint de publicación' }

    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      })
      const data = await res.json()
      if (res.ok) {
        return { success: true }
      }
      return { success: false, error: data.error || `HTTP ${res.status}` }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  // ============================================================
  // Render
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  const tabs: { key: TabKey; label: string; icon: typeof Share2; badge?: number }[] = [
    { key: 'portales', label: 'Portales y Redes', icon: Globe },
    { key: 'publicaciones', label: 'Publicaciones', icon: ListChecks, badge: listingsData?.totals.listings || undefined },
    { key: 'pixel', label: 'Pixel Inmobiliario', icon: Shield },
    { key: 'redes', label: 'Mis Redes', icon: NetworkIcon, badge: networks.length },
    { key: 'conexiones', label: 'Solicitudes', icon: UserPlus, badge: connStats.pending || undefined },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy flex items-center gap-2">
            <Share2 className="w-6 h-6 text-gold" />
            Redes
          </h2>
          <p className="text-navy-light mt-1">
            Conectá con portales inmobiliarios y gestioná tus redes inter-agencias
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={syncAll}
          disabled={syncing}
          className="text-navy border-navy/20"
        >
          <RefreshCw className={cn('w-4 h-4 mr-1', syncing && 'animate-spin')} />
          Sincronizar
        </Button>
      </div>

      {/* Intro Card */}
      <Card className="border-2 border-gold/40 bg-gradient-to-br from-teal-soft/30 to-cream">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gold-dark flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-navy-light">
              <p className="font-semibold text-navy">
                ¿Qué es esta sección?
              </p>
              <p>
                Acá podés gestionar todas tus conexiones con portales inmobiliarios (Mercado Libre, ZonaProp, Cabaprop, etc.)
                y redes inter-agencias para compartir propiedades con otras inmobiliarias y dividir honorarios.
              </p>
              <p className="text-xs">
                Inspirado en el módulo de Networking de Pixel Inmobiliario CRM — te permite registrar tu propia red,
                invitar agencias a sumarse, y aceptar/rechazar solicitudes de conexión entrantes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-lavender/40 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                active
                  ? 'border-gold text-navy'
                  : 'border-transparent text-navy-light hover:text-navy hover:bg-soft/50'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className={cn(
                  'ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  active ? 'bg-gold text-white' : 'bg-navy/10 text-navy'
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'portales' && (
          <motion.div
            key="portales"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <PortalsTab
              portals={portals}
              stats={portalStats}
              onGoToPortal={(path) => router.push(path)}
            />
          </motion.div>
        )}

        {activeTab === 'publicaciones' && (
          <motion.div
            key="publicaciones"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <ListingsTab
              data={listingsData}
              onRefresh={fetchListings}
              syncing={syncing}
              onRepublish={handleRepublish}
              onAfterRepublish={fetchListings}
            />
          </motion.div>
        )}

        {activeTab === 'pixel' && (
          <motion.div
            key="pixel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <PixelTab />
          </motion.div>
        )}

        {activeTab === 'redes' && (
          <motion.div
            key="redes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <NetworksTab
              networks={networks}
              onNew={() => { setEditingNetwork(null); setShowNetworkModal(true) }}
              onEdit={(n) => { setEditingNetwork(n); setShowNetworkModal(true) }}
              onDelete={handleDeleteNetwork}
              onInvite={(n) => { setInvitingToNetwork(n); setShowInviteModal(true) }}
            />
          </motion.div>
        )}

        {activeTab === 'conexiones' && (
          <motion.div
            key="conexiones"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <ConnectionsTab
              pending={pendingConns}
              accepted={acceptedConns}
              rejected={rejectedConns}
              stats={connStats}
              onAction={handleActionConnection}
              onDelete={handleDeleteConnection}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {showNetworkModal && (
        <NetworkFormModal
          network={editingNetwork}
          onClose={() => { setShowNetworkModal(false); setEditingNetwork(null) }}
          onSaved={() => { setShowNetworkModal(false); setEditingNetwork(null); syncAll() }}
        />
      )}

      {showInviteModal && invitingToNetwork && (
        <InviteModal
          network={invitingToNetwork}
          onClose={() => { setShowInviteModal(false); setInvitingToNetwork(null) }}
          onInvited={() => { setShowInviteModal(false); setInvitingToNetwork(null); syncAll() }}
        />
      )}
    </motion.div>
  )
}

// ============================================================
// Tab 1: Portales y Redes
// ============================================================

function PortalsTab({
  portals,
  stats,
  onGoToPortal,
}: {
  portals: Portal[]
  stats: { total: number; connected: number; pending: number; available: number }
  onGoToPortal: (path: string) => void
}) {
  const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    connected: { label: 'Conectado', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    available: { label: 'Disponible', color: 'bg-navy/10 text-navy', dot: 'bg-navy-light' },
    error: { label: 'Error', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  }

  const typeLabels: Record<string, string> = {
    portal: 'Portal',
    network: 'Red',
    crm: 'CRM',
    social: 'Social',
  }

  return (
    <>
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} color="navy" icon={<Globe className="w-5 h-5" />} />
        <StatCard label="Conectados" value={stats.connected} color="green" icon={<CheckCircle2 className="w-5 h-5" />} />
        <StatCard label="Pendientes" value={stats.pending} color="amber" icon={<Clock className="w-5 h-5" />} />
        <StatCard label="Disponibles" value={stats.available} color="navy" icon={<Plus className="w-5 h-5" />} />
      </div>

      {/* Portals grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {portals.map((portal) => {
          const st = statusConfig[portal.status] || statusConfig.available
          return (
            <Card
              key={portal.key}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <div
                className="h-1.5"
                style={{ backgroundColor: portal.color }}
              />
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: portal.color, color: portal.textColor }}
                    >
                      {portal.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-navy truncate">{portal.name}</h3>
                      <Badge variant="outline" className="text-[10px] mt-0.5">
                        {typeLabels[portal.type] || portal.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={cn('w-2 h-2 rounded-full', st.dot)} />
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', st.color)}>
                      {st.label}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-navy-light mb-3 line-clamp-2">
                  {portal.description}
                </p>

                {portal.listings > 0 && (
                  <div className="text-xs text-navy-light bg-soft/50 rounded px-2 py-1 mb-3">
                    <strong className="text-navy">{portal.listings}</strong> {portal.listings === 1 ? 'propiedad publicada' : 'propiedades publicadas'}
                  </div>
                )}

                {portal.statusDetail && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-3">
                    {portal.statusDetail}
                  </div>
                )}

                <div className="flex gap-2">
                  {portal.adminPath && (
                    <Button
                      size="sm"
                      variant={portal.status === 'connected' ? 'outline' : 'default'}
                      onClick={() => onGoToPortal(portal.adminPath!)}
                      className="flex-1"
                    >
                      {portal.status === 'connected' ? 'Gestionar' : 'Conectar'}
                      <ArrowRight />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(portal.docs, '_blank', 'noopener,noreferrer')}
                    className="text-navy-light"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}

function ArrowRight() {
  return <span className="ml-1">→</span>
}

// ============================================================
// Tab 2: Mis Redes
// ============================================================

function NetworksTab({
  networks,
  onNew,
  onEdit,
  onDelete,
  onInvite,
}: {
  networks: Network[]
  onNew: () => void
  onEdit: (n: Network) => void
  onDelete: (id: string) => void
  onInvite: (n: Network) => void
}) {
  if (networks.length === 0) {
    return (
      <Card className="border-2 border-dashed border-lavender">
        <CardContent className="pt-10 pb-10 text-center">
          <div className="w-16 h-16 rounded-full bg-soft flex items-center justify-center mx-auto mb-4">
            <NetworkIcon className="w-8 h-8 text-navy-light" />
          </div>
          <h3 className="font-bold text-navy text-lg mb-1">No tenés redes registradas</h3>
          <p className="text-sm text-navy-light mb-4 max-w-md mx-auto">
            Creá tu primera red inter-agencias para compartir propiedades con otras inmobiliarias,
            dividir honorarios y gestionar solicitudes de conexión.
          </p>
          <Button onClick={onNew} className="bg-gold hover:bg-gold-dark text-white">
            <Plus className="w-4 h-4 mr-1" />
            Registrar Red
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-navy-light">
          Tenés <strong className="text-navy">{networks.length}</strong> {networks.length === 1 ? 'red registrada' : 'redes registradas'}
        </p>
        <Button onClick={onNew} size="sm" className="bg-gold hover:bg-gold-dark text-white">
          <Plus className="w-4 h-4 mr-1" />
          Nueva Red
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {networks.map((network) => (
          <Card key={network.id} className="border-2 border-lavender/40 hover:shadow-md transition-shadow">
            <CardContent className="pt-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-navy to-navy-dark flex items-center justify-center text-white font-bold flex-shrink-0">
                    <NetworkIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-navy truncate">{network.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="outline" className={cn(
                        'text-[10px]',
                        network.type === 'public' ? 'border-green-300 text-green-700' : 'border-navy/30 text-navy'
                      )}>
                        {network.type === 'public' ? 'Pública' : 'Privada'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-gold/40 text-gold-dark">
                        <Percent className="w-2.5 h-2.5 mr-0.5" />
                        {network.feePercent}% honorarios
                      </Badge>
                      {!network.active && (
                        <Badge variant="outline" className="text-[10px] border-red-300 text-red-700">
                          Inactiva
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {network.description && (
                <p className="text-sm text-navy-light mb-3 line-clamp-2">{network.description}</p>
              )}

              {/* Contact info */}
              <div className="grid grid-cols-1 gap-1.5 text-xs text-navy-light mb-3">
                {network.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-gold" />
                    {network.city}
                  </div>
                )}
                {network.contactEmail && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-gold" />
                    <span className="truncate">{network.contactEmail}</span>
                  </div>
                )}
                {network.contactPhone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-gold" />
                    {network.contactPhone}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-amber-700">{network.pendingCount}</div>
                  <div className="text-[10px] text-amber-700">Pendientes</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-green-700">{network.acceptedCount}</div>
                  <div className="text-[10px] text-green-700">Aceptadas</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-red-700">{network.rejectedCount}</div>
                  <div className="text-[10px] text-red-700">Rechazadas</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onInvite(network)}
                  className="flex-1 text-navy border-navy/20"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Invitar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(network)}
                  className="text-navy-light"
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(network.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

// ============================================================
// Tab 3: Conexiones (solicitudes)
// ============================================================

function ConnectionsTab({
  pending,
  accepted,
  rejected,
  stats,
  onAction,
  onDelete,
}: {
  pending: Connection[]
  accepted: Connection[]
  rejected: Connection[]
  stats: { pending: number; accepted: number; rejected: number; total: number }
  onAction: (id: string, action: 'accepted' | 'rejected' | 'cancelled') => void
  onDelete: (id: string) => void
}) {
  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Pendientes" value={stats.pending} color="amber" icon={<Clock className="w-5 h-5" />} />
        <StatCard label="Aceptadas" value={stats.accepted} color="green" icon={<CheckCircle2 className="w-5 h-5" />} />
        <StatCard label="Rechazadas" value={stats.rejected} color="red" icon={<XCircle className="w-5 h-5" />} />
      </div>

      {/* Pending */}
      <ConnectionSection
        title="Solicitudes Pendientes"
        icon={<Clock className="w-4 h-4" />}
        connections={pending}
        emptyMessage="No tenés solicitudes pendientes"
        onAction={onAction}
        onDelete={onDelete}
        showActions
      />

      {/* Accepted */}
      <ConnectionSection
        title="Conexiones Aceptadas"
        icon={<CheckCircle2 className="w-4 h-4" />}
        connections={accepted}
        emptyMessage="Todavía no aceptaste ninguna solicitud"
        onAction={onAction}
        onDelete={onDelete}
      />

      {/* Rejected */}
      {rejected.length > 0 && (
        <ConnectionSection
          title="Rechazadas / Canceladas"
          icon={<XCircle className="w-4 h-4" />}
          connections={rejected}
          emptyMessage=""
          onAction={onAction}
          onDelete={onDelete}
        />
      )}
    </>
  )
}

function ConnectionSection({
  title,
  icon,
  connections,
  emptyMessage,
  onAction,
  onDelete,
  showActions = false,
}: {
  title: string
  icon: React.ReactNode
  connections: Connection[]
  emptyMessage: string
  onAction: (id: string, action: 'accepted' | 'rejected' | 'cancelled') => void
  onDelete: (id: string) => void
  showActions?: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-navy">
          {icon}
          {title}
          <Badge variant="outline" className="text-xs ml-1">{connections.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {connections.length === 0 ? (
          <p className="text-sm text-navy-light italic py-4 text-center">{emptyMessage}</p>
        ) : (
          connections.map((c) => <ConnectionRow key={c.id} c={c} onAction={onAction} onDelete={onDelete} showActions={showActions} />)
        )}
      </CardContent>
    </Card>
  )
}

function ConnectionRow({
  c,
  onAction,
  onDelete,
  showActions,
}: {
  c: Connection
  onAction: (id: string, action: 'accepted' | 'rejected' | 'cancelled') => void
  onDelete: (id: string) => void
  showActions: boolean
}) {
  return (
    <div className="border border-lavender/40 rounded-lg p-3 hover:bg-soft/30 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-navy-light flex-shrink-0" />
            <span className="font-semibold text-navy truncate">{c.inmoName}</span>
          </div>
          {c.network && (
            <p className="text-xs text-navy-light mt-0.5 ml-6">
              Para red: <strong className="text-navy">{c.network.name}</strong>
              {c.network.city && ` · ${c.network.city}`}
              {` · ${c.network.feePercent}% honorarios`}
            </p>
          )}
        </div>
        <span className="text-[10px] text-navy-light flex-shrink-0">
          {new Date(c.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs text-navy-light ml-6 mb-2">
        <div className="flex items-center gap-1.5">
          <Mail className="w-3 h-3 text-gold" />
          <span className="truncate">{c.inmoEmail}</span>
        </div>
        {c.inmoPhone && (
          <div className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-gold" />
            {c.inmoPhone}
          </div>
        )}
        {c.inmoCity && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-gold" />
            {c.inmoCity}
          </div>
        )}
      </div>

      {c.inmoMatricula && (
        <div className="ml-6 text-xs text-navy-light mb-2 flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-gold" />
          Matrícula: <strong className="text-navy">{c.inmoMatricula}</strong>
        </div>
      )}

      {c.message && (
        <div className="ml-6 bg-soft/40 border-l-2 border-gold/40 px-3 py-1.5 rounded-r text-xs text-navy italic mb-2">
          &ldquo;{c.message}&rdquo;
        </div>
      )}

      {c.actionNotes && (
        <div className="ml-6 text-xs text-navy-light italic mb-2">
          Nota: {c.actionNotes}
        </div>
      )}

      {showActions && (
        <div className="flex gap-2 ml-6">
          <Button
            size="sm"
            onClick={() => onAction(c.id, 'accepted')}
            className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Aceptar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(c.id, 'rejected')}
            className="border-red-300 text-red-600 hover:bg-red-50 text-xs h-7"
          >
            <XCircle className="w-3 h-3 mr-1" />
            Rechazar
          </Button>
        </div>
      )}

      {!showActions && c.status !== 'accepted' && (
        <div className="ml-6">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(c.id)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-7 px-2"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Eliminar
          </Button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Modal: Create/Edit Network
// ============================================================

function NetworkFormModal({
  network,
  onClose,
  onSaved,
}: {
  network: Network | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(network?.name || '')
  const [description, setDescription] = useState(network?.description || '')
  const [type, setType] = useState(network?.type || 'private')
  const [feePercent, setFeePercent] = useState(network?.feePercent?.toString() || '50')
  const [contactEmail, setContactEmail] = useState(network?.contactEmail || '')
  const [contactPhone, setContactPhone] = useState(network?.contactPhone || '')
  const [city, setCity] = useState(network?.city || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    setSaving(true)
    try {
      const url = network
        ? `/api/redes/networks/${network.id}`
        : '/api/redes/networks'
      const method = network ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          type,
          feePercent: parseInt(feePercent, 10) || 50,
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          city: city.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(network ? 'Red actualizada' : 'Red creada correctamente')
        onSaved()
      } else {
        toast.error(data.error || 'Error al guardar')
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-cream rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-lavender/40">
          <h3 className="text-lg font-bold text-navy flex items-center gap-2">
            <NetworkIcon className="w-5 h-5 text-gold" />
            {network ? 'Editar Red' : 'Registrar Nueva Red'}
          </h3>
          <button onClick={onClose} className="text-navy-light hover:text-navy">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-navy mb-1 block">Nombre de la red *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Red Sur Inmobiliaria"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-navy mb-1 block">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción de la red y su propósito"
              maxLength={500}
              rows={2}
              className="w-full px-3 py-2 border border-lavender/40 rounded-md bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-navy mb-1 block">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-lavender/40 rounded-md bg-white text-sm text-navy"
              >
                <option value="private">Privada</option>
                <option value="public">Pública</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-navy mb-1 block">% Honorarios</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-navy mb-1 block">Ciudad / Zona</label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej: Tandil"
                maxLength={100}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-navy mb-1 block">Email de contacto</label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contacto@inmobiliaria.com"
                maxLength={150}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-navy mb-1 block">Teléfono</label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+54 9 249 4XX-XXXX"
                maxLength={50}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-teal-soft/40 rounded-lg">
            <Info className="w-4 h-4 text-gold-dark flex-shrink-0 mt-0.5" />
            <p className="text-xs text-navy-light">
              Al crear una red, tu inmobiliaria queda automáticamente como miembro creador.
              Otras agencias podrán enviar solicitudes de conexión que verás en la pestaña &ldquo;Solicitudes&rdquo;.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-gold hover:bg-gold-dark text-white">
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  {network ? 'Guardar Cambios' : 'Crear Red'}
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ============================================================
// Modal: Invite to Network (admin creates a connection request on behalf of another agency)
// ============================================================

function InviteModal({
  network,
  onClose,
  onInvited,
}: {
  network: Network
  onClose: () => void
  onInvited: () => void
}) {
  const [inmoName, setInmoName] = useState('')
  const [inmoEmail, setInmoEmail] = useState('')
  const [inmoPhone, setInmoPhone] = useState('')
  const [inmoCity, setInmoCity] = useState('')
  const [inmoMatricula, setInmoMatricula] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inmoName.trim() || !inmoEmail.trim()) {
      toast.error('Nombre y email son requeridos')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/redes/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          networkId: network.id,
          inmoName: inmoName.trim(),
          inmoEmail: inmoEmail.trim(),
          inmoPhone: inmoPhone.trim(),
          inmoCity: inmoCity.trim(),
          inmoMatricula: inmoMatricula.trim(),
          message: message.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Solicitud enviada a ${inmoName}`)
        onInvited()
      } else {
        toast.error(data.error || 'Error al enviar invitación')
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-cream rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-lavender/40">
          <div>
            <h3 className="text-lg font-bold text-navy flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-gold" />
              Invitar Inmobiliaria a &ldquo;{network.name}&rdquo;
            </h3>
            <p className="text-xs text-navy-light mt-0.5">
              Registrá una agencia para que se sume a tu red
            </p>
          </div>
          <button onClick={onClose} className="text-navy-light hover:text-navy">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-navy mb-1 block">Nombre de la inmobiliaria *</label>
              <Input value={inmoName} onChange={(e) => setInmoName(e.target.value)} required maxLength={150} />
            </div>
            <div>
              <label className="text-sm font-medium text-navy mb-1 block">Email *</label>
              <Input type="email" value={inmoEmail} onChange={(e) => setInmoEmail(e.target.value)} required maxLength={150} />
            </div>
            <div>
              <label className="text-sm font-medium text-navy mb-1 block">Teléfono</label>
              <Input value={inmoPhone} onChange={(e) => setInmoPhone(e.target.value)} maxLength={50} />
            </div>
            <div>
              <label className="text-sm font-medium text-navy mb-1 block">Ciudad</label>
              <Input value={inmoCity} onChange={(e) => setInmoCity(e.target.value)} maxLength={100} />
            </div>
            <div>
              <label className="text-sm font-medium text-navy mb-1 block">Matrícula (CUCICBA)</label>
              <Input value={inmoMatricula} onChange={(e) => setInmoMatricula(e.target.value)} maxLength={50} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-navy mb-1 block">Mensaje de invitación</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ej: Hola! Los invitamos a sumarse a nuestra red..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 border border-lavender/40 rounded-md bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              La agencia quedará registrada como <strong>pendiente</strong>. Cuando confirmen su interés
              (vía email o teléfono), podés aceptarlos desde la pestaña &ldquo;Solicitudes&rdquo;.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-gold hover:bg-gold-dark text-white">
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1" />
                  Enviar Invitación
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ============================================================
// Tab: Publicaciones — properties published on each network
// ============================================================

const LISTING_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  active:   { label: 'Activa',    color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  paused:   { label: 'Pausada',   color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  pending:  { label: 'Pendiente', color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  error:    { label: 'Error',     color: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
  closed:   { label: 'Cerrada',   color: 'bg-gray-100 text-gray-700',    dot: 'bg-gray-500' },
  removed:  { label: 'Eliminada', color: 'bg-gray-100 text-gray-700',    dot: 'bg-gray-400' },
}

const NETWORK_META: Record<string, { name: string; color: string; textColor: string; icon: string }> = {
  mercadolibre: { name: 'Mercado Libre', color: '#FFE600', textColor: '#000000', icon: 'ML' },
  zonaprop:     { name: 'ZonaProp',      color: '#7B2C8E', textColor: '#FFFFFF', icon: 'ZP' },
  cabaprop:     { name: 'CabaProp',      color: '#1B4965', textColor: '#FFFFFF', icon: 'CB' },
}

function ListingsTab({
  data,
  onRefresh,
  syncing,
  onRepublish,
  onAfterRepublish,
}: {
  data: {
    networks: Record<string, any>
    totals: { networks: number; listings: number; properties: number }
  } | null
  onRefresh: () => Promise<void>
  syncing: boolean
  onRepublish: (networkKey: string, propertyId: string) => Promise<{ success: boolean; error?: string }>
  onAfterRepublish: () => Promise<void>
}) {
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [republishingAll, setRepublishingAll] = useState(false)
  const [republishingIds, setRepublishingIds] = useState<Set<string>>(new Set())

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  const networksArr = Object.values(data.networks || {}) as any[]
  const totalListings = data.totals?.listings || 0
  const totalProperties = data.totals?.properties || 0

  // Build flat list of all listings across networks, with network info attached
  const flatListings: any[] = networksArr.flatMap((n) =>
    (n.items || []).map((it: any) => ({ ...it, network: { key: n.key, name: n.name, color: n.color, textColor: n.textColor } }))
  )

  // Apply filters
  let filtered = flatListings
  if (selectedNetwork !== 'all') {
    filtered = filtered.filter((it) => it.network.key === selectedNetwork)
  }
  if (statusFilter !== 'all') {
    filtered = filtered.filter((it) => it.status === statusFilter)
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase()
    filtered = filtered.filter((it) => {
      const p = it.property
      if (!p) return false
      return (
        p.title?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.type?.toLowerCase().includes(q) ||
        p.operation?.toLowerCase().includes(q) ||
        it.externalId?.toLowerCase().includes(q)
      )
    })
  }

  // Status counts across all
  const statusCounts: Record<string, number> = {}
  for (const it of flatListings) {
    statusCounts[it.status] = (statusCounts[it.status] || 0) + 1
  }

  const hasAny = flatListings.length > 0

  // Build set of listings that need republish (error, paused, closed, removed, pending)
  const REPUBLISHABLE_STATES = new Set(['error', 'paused', 'closed', 'removed', 'pending'])
  const needsRepublish = filtered.filter((it) =>
    REPUBLISHABLE_STATES.has(it.status) && it.property?.id
  )

  // --------------------------------------------------------------
  // CSV export
  // --------------------------------------------------------------
  function exportCSV() {
    const headers = [
      'Red', 'Codigo', 'Titulo', 'Tipo', 'Operacion', 'Precio', 'Ubicacion',
      'Estado', 'ID Externo', 'Permalink', 'Ultima sincronizacion', 'Error',
      'Propiedad activa', 'Actualizada en',
    ]
    const escape = (v: any) => {
      if (v == null) return ''
      const s = String(v).replace(/"/g, '""')
      return `"${s}"`
    }
    const rows = filtered.map((it) => [
      it.network?.name || '',
      it.property?.code || '',
      it.property?.title || '',
      it.property?.type || '',
      it.property?.operation || '',
      it.property?.price || '',
      it.property?.location || '',
      LISTING_STATUS_CONFIG[it.status]?.label || it.status,
      it.externalId || '',
      it.permalink || '',
      it.lastSynced || '',
      it.errorMessage || '',
      it.property?.active ? 'si' : 'no',
      it.updatedAt || '',
    ].map(escape).join(','))
    const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const today = new Date().toISOString().slice(0, 10)
    a.download = `publicaciones-redes-${today}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Se exportaron ${filtered.length} publicaciones a CSV`)
  }

  // --------------------------------------------------------------
  // Re-publicar uno solo
  // --------------------------------------------------------------
  async function handleRepublishOne(listing: any) {
    const key = `${listing.network.key}-${listing.id}`
    setRepublishingIds((prev) => new Set(prev).add(key))
    try {
      const result = await onRepublish(listing.network.key, listing.property.id)
      if (result.success) {
        toast.success(`Re-publicado en ${listing.network.name}: ${listing.property?.title || listing.property?.code}`)
      } else {
        toast.error(`Error al re-publicar en ${listing.network.name}: ${result.error}`)
      }
    } finally {
      setRepublishingIds((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
      await onAfterRepublish()
    }
  }

  // --------------------------------------------------------------
  // Re-publicar todos los filtrados que lo necesiten
  // --------------------------------------------------------------
  async function handleRepublishAll() {
    if (needsRepublish.length === 0) {
      toast.info('No hay publicaciones para re-publicar con los filtros actuales')
      return
    }
    if (!confirm(`¿Re-publicar ${needsRepublish.length} propiedades en sus respectivas redes? Esto puede tardar varios minutos.`)) return

    setRepublishingAll(true)
    let ok = 0
    let fail = 0
    const failures: string[] = []

    // Sequential to avoid hammering external APIs
    for (const it of needsRepublish) {
      const key = `${it.network.key}-${it.id}`
      setRepublishingIds((prev) => new Set(prev).add(key))
      try {
        const result = await onRepublish(it.network.key, it.property.id)
        if (result.success) ok++
        else {
          fail++
          failures.push(`${it.network.name} / ${it.property?.code || it.property?.title}: ${result.error}`)
        }
      } catch (err: any) {
        fail++
        failures.push(`${it.network.name} / ${it.property?.code}: ${err.message}`)
      } finally {
        setRepublishingIds((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    }

    setRepublishingAll(false)
    await onAfterRepublish()

    if (ok > 0 && fail === 0) {
      toast.success(`Se re-publicaron ${ok} propiedades correctamente`)
    } else if (ok > 0 && fail > 0) {
      toast.warning(`${ok} ok, ${fail} con error. Detalle: ${failures.slice(0, 3).join(' | ')}${failures.length > 3 ? '...' : ''}`)
    } else {
      toast.error(`No se pudo re-publicar ninguna. Detalle: ${failures.slice(0, 3).join(' | ')}`)
    }
  }

  return (
    <>
      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Publicaciones" value={totalListings} color="navy" icon={<ListChecks className="w-5 h-5" />} />
        <StatCard label="Propiedades" value={totalProperties} color="green" icon={<Building2 className="w-5 h-5" />} />
        <StatCard label="Activas" value={statusCounts.active || 0} color="green" icon={<CheckCircle2 className="w-5 h-5" />} />
        <StatCard label="Con error" value={statusCounts.error || 0} color="red" icon={<AlertTriangle className="w-5 h-5" />} />
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Network filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-navy-light" />
              <span className="text-sm text-navy-light">Red:</span>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setSelectedNetwork('all')}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
                    selectedNetwork === 'all'
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-navy border-navy/20 hover:border-navy/50'
                  )}
                >
                  Todas
                </button>
                {networksArr.map((n) => (
                  <button
                    key={n.key}
                    onClick={() => setSelectedNetwork(n.key)}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-full border transition-colors flex items-center gap-1.5',
                      selectedNetwork === n.key
                        ? 'text-white border-transparent'
                        : 'bg-white text-navy border-navy/20 hover:border-navy/50'
                    )}
                    style={selectedNetwork === n.key ? { backgroundColor: n.color, color: n.textColor } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: selectedNetwork === n.key ? n.textColor : n.color }}
                    />
                    {n.name}
                    <span className="opacity-70">({n.total})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-navy-light">Estado:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-navy/20 rounded-md px-2 py-1 bg-white text-navy focus:outline-none focus:border-gold"
              >
                <option value="all">Todos</option>
                <option value="active">Activas</option>
                <option value="paused">Pausadas</option>
                <option value="pending">Pendientes</option>
                <option value="error">Con error</option>
                <option value="closed">Cerradas</option>
                <option value="removed">Eliminadas</option>
              </select>
            </div>

            {/* Search */}
            <Input
              type="text"
              placeholder="Buscar por título, código, zona..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64"
            />

            {/* Refresh */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRefresh()}
              disabled={syncing}
              className="text-navy border-navy/20"
            >
              <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
            </Button>

            {/* Export CSV */}
            <Button
              size="sm"
              variant="outline"
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="text-navy border-navy/20"
              title="Exportar listado filtrado a CSV"
            >
              <Download className="w-4 h-4" />
              CSV
            </Button>

            {/* Re-publicar todos */}
            <Button
              size="sm"
              onClick={handleRepublishAll}
              disabled={republishingAll || needsRepublish.length === 0}
              className="bg-gold hover:bg-gold-dark text-white"
              title={`Re-publicar ${needsRepublish.length} propiedades con estado error/pausada/pendiente`}
            >
              {republishingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4" />
              )}
              Re-publicar{needsRepublish.length > 0 ? ` (${needsRepublish.length})` : ''}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {!hasAny && (
        <Card className="border-2 border-dashed border-lavender">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="w-16 h-16 rounded-full bg-soft flex items-center justify-center mx-auto mb-4">
              <ListChecks className="w-8 h-8 text-navy-light" />
            </div>
            <h3 className="font-bold text-navy text-lg mb-1">No hay publicaciones registradas</h3>
            <p className="text-sm text-navy-light mb-4 max-w-md mx-auto">
              Cuando publiques propiedades en Mercado Libre, ZonaProp o Cabaprop desde sus respectivas secciones,
              vas a poder verlas y gestionarlas todas acá.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filtered empty state */}
      {hasAny && filtered.length === 0 && (
        <Card className="border-2 border-dashed border-lavender">
          <CardContent className="pt-10 pb-10 text-center">
            <p className="text-sm text-navy-light">
              No hay publicaciones que coincidan con los filtros seleccionados.
            </p>
            <Button
              variant="link"
              onClick={() => { setSelectedNetwork('all'); setStatusFilter('all'); setSearch('') }}
              className="text-gold mt-2"
            >
              Limpiar filtros
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Listings grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((it) => (
            <ListingCard
              key={`${it.network.key}-${it.id}`}
              listing={it}
              onRepublish={handleRepublishOne}
              republishing={republishingIds.has(`${it.network.key}-${it.id}`)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function ListingCard({
  listing,
  onRepublish,
  republishing,
}: {
  listing: any
  onRepublish: (listing: any) => Promise<void>
  republishing: boolean
}) {
  const p = listing.property
  const st = LISTING_STATUS_CONFIG[listing.status] || LISTING_STATUS_CONFIG.pending
  const n = listing.network
  const meta = NETWORK_META[n.key] || { name: n.name, color: n.color, textColor: n.textColor, icon: 'RE' }
  const REPUBLISHABLE_STATES = new Set(['error', 'paused', 'closed', 'removed', 'pending'])
  const canRepublish = !!p?.id && REPUBLISHABLE_STATES.has(listing.status)

  const fmtDate = (iso: string | null) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return iso }
  }

  const opLabel: Record<string, string> = {
    venta: 'Venta',
    alquiler: 'Alquiler',
    temporario: 'Temporario',
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex">
        {/* Property image */}
        <div className="w-28 h-28 flex-shrink-0 bg-soft relative overflow-hidden">
          {p?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-navy-light" />
            </div>
          )}
          {/* Network badge */}
          <div
            className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ backgroundColor: meta.color, color: meta.textColor }}
            title={meta.name}
          >
            {meta.icon}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] text-navy-light mb-0.5">
                <span className="font-mono font-bold text-navy">{p?.code || '—'}</span>
                {p?.operation && (
                  <>
                    <span>·</span>
                    <span>{opLabel[p.operation] || p.operation}</span>
                  </>
                )}
                {p?.type && (
                  <>
                    <span>·</span>
                    <span className="capitalize">{p.type}</span>
                  </>
                )}
              </div>
              <h3 className="font-semibold text-navy text-sm truncate" title={p?.title}>
                {p?.title || '(sin título)'}
              </h3>
              {p?.location && (
                <p className="text-xs text-navy-light truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {p.location}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={cn('w-2 h-2 rounded-full', st.dot)} />
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap', st.color)}>
                {st.label}
              </span>
            </div>
          </div>

          {/* Price + external ID */}
          <div className="flex items-center gap-2 text-xs mb-2 flex-wrap">
            {p?.price && (
              <span className="font-bold text-navy">{p.price}</span>
            )}
            {listing.externalId && (
              <span className="text-navy-light text-[10px] font-mono bg-soft px-1.5 py-0.5 rounded">
                ID: {listing.externalId}
              </span>
            )}
          </div>

          {/* Error / sync info */}
          {listing.errorMessage && (
            <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 mb-2 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{listing.errorMessage}</span>
            </div>
          )}
          {listing.lastSynced && !listing.errorMessage && (
            <div className="text-[10px] text-navy-light mb-2 flex items-center gap-1">
              <RefreshCcw className="w-3 h-3" />
              Sincronizado: {fmtDate(listing.lastSynced)}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-1.5 mt-auto flex-wrap">
            {canRepublish && (
              <Button
                size="sm"
                variant="default"
                onClick={() => onRepublish(listing)}
                disabled={republishing}
                className="text-xs h-7 px-2 bg-gold hover:bg-gold-dark text-white"
                title="Re-publicar esta propiedad en la red"
              >
                {republishing ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCcw className="w-3 h-3 mr-1" />
                )}
                Re-publicar
              </Button>
            )}
            {listing.permalink && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(listing.permalink, '_blank', 'noopener,noreferrer')}
                className="text-xs h-7 px-2"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Ver aviso
              </Button>
            )}
            {p?.id && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(`/propiedad/${p.id}`, '_blank', 'noopener,noreferrer')}
                className="text-xs h-7 px-2 text-navy-light"
              >
                <Eye className="w-3 h-3 mr-1" />
                Ver en sitio
              </Button>
            )}
            {p?.id && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.location.assign(`/admin/propiedades?edit=${p.id}`)}
                className="text-xs h-7 px-2 text-navy-light"
              >
                <Edit className="w-3 h-3 mr-1" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ============================================================
// Stat Card component
// ============================================================

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: number
  color: 'navy' | 'green' | 'amber' | 'red'
  icon: React.ReactNode
}) {
  const colors = {
    navy: 'bg-navy/5 text-navy border-navy/20',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <div className={cn('border rounded-lg p-3 flex items-center gap-3', colors[color])}>
      <div className="opacity-80">{icon}</div>
      <div>
        <div className="text-xl font-bold leading-tight">{value}</div>
        <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      </div>
    </div>
  )
}
