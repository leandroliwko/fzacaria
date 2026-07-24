'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  FileText,
  Mail,
  ClipboardCheck,
  TrendingUp,
  Star,
  Eye,
  Clock,
  BarChart3,
  Globe,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import VisitChart from '@/components/VisitChart'

interface Stats {
  totalProperties: number
  activeProperties: number
  featuredProperties: number
  totalArticles: number
  activeArticles: number
  unreadMessages: number
  totalMessages: number
  pendingTasaciones: number
  totalTasaciones: number
  recentMessages: Array<{
    id: string
    name: string
    email: string
    subject: string
    message: string
    read: boolean
    createdAt: string
  }>
  recentTasaciones: Array<{
    id: string
    nombre: string
    tipoPropiedad: string
    zona: string
    contacted: boolean
    createdAt: string
  }>
  recentProperties: Array<{
    id: string
    title: string
    type: string
    operation: string
    price: string
    active: boolean
    createdAt: string
  }>
}

interface VisitStats {
  totalVisits: number
  periodVisits: number
  todayVisits: number
  yesterdayVisits: number
  dailyVisits: Array<{ date: string; label: string; visits: number }>
  topPages: Array<{ path: string; visits: number }>
  topCountries: Array<{ country: string; visits: number }>
  topReferrers: Array<{ referrer: string; visits: number }>
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null)
  const [chartDays, setChartDays] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchVisitStats()
  }, [])

  useEffect(() => {
    fetchVisitStats()
  }, [chartDays])

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      // silently fail
    }
  }

  async function fetchVisitStats() {
    try {
      const res = await fetch(`/api/visits?days=${chartDays}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setVisitStats(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  if (!stats) return <p className="text-navy-light">Error al cargar estadísticas</p>

  // Visit trend calculation
  const visitTrend = visitStats
    ? visitStats.yesterdayVisits > 0
      ? Math.round(((visitStats.todayVisits - visitStats.yesterdayVisits) / visitStats.yesterdayVisits) * 100)
      : visitStats.todayVisits > 0 ? 100 : 0
    : 0

  const statCards = [
    {
      title: 'Visitas Hoy',
      value: visitStats?.todayVisits || 0,
      subtitle: `${visitStats?.totalVisits || 0} totales`,
      icon: Eye,
      color: 'bg-[#5D3A7A]',
      iconBg: 'bg-[#5D3A7A]/10',
      iconColor: 'text-[#5D3A7A]',
      trend: visitTrend,
    },
    {
      title: 'Propiedades',
      value: stats.totalProperties,
      subtitle: `${stats.activeProperties} activas`,
      icon: Building2,
      color: 'bg-navy',
      iconBg: 'bg-navy/10',
      iconColor: 'text-navy',
    },
    {
      title: 'Artículos',
      value: stats.totalArticles,
      subtitle: `${stats.activeArticles} publicados`,
      icon: FileText,
      color: 'bg-gold-dark',
      iconBg: 'bg-teal-soft',
      iconColor: 'text-gold-dark',
    },
    {
      title: 'Mensajes',
      value: stats.totalMessages,
      subtitle: `${stats.unreadMessages} sin leer`,
      icon: Mail,
      color: 'bg-teal-pale',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      alert: stats.unreadMessages > 0,
    },
    {
      title: 'Tasaciones',
      value: stats.totalTasaciones,
      subtitle: `${stats.pendingTasaciones} pendientes`,
      icon: ClipboardCheck,
      color: 'bg-rose-500',
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      alert: stats.pendingTasaciones > 0,
    },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Page title */}
      <motion.div variants={item}>
        <h2 className="text-2xl font-bold text-navy">Dashboard</h2>
        <p className="text-navy-light mt-1">Resumen general de la inmobiliaria</p>
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-navy text-lg">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <a href="/admin/propiedades">
              <Button className="bg-navy hover:bg-navy-light text-white">
                <Building2 className="w-4 h-4 mr-2" />
                Nueva Propiedad
              </Button>
            </a>
            <a href="/admin/articulos">
              <Button variant="outline" className="border-navy text-navy hover:bg-navy hover:text-white">
                <FileText className="w-4 h-4 mr-2" />
                Nuevo Artículo
              </Button>
            </a>
            <a href="/admin/mensajes">
              <Button variant="outline" className="border-gold text-gold-dark hover:bg-gold hover:text-white">
                <Mail className="w-4 h-4 mr-2" />
                Ver Mensajes
                {stats.unreadMessages > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white text-[10px] px-1.5">{stats.unreadMessages}</Badge>
                )}
              </Button>
            </a>
            <a href="/admin/tasaciones">
              <Button variant="outline" className="border-rose-300 text-rose-600 hover:bg-rose-50">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Tasaciones
                {stats.pendingTasaciones > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white text-[10px] px-1.5">{stats.pendingTasaciones}</Badge>
                )}
              </Button>
            </a>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-navy-light">{card.title}</p>
                  <p className="text-3xl font-bold text-navy mt-1">{card.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {card.alert && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                    {card.trend !== undefined && (
                      <span className={`inline-flex items-center text-xs font-semibold ${card.trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {card.trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(card.trend)}%
                      </span>
                    )}
                    <p className="text-xs text-lavender-light">{card.subtitle}</p>
                  </div>
                </div>
                <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${card.color}`} />
          </Card>
        ))}
      </motion.div>

      {/* Visit Chart */}
      <motion.div variants={item}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-navy text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gold" />
              Visitas a la Página
            </CardTitle>
            <div className="flex items-center gap-2">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => setChartDays(days)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    chartDays === days
                      ? 'bg-navy text-white'
                      : 'bg-surface text-navy-light hover:bg-soft'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {visitStats && visitStats.dailyVisits.length > 0 ? (
              <VisitChart data={visitStats.dailyVisits} height={220} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-navy-light">
                <Eye className="w-10 h-10 text-lavender-light mb-3" />
                <p className="text-sm">Las visitas comenzarán a registrarse</p>
                <p className="text-xs text-lavender-light mt-1">Los datos aparecerán aquí cuando los visitantes ingresen al sitio</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Visit details row */}
      {visitStats && (visitStats.topPages.length > 0 || visitStats.topCountries.length > 0) && (
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Pages */}
          {visitStats.topPages.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-navy text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gold" />
                  Páginas Más Visitadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {visitStats.topPages.map((page, i) => {
                    const maxPageVisits = visitStats.topPages[0]?.visits || 1
                    return (
                      <div key={page.path} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-navy-light w-5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-medium text-navy truncate">{page.path}</span>
                            <span className="text-xs font-bold text-navy ml-2">{page.visits}</span>
                          </div>
                          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-navy to-lavender rounded-full transition-all duration-500"
                              style={{ width: `${(page.visits / maxPageVisits) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Countries */}
          {visitStats.topCountries.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-navy text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gold" />
                  Origen de Visitantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {visitStats.topCountries.map((c, i) => {
                    const maxCountryVisits = visitStats.topCountries[0]?.visits || 1
                    return (
                      <div key={c.country} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-navy-light w-5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-medium text-navy">{c.country}</span>
                            <span className="text-xs font-bold text-navy ml-2">{c.visits}</span>
                          </div>
                          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-gold to-teal-pale rounded-full transition-all duration-500"
                              style={{ width: `${(c.visits / maxCountryVisits) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Referrers */}
          {visitStats.topReferrers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-navy text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gold" />
                  Fuentes de Tráfico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {visitStats.topReferrers.map((r, i) => {
                    const maxRefVisits = visitStats.topReferrers[0]?.visits || 1
                    const displayUrl = r.referrer.replace(/^https?:\/\//, '').replace(/\/$/, '').substring(0, 30)
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-navy-light w-5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-medium text-navy truncate">{displayUrl}</span>
                            <span className="text-xs font-bold text-navy ml-2">{r.visits}</span>
                          </div>
                          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-navy-dark to-gold rounded-full transition-all duration-500"
                              style={{ width: `${(r.visits / maxRefVisits) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Recent items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Properties */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-navy text-lg">Propiedades Recientes</CardTitle>
              <a href="/admin/propiedades" className="text-sm text-gold hover:text-gold-dark">
                Ver todas →
              </a>
            </CardHeader>
            <CardContent>
              {stats.recentProperties.length === 0 ? (
                <p className="text-lavender-light text-sm py-4 text-center">No hay propiedades</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentProperties.map((prop) => (
                    <div key={prop.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface hover:bg-soft transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-navy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy truncate">{prop.title}</p>
                        <p className="text-xs text-lavender-light">{prop.type} • {prop.operation} • {prop.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {prop.active ? (
                          <Badge className="bg-teal-soft text-gold-dark border-0 text-[10px]">Activa</Badge>
                        ) : (
                          <Badge className="bg-soft text-navy-light border-0 text-[10px]">Inactiva</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Messages */}
        <motion.div variants={item}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-navy text-lg">Mensajes Recientes</CardTitle>
              <a href="/admin/mensajes" className="text-sm text-gold hover:text-gold-dark">
                Ver todos →
              </a>
            </CardHeader>
            <CardContent>
              {stats.recentMessages.length === 0 ? (
                <p className="text-lavender-light text-sm py-4 text-center">No hay mensajes</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentMessages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${msg.read ? 'bg-surface' : 'bg-gold/5 border border-gold/20'}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.read ? 'bg-soft' : 'bg-gold/20'}`}>
                        <Mail className={`w-5 h-5 ${msg.read ? 'text-lavender-light' : 'text-gold'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-navy">{msg.name}</p>
                          {!msg.read && <span className="w-2 h-2 rounded-full bg-gold" />}
                        </div>
                        <p className="text-xs text-navy-light truncate">{msg.subject || msg.message}</p>
                        <p className="text-[10px] text-lavender-light mt-1">{new Date(msg.createdAt).toLocaleDateString('es-AR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Tasaciones */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-navy text-lg">Tasaciones Recientes</CardTitle>
              <a href="/admin/tasaciones" className="text-sm text-gold hover:text-gold-dark">
                Ver todas →
              </a>
            </CardHeader>
            <CardContent>
              {stats.recentTasaciones.length === 0 ? (
                <p className="text-lavender-light text-sm py-4 text-center">No hay solicitudes de tasación</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.recentTasaciones.map((tas) => (
                    <div key={tas.id} className={`p-4 rounded-lg transition-colors ${tas.contacted ? 'bg-surface' : 'bg-rose-50 border border-rose-100'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <ClipboardCheck className={`w-4 h-4 ${tas.contacted ? 'text-lavender-light' : 'text-rose-500'}`} />
                        <p className="text-sm font-medium text-navy">{tas.nombre}</p>
                      </div>
                      <p className="text-xs text-navy-light">{tas.tipoPropiedad} • {tas.zona}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={`${tas.contacted ? 'bg-teal-soft text-gold-dark' : 'bg-rose-100 text-rose-600'} border-0 text-[10px]`}>
                          {tas.contacted ? 'Contactado' : 'Pendiente'}
                        </Badge>
                        <span className="text-[10px] text-lavender-light">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(tas.createdAt).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
