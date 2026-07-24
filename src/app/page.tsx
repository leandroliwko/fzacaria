'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Area, AreaChart, CartesianGrid, XAxis, YAxis,
} from 'recharts'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Home, FileText, Mail, ClipboardCheck, ShoppingCart, Building, Link2, Users, Database,
  LayoutDashboard, Plus, Search, Grid3X3, List, Star, Eye, EyeOff, Pencil, Trash2,
  ChevronLeft, ChevronRight, Bell, LogOut, ArrowLeft, Upload, MapPin, Clock, Phone,
  Check, X, AlertTriangle, TrendingUp, BarChart3, Eye as EyeIcon, Settings, RefreshCw
} from 'lucide-react'

// ============================================================
// TYPES & DATA
// ============================================================

type Page = 'dashboard' | 'propiedades' | 'propiedad-form' | 'articulos' | 'articulo-form' | 'mensajes' | 'tasaciones' | 'mercadolibre' | 'zonaprop' | 'cabaprop' | 'redes' | 'usuarios' | 'respaldo'

const NAVY = '#1B2A4A'
const GOLD = '#C6993E'

// Mock data
const mockProperties = [
  { id: '1', code: 'CA35', title: 'Casa 3 dorm en Pinamar Centro', type: 'casa', operation: 'venta', price: 'USD 185.000', location: 'Av. Del Libertador 500', bedrooms: 3, bathrooms: 2, area: 120, active: true, featured: true, label: '', image: '', createdAt: '2025-01-15T10:00:00' },
  { id: '2', code: 'DE36', title: 'Depto 2 dorm con vista al mar', type: 'departamento', operation: 'alquiler', price: '$ 450.000/mes', location: 'Costa Azul 200', bedrooms: 2, bathrooms: 1, area: 65, active: true, featured: false, label: '', image: '', createdAt: '2025-01-14T15:00:00' },
  { id: '3', code: 'CH37', title: 'Chalet premium en Cariló', type: 'chalet', operation: 'temporario', price: 'USD 350/noche', location: 'Cariló Norte', bedrooms: 4, bathrooms: 3, area: 200, active: true, featured: true, label: '', image: '', createdAt: '2025-01-13T09:00:00' },
  { id: '4', code: 'DE38', title: 'Monoambiente Costa Esmeralda', type: 'departamento', operation: 'venta', price: 'USD 75.000', location: 'Costa Esmeralda', bedrooms: 1, bathrooms: 1, area: 35, active: false, featured: false, label: '', image: '', createdAt: '2025-01-12T14:00:00' },
  { id: '5', code: 'LO39', title: 'Lote en Ostende', type: 'lote', operation: 'venta', price: 'USD 45.000', location: 'Ostende', bedrooms: 0, bathrooms: 0, area: 500, active: true, featured: false, label: 'RESERVADO', image: '', createdAt: '2025-01-11T11:00:00' },
  { id: '6', code: 'CA40', title: 'Casa con pileta en Valeria del Mar', type: 'casa', operation: 'temporario', price: 'USD 250/noche', location: 'Valeria del Mar', bedrooms: 3, bathrooms: 2, area: 150, active: true, featured: true, label: '', image: '', createdAt: '2025-01-10T08:00:00' },
]

const mockMessages = [
  { id: '1', name: 'María García', email: 'maria@gmail.com', phone: '02254-551234', subject: 'Consulta por casa en Pinamar', message: 'Hola, quisiera saber si la casa en Av. Del Libertador sigue disponible. Gracias.', read: false, createdAt: '2025-01-15T14:30:00' },
  { id: '2', name: 'Juan Pérez', email: 'juanperez@hotmail.com', phone: '1155667788', subject: 'Alquiler temporario', message: 'Buenos días, necesito un departamento para 4 personas en febrero. ¿Tienen disponibilidad?', read: false, createdAt: '2025-01-15T10:15:00' },
  { id: '3', name: 'Laura Martínez', email: 'laura.m@yahoo.com', phone: '', subject: 'Tasación', message: 'Quiero tasar mi propiedad en Cariló. ¿Podrían asesorarme?', read: true, createdAt: '2025-01-14T16:45:00' },
  { id: '4', name: 'Roberto Sánchez', email: 'roberto@gmail.com', phone: '2281543210', subject: 'Visita propiedad', message: 'Me interesa visitar el chalet en Cariló. ¿Cuándo puedo coordinar?', read: true, createdAt: '2025-01-13T09:00:00' },
]

const mockTasaciones = [
  { id: '1', nombre: 'Ana Rodríguez', telefono: '02254-498765', email: 'ana@mail.com', tipoPropiedad: 'Casa', zona: 'Pinamar Centro', mensaje: 'Casa de 3 dormitorios, necesito tasar para venta.', contacted: false, createdAt: '2025-01-15T11:00:00' },
  { id: '2', nombre: 'Pedro Gómez', telefono: '1155001122', email: 'pedro@mail.com', tipoPropiedad: 'Departamento', zona: 'Costa Azul', mensaje: 'Depto 2 amb con balcón, alquiler.', contacted: false, createdAt: '2025-01-14T15:30:00' },
  { id: '3', nombre: 'Carolina López', telefono: '2281556789', email: '', tipoPropiedad: 'Lote', zona: 'Ostende', mensaje: '', contacted: true, createdAt: '2025-01-13T10:00:00' },
]

const mockArticles = [
  { id: '1', title: 'El mercado inmobiliario en Pinamar 2025', excerpt: 'Análisis del mercado inmobiliario en la costa atlántica para la temporada 2025.', category: 'mercado', readTime: '5 min', active: true, createdAt: '2025-01-10T10:00:00' },
  { id: '2', title: 'Consejos para comprar su primera propiedad', excerpt: 'Todo lo que necesita saber antes de comprar su primera propiedad en la costa.', category: 'consejos', readTime: '8 min', active: true, createdAt: '2025-01-08T14:00:00' },
  { id: '3', title: 'Pinamar: más que sol y playa', excerpt: 'Descubra las ventajas de vivir en Pinamar todo el año.', category: 'pinamar', readTime: '4 min', active: false, createdAt: '2025-01-05T09:00:00' },
]

const visitData = Array.from({ length: 14 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (13 - i))
  return {
    date: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
    visitas: Math.floor(Math.random() * 40) + 10,
  }
})

const chartConfig: ChartConfig = {
  visitas: { label: 'Visitas', color: GOLD },
}

const PROPERTY_TYPES: Record<string, string> = {
  casa: 'Casa', departamento: 'Departamento', chalet: 'Chalet', ph: 'PH',
  lote: 'Lote', local: 'Local', campo: 'Campo', oficina: 'Oficina',
  quinta: 'Quinta', hotel: 'Hotel', galpon: 'Galpón'
}

const OPERATION_TYPES: Record<string, string> = {
  venta: 'Venta', alquiler: 'Alquiler', temporario: 'Temporario'
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false)
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null)
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null)
  const [loginError, setLoginError] = useState('')

  // Login
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2D4470 50%, #1B2A4A 100%)' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-4" style={{ boxShadow: '0 0 30px rgba(198,153,62,0.15)' }}>
              <Home className="w-10 h-10" style={{ color: GOLD }} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Inmobiliaria Florencia Zacaría</h1>
            <p className="text-sm" style={{ color: '#8B99B3' }}>Panel de Administración</p>
          </div>
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-xl font-semibold mb-6 text-center" style={{ color: NAVY }}>Iniciar Sesión</h2>
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {loginError}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); const email = (e.target as any).email?.value; const pass = (e.target as any).password?.value; if (email && pass) setAuthenticated(true); else setLoginError('Por favor ingrese email y contraseña'); }} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <Input id="email" type="email" required placeholder="correo@ejemplo.com" className="h-11 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
                <Input id="password" type="password" required placeholder="••••••••" className="h-11 rounded-xl" />
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl text-white font-semibold" style={{ backgroundColor: NAVY }}>Ingresar</Button>
            </form>
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">Pinamar, Buenos Aires, Argentina</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Sidebar items
  const navSections = [
    { label: 'Principal', items: [
      { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'propiedades' as Page, label: 'Propiedades', icon: Home },
      { id: 'articulos' as Page, label: 'Artículos', icon: FileText },
      { id: 'mensajes' as Page, label: 'Mensajes', icon: Mail },
      { id: 'tasaciones' as Page, label: 'Tasaciones', icon: ClipboardCheck },
    ]},
    { label: 'Portales', items: [
      { id: 'mercadolibre' as Page, label: 'Mercado Libre', icon: ShoppingCart },
      { id: 'zonaprop' as Page, label: 'ZonaProp', icon: Building },
      { id: 'cabaprop' as Page, label: 'CabaProp', icon: Building },
      { id: 'redes' as Page, label: 'Redes', icon: Link2 },
    ]},
    { label: 'Administración', items: [
      { id: 'usuarios' as Page, label: 'Usuarios', icon: Users },
      { id: 'respaldo' as Page, label: 'Respaldo', icon: Database },
    ]},
  ]

  const navigate = (page: Page) => {
    setCurrentPage(page)
    setSidebarOpen(false)
    setEditingPropertyId(null)
    setEditingArticleId(null)
  }

  // ======================== RENDER PAGES ========================

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage onNavigate={navigate} />
      case 'propiedades': return <PropertiesPage onNavigate={navigate} onEdit={(id) => { setEditingPropertyId(id); setCurrentPage('propiedad-form') }} />
      case 'propiedad-form': return <PropertyFormPage propertyId={editingPropertyId} onBack={() => setCurrentPage('propiedades')} />
      case 'articulos': return <ArticlesPage onNavigate={navigate} onEdit={(id) => { setEditingArticleId(id); setCurrentPage('articulo-form') }} />
      case 'articulo-form': return <ArticleFormPage articleId={editingArticleId} onBack={() => setCurrentPage('articulos')} />
      case 'mensajes': return <MessagesPage />
      case 'tasaciones': return <TasacionesPage />
      case 'mercadolibre': return <MercadoLibrePage />
      case 'zonaprop': return <ZonaPropPage />
      case 'cabaprop': return <CabaPropPage />
      case 'redes': return <RedesPage />
      case 'usuarios': return <UsuariosPage />
      case 'respaldo': return <RespaldoPage />
      default: return <DashboardPage onNavigate={navigate} />
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 z-40 h-full w-64 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ backgroundColor: NAVY }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'rgba(198,153,62,0.2)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(198,153,62,0.2)' }}>
            <Home className="w-6 h-6" style={{ color: GOLD }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">FZ Inmobiliaria</p>
            <p className="text-xs truncate" style={{ color: '#8B99B3' }}>Panel Admin</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {navSections.map((section) => (
            <div key={section.label} className="mb-6">
              <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#51668D' }}>{section.label}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = currentPage === item.id
                  return (
                    <button key={item.id} onClick={() => navigate(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'text-white' : 'hover:bg-white/10 hover:text-white'}`} style={isActive ? { background: 'rgba(198,153,62,0.15)', color: GOLD, borderRight: `3px solid ${GOLD}` } : { color: '#C5CCD9' }}>
                      <item.icon className="w-5 h-5 shrink-0" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <ChevronRight className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-semibold" style={{ color: NAVY }}>{pageTitle(currentPage)}</h2>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
              </button>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: NAVY }}>
                  <span className="text-white text-sm font-bold">A</span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-700">Admin</p>
                  <p className="text-xs text-gray-400">Superadmin</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" onClick={() => setAuthenticated(false)} title="Cerrar sesión">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

// ============================================================
// HELPER
// ============================================================

function pageTitle(page: Page): string {
  const titles: Record<Page, string> = {
    dashboard: 'Dashboard', propiedades: 'Propiedades', 'propiedad-form': 'Propiedad',
    articulos: 'Artículos', 'articulo-form': 'Artículo', mensajes: 'Mensajes',
    tasaciones: 'Tasaciones', mercadolibre: 'Mercado Libre', zonaprop: 'ZonaProp',
    cabaprop: 'CabaProp', redes: 'Redes', usuarios: 'Usuarios', respaldo: 'Respaldo'
  }
  return titles[page] || 'Dashboard'
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'Ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return d.toLocaleDateString('es-AR')
}

// ============================================================
// DASHBOARD PAGE
// ============================================================

function DashboardPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Bienvenido, Admin</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen de la actividad de tu inmobiliaria</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Visitas hoy', value: '42', icon: EyeIcon, color: 'blue' },
          { label: 'Propiedades', value: '24', sub: '18 activas', icon: Home, color: 'emerald' },
          { label: 'Artículos', value: '8', icon: FileText, color: 'purple' },
          { label: 'Mensajes', value: '15', sub: '4 sin leer', icon: Mail, color: 'amber' },
          { label: 'Tasaciones', value: '7', sub: '3 pendientes', icon: ClipboardCheck, color: 'rose' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 lg:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</span>
              <div className={`w-8 h-8 bg-${s.color}-50 rounded-lg flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 text-${s.color}-500`} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: NAVY }}>{s.value}</p>
            {s.sub && <p className="text-xs text-gray-400 mt-1">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={() => onNavigate('propiedad-form')} className="rounded-xl text-white gap-2" style={{ backgroundColor: NAVY }}>
          <Plus className="w-4 h-4" /> Nueva Propiedad
        </Button>
        <Button variant="outline" onClick={() => onNavigate('articulo-form')} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Nuevo Artículo
        </Button>
        <Button variant="outline" onClick={() => onNavigate('mensajes')} className="rounded-xl gap-2">
          <Mail className="w-4 h-4" /> Ver Mensajes
        </Button>
        <Button variant="outline" onClick={() => onNavigate('respaldo')} className="rounded-xl gap-2">
          <Database className="w-4 h-4" /> Crear Respaldo
        </Button>
      </div>

      {/* Chart + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2 border-gray-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle style={{ color: NAVY }}>Visitas</CardTitle>
              <Badge variant="secondary" className="rounded-lg">Últimos 14 días</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <AreaChart data={visitData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="visitas" stroke={GOLD} fill={`url(#fillVisitas)`} strokeWidth={2.5} />
                <defs>
                  <linearGradient id="fillVisitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle style={{ color: NAVY }}>Propiedades Recientes</CardTitle>
              <button onClick={() => onNavigate('propiedades')} className="text-xs font-medium" style={{ color: GOLD }}>Ver todas →</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-72 overflow-y-auto">
            {mockProperties.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => onNavigate('propiedades')}>
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                  <Home className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                  <p className="text-xs text-gray-400">{PROPERTY_TYPES[p.type]} · {OPERATION_TYPES[p.operation]}</p>
                </div>
                <Badge variant={p.active ? 'default' : 'secondary'} className={`text-[10px] ${p.active ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-100' : ''}`}>
                  {p.active ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle style={{ color: NAVY }}>Mensajes Recientes</CardTitle>
              <button onClick={() => onNavigate('mensajes')} className="text-xs font-medium" style={{ color: GOLD }}>Ver todos →</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-72 overflow-y-auto">
            {mockMessages.map(m => (
              <div key={m.id} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${!m.read ? 'bg-amber-50/50' : ''}`}>
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm truncate ${!m.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{m.name}</p>
                  <p className="text-xs text-gray-400 truncate">{m.subject}</p>
                </div>
                <span className="text-xs text-gray-400">{timeAgo(m.createdAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle style={{ color: NAVY }}>Tasaciones Recientes</CardTitle>
              <button onClick={() => onNavigate('tasaciones')} className="text-xs font-medium" style={{ color: GOLD }}>Ver todas →</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-72 overflow-y-auto">
            {mockTasaciones.map(t => (
              <div key={t.id} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${!t.contacted ? 'bg-rose-50/50' : ''}`}>
                <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center shrink-0">
                  <ClipboardCheck className="w-5 h-5 text-rose-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.nombre}</p>
                  <p className="text-xs text-gray-400">{t.tipoPropiedad} · {t.telefono}</p>
                </div>
                <Badge variant={t.contacted ? 'default' : 'destructive'} className={`text-[10px] ${t.contacted ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-100' : ''}`}>
                  {t.contacted ? 'Contactado' : 'Pendiente'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// PROPERTIES PAGE
// ============================================================

function PropertiesPage({ onNavigate, onEdit }: { onNavigate: (p: Page) => void; onEdit: (id: string) => void }) {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [opFilter, setOpFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = mockProperties.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.location.toLowerCase().includes(search.toLowerCase()) && !p.code.toLowerCase().includes(search.toLowerCase())) return false
    if (opFilter && p.operation !== opFilter) return false
    if (typeFilter && p.type !== typeFilter) return false
    return true
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Propiedades</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} propiedades encontradas</p>
        </div>
        <Button onClick={() => onNavigate('propiedad-form')} className="rounded-xl text-white gap-2" style={{ backgroundColor: NAVY }}>
          <Plus className="w-4 h-4" /> Nueva Propiedad
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Buscar por título, ubicación, código..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl h-10" />
            </div>
          </div>
          <Select value={opFilter} onValueChange={setOpFilter}>
            <SelectTrigger className="w-full md:w-[180px] rounded-xl"><SelectValue placeholder="Operación" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(OPERATION_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px] rounded-xl"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(PROPERTY_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <Button variant={view === 'grid' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-lg" onClick={() => setView('grid')} style={view === 'grid' ? { backgroundColor: NAVY } : {}}>
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button variant={view === 'list' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-lg" onClick={() => setView('list')} style={view === 'list' ? { backgroundColor: NAVY } : {}}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Properties */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
              <div className="relative h-44 bg-gray-100 flex items-center justify-center">
                <Home className="w-12 h-12 text-gray-300" />
                <Badge className={`absolute top-2 right-2 text-white ${p.operation === 'venta' ? 'bg-emerald-500' : p.operation === 'alquiler' ? 'bg-blue-500' : 'bg-amber-500'}`}>
                  {OPERATION_TYPES[p.operation]}
                </Badge>
                {p.featured && <Badge className="absolute bottom-2 left-2 text-white" style={{ backgroundColor: GOLD }}>★ Destacada</Badge>}
                {p.label && <Badge className={`absolute top-2 left-2 text-white ${p.label === 'VENDIDO' ? 'bg-rose-500' : 'bg-amber-500'}`}>{p.label}</Badge>}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{p.title}</h3>
                  <span className="text-xs font-mono text-gray-400 shrink-0">{p.code}</span>
                </div>
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{p.location}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  {p.bedrooms > 0 && <span>{p.bedrooms} dorm</span>}
                  {p.bathrooms > 0 && <span>{p.bathrooms} baños</span>}
                  {p.area > 0 && <span>{p.area} m²</span>}
                </div>
                <p className="text-lg font-bold mb-3" style={{ color: NAVY }}>{p.price}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-lg ${p.featured ? 'text-amber-500 bg-amber-50' : 'text-gray-400'}`}><Star className="w-4 h-4" fill={p.featured ? GOLD : 'none'} /></Button>
                    <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-lg ${p.active ? 'text-emerald-500 bg-emerald-50' : 'text-gray-400'}`}><EyeIcon className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-navy-500" onClick={() => onEdit(p.id)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-rose-500" onClick={() => setDeleteId(p.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex w-16 h-16 bg-gray-100 rounded-lg items-center justify-center shrink-0"><Home className="w-8 h-8 text-gray-300" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{p.title}</h3>
                    <Badge className={`text-white text-[10px] ${p.operation === 'venta' ? 'bg-emerald-500' : p.operation === 'alquiler' ? 'bg-blue-500' : 'bg-amber-500'}`}>{OPERATION_TYPES[p.operation]}</Badge>
                    {p.label && <Badge className={`text-white text-[10px] ${p.label === 'VENDIDO' ? 'bg-rose-500' : 'bg-amber-500'}`}>{p.label}</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{p.location} · {PROPERTY_TYPES[p.type]} · {p.code}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color: NAVY }}>{p.price}</p>
                  <p className="text-xs text-gray-400">{p.bedrooms} dorm · {p.area} m²</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-navy-500" onClick={() => onEdit(p.id)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-rose-500" onClick={() => setDeleteId(p.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar Propiedad</DialogTitle></DialogHeader>
          <p className="text-gray-600 text-sm">¿Está seguro de que desea eliminar esta propiedad? Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="rounded-xl">Cancelar</Button>
            <Button variant="destructive" onClick={() => setDeleteId(null)} className="rounded-xl">Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// PROPERTY FORM PAGE
// ============================================================

function PropertyFormPage({ propertyId, onBack }: { propertyId: string | null; onBack: () => void }) {
  const isEdit = !!propertyId
  const p = isEdit ? mockProperties.find(x => x.id === propertyId) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-lg"><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>{isEdit ? 'Editar' : 'Nueva'} Propiedad</h1>
            <p className="text-gray-500 text-sm">{isEdit ? `Editando: ${p?.title}` : 'Complete los datos de la propiedad'}</p>
          </div>
        </div>
        <Button className="rounded-xl text-white gap-2" style={{ backgroundColor: NAVY }}>
          <Check className="w-4 h-4" /> Guardar
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card className="border-gray-100">
            <CardHeader><CardTitle style={{ color: NAVY }}>Información Básica</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <Input defaultValue={p?.title} placeholder="Ej: Casa 3 dormitorios en Pinamar" className="rounded-xl h-11" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <Select defaultValue={p?.type || 'casa'}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PROPERTY_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operación *</label>
                <Select defaultValue={p?.operation || 'venta'}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(OPERATION_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                <Input defaultValue={p?.price} placeholder="Ej: USD 150.000" className="rounded-xl h-11" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                <Input defaultValue={p?.location} placeholder="Ej: Av. Del Libertador 500, Pinamar" className="rounded-xl h-11" />
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="border-gray-100">
            <CardHeader><CardTitle style={{ color: NAVY }}>Detalles</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Dormitorios', id: 'bedrooms', val: p?.bedrooms || 0 },
                { label: 'Baños', id: 'bathrooms', val: p?.bathrooms || 0 },
                { label: 'Superficie (m²)', id: 'area', val: p?.area || 0 },
                { label: 'Sup. Cubierta', id: 'coveredArea', val: 0 },
                { label: 'Sup. Total', id: 'totalArea', val: 0 },
                { label: 'Ambientes', id: 'rooms', val: 0 },
                { label: 'Cocheras', id: 'parkingLots', val: 0 },
                { label: 'Huéspedes', id: 'guests', val: 0 },
              ].map(f => (
                <div key={f.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <Input type="number" defaultValue={f.val} min={0} className="rounded-xl h-10" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="border-gray-100">
            <CardHeader><CardTitle style={{ color: NAVY }}>Descripción</CardTitle></CardHeader>
            <CardContent>
              <Textarea rows={6} placeholder="Descripción detallada de la propiedad..." className="rounded-xl" />
            </CardContent>
          </Card>

          {/* Images */}
          <Card className="border-gray-100">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle style={{ color: NAVY }}>Imágenes</CardTitle>
                <Button variant="outline" className="rounded-xl gap-2"><Upload className="w-4 h-4" /> Agregar</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Arrastre imágenes aquí o haga clic en "Agregar"</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Status */}
          <Card className="border-gray-100">
            <CardHeader><CardTitle style={{ color: NAVY }}>Estado</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox id="published" defaultChecked /><label htmlFor="published" className="text-sm text-gray-700">Publicada</label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="featured" defaultChecked={p?.featured} /><label htmlFor="featured" className="text-sm text-gray-700">Destacada</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta</label>
                <Select defaultValue={p?.label || 'none'}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin etiqueta</SelectItem>
                    <SelectItem value="RESERVADO">RESERVADO</SelectItem>
                    <SelectItem value="VENDIDO">VENDIDO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Extras */}
          <Card className="border-gray-100">
            <CardHeader><CardTitle style={{ color: NAVY }}>Extras / Servicios</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {['Pileta', 'Parrilla', 'Cochera', 'Jardín', 'Terraza', 'Balcón', 'Lavadero', 'Patio', 'Aire acond.', 'Calefacción', 'Gas natural', 'WiFi'].map(ex => (
                  <div key={ex} className="flex items-center gap-2">
                    <Checkbox id={`ex-${ex}`} /><label htmlFor={`ex-${ex}`} className="text-sm text-gray-700">{ex}</label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ML Amenities */}
          <Card className="border-gray-100">
            <CardHeader><CardTitle style={{ color: NAVY }}>Amenities ML</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {['Pileta', 'Parrilla', 'Gimnasio', 'Jardín', 'Terraza', 'Balcón', 'Lavadero', 'Calefacción', 'Aire acond.', 'Gas natural', 'Hogar', 'Pet friendly'].map(am => (
                  <div key={am} className="flex items-center gap-2">
                    <Checkbox id={`am-${am}`} /><label htmlFor={`am-${am}`} className="text-sm text-gray-700">{am}</label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Map placeholder */}
          <Card className="border-gray-100">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle style={{ color: NAVY }}>Ubicación</CardTitle>
                <Button variant="outline" size="sm" className="rounded-lg gap-1"><MapPin className="w-3.5 h-3.5" /> Buscar</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="text-xs text-gray-500">Latitud</label><Input defaultValue="-37.1067" className="h-9 rounded-lg text-xs" /></div>
                <div><label className="text-xs text-gray-500">Longitud</label><Input defaultValue="-56.8688" className="h-9 rounded-lg text-xs" /></div>
              </div>
              <div className="h-48 bg-gray-100 rounded-xl flex items-center justify-center">
                <div className="text-center"><MapPin className="w-8 h-8 text-gray-300 mx-auto mb-1" /><p className="text-xs text-gray-400">Mapa interactivo (Leaflet)</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// ARTICLES PAGE
// ============================================================

function ArticlesPage({ onNavigate, onEdit }: { onNavigate: (p: Page) => void; onEdit: (id: string) => void }) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold" style={{ color: NAVY }}>Artículos</h1><p className="text-gray-500 text-sm mt-1">{mockArticles.length} artículos</p></div>
        <Button onClick={() => onNavigate('articulo-form')} className="rounded-xl text-white gap-2" style={{ backgroundColor: NAVY }}><Plus className="w-4 h-4" /> Nuevo Artículo</Button>
      </div>
      <div className="space-y-3">
        {mockArticles.map(a => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex w-20 h-20 bg-gray-100 rounded-xl items-center justify-center shrink-0"><FileText className="w-8 h-8 text-gray-300" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{a.title}</h3>
                  <Badge className={`text-[10px] ${a.active ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500'}`}>{a.active ? 'Publicado' : 'Borrador'}</Badge>
                </div>
                <p className="text-xs text-gray-500 line-clamp-1 mb-1">{a.excerpt}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400"><span>{a.category}</span><span>{a.readTime}</span><span>{new Date(a.createdAt).toLocaleDateString('es-AR')}</span></div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-navy-500" onClick={() => onEdit(a.id)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-rose-500" onClick={() => setDeleteId(a.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Eliminar Artículo</DialogTitle></DialogHeader><p className="text-gray-600 text-sm">¿Está seguro de que desea eliminar este artículo?</p><DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)} className="rounded-xl">Cancelar</Button><Button variant="destructive" onClick={() => setDeleteId(null)} className="rounded-xl">Eliminar</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// ARTICLE FORM PAGE
// ============================================================

function ArticleFormPage({ articleId, onBack }: { articleId: string | null; onBack: () => void }) {
  const a = articleId ? mockArticles.find(x => x.id === articleId) : null
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-lg"><ArrowLeft className="w-5 h-5" /></Button>
          <div><h1 className="text-2xl font-bold" style={{ color: NAVY }}>{a ? 'Editar' : 'Nuevo'} Artículo</h1><p className="text-gray-500 text-sm">{a ? `Editando: ${a.title}` : 'Complete los datos del artículo'}</p></div>
        </div>
        <Button className="rounded-xl text-white gap-2" style={{ backgroundColor: NAVY }}><Check className="w-4 h-4" /> Guardar</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-gray-100">
            <CardContent className="pt-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Título *</label><Input defaultValue={a?.title} placeholder="Título del artículo" className="rounded-xl h-11 text-lg font-semibold" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Resumen</label><Textarea rows={2} defaultValue={a?.excerpt} placeholder="Breve resumen..." className="rounded-xl" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Contenido</label><Textarea rows={15} placeholder="Escriba el contenido aquí..." className="rounded-xl font-mono" /></div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="border-gray-100"><CardHeader><CardTitle className="text-sm" style={{ color: NAVY }}>Imagen de Portada</CardTitle></CardHeader><CardContent><div className="w-full aspect-video bg-gray-100 rounded-xl flex items-center justify-center mb-3"><Upload className="w-8 h-8 text-gray-300" /></div><Button variant="outline" className="w-full rounded-xl">Subir imagen</Button></CardContent></Card>
          <Card className="border-gray-100"><CardHeader><CardTitle className="text-sm" style={{ color: NAVY }}>Categoría</CardTitle></CardHeader><CardContent><Select defaultValue={a?.category || 'general'}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{['general', 'mercado', 'consejos', 'pinamar', 'tendencias', 'legislacion'].map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent></Select></CardContent></Card>
          <Card className="border-gray-100"><CardHeader><CardTitle className="text-sm" style={{ color: NAVY }}>Tiempo de Lectura</CardTitle></CardHeader><CardContent><Input defaultValue={a?.readTime || '5 min'} className="rounded-xl" /></CardContent></Card>
          <Card className="border-gray-100"><CardHeader><CardTitle className="text-sm" style={{ color: NAVY }}>Publicado</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Checkbox id="art-pub" defaultChecked={a?.active} /><label htmlFor="art-pub" className="text-sm">Publicado</label></div></CardContent></Card>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MESSAGES PAGE
// ============================================================

function MessagesPage() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [selectedMsg, setSelectedMsg] = useState<typeof mockMessages[0] | null>(null)

  const filtered = filter === 'all' ? mockMessages : filter === 'unread' ? mockMessages.filter(m => !m.read) : mockMessages.filter(m => m.read)
  const unread = mockMessages.filter(m => !m.read).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold" style={{ color: NAVY }}>Mensajes</h1><p className="text-gray-500 text-sm mt-1">{mockMessages.length} mensajes · {unread} sin leer</p></div>
        <div className="flex gap-2">
          {(['all', 'unread', 'read'] as const).map(f => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} className="rounded-xl" style={filter === f ? { backgroundColor: NAVY } : {}} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Todos' : f === 'unread' ? 'No leídos' : 'Leídos'}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {filtered.map(m => (
          <div key={m.id} className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-all cursor-pointer ${!m.read ? 'border-amber-200 bg-amber-50/20' : 'border-gray-100'}`} onClick={() => setSelectedMsg(m)}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!m.read ? 'bg-amber-100' : 'bg-gray-100'}`}>
                <Mail className={`w-5 h-5 ${!m.read ? 'text-amber-500' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className={`text-sm truncate ${!m.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{m.name}</h3>
                  <span className="text-xs text-gray-400">{timeAgo(m.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-500 mb-1">{m.email}{m.phone ? ` · ${m.phone}` : ''}</p>
                <p className="text-xs font-medium text-gray-700 mb-1">{m.subject}</p>
                <p className="text-sm text-gray-600 line-clamp-2">{m.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!selectedMsg} onOpenChange={() => setSelectedMsg(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalle del Mensaje</DialogTitle></DialogHeader>
          {selectedMsg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-400">Nombre</p><p className="text-sm font-medium">{selectedMsg.name}</p></div>
                <div><p className="text-xs text-gray-400">Email</p><a href={`mailto:${selectedMsg.email}`} className="text-sm font-medium text-blue-500 hover:underline">{selectedMsg.email}</a></div>
                <div><p className="text-xs text-gray-400">Teléfono</p><p className="text-sm font-medium">{selectedMsg.phone || 'No proporcionado'}</p></div>
                <div><p className="text-xs text-gray-400">Asunto</p><p className="text-sm font-medium">{selectedMsg.subject}</p></div>
              </div>
              <div><p className="text-xs text-gray-400 mb-2">Mensaje</p><div className="bg-gray-50 rounded-xl p-4"><p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedMsg.message}</p></div></div>
              <div className="flex gap-2">
                <a href={`mailto:${selectedMsg.email}?subject=Re: ${selectedMsg.subject}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: NAVY }}><Mail className="w-4 h-4" /> Responder</a>
                <Button variant="outline" className="rounded-xl text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4 mr-2" /> Eliminar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// TASACIONES PAGE
// ============================================================

function TasacionesPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'contacted'>('all')
  const filtered = filter === 'all' ? mockTasaciones : filter === 'pending' ? mockTasaciones.filter(t => !t.contacted) : mockTasaciones.filter(t => t.contacted)
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold" style={{ color: NAVY }}>Tasaciones</h1><p className="text-gray-500 text-sm mt-1">{mockTasaciones.length} tasaciones · {mockTasaciones.filter(t => !t.contacted).length} pendientes</p></div>
        <div className="flex gap-2">
          {(['all', 'pending', 'contacted'] as const).map(f => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} className="rounded-xl" style={filter === f ? { backgroundColor: NAVY } : {}} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Contactados'}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {filtered.map(t => (
          <div key={t.id} className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-all ${!t.contacted ? 'border-rose-200 bg-rose-50/20' : 'border-gray-100'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!t.contacted ? 'bg-rose-100' : 'bg-emerald-100'}`}>
                <ClipboardCheck className={`w-5 h-5 ${!t.contacted ? 'text-rose-500' : 'text-emerald-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className={`text-sm truncate ${!t.contacted ? 'font-bold text-gray-900' : 'font-medium'}`}>{t.nombre}</h3>
                  <span className="text-xs text-gray-400">{timeAgo(t.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-500">{t.telefono}{t.email ? ` · ${t.email}` : ''}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{t.tipoPropiedad}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{t.zona}</Badge>
                  <Badge className={`text-[10px] ${t.contacted ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-100' : 'bg-rose-100 text-rose-600 hover:bg-rose-100'}`}>{t.contacted ? 'Contactado' : 'Pendiente'}</Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-lg ${t.contacted ? 'text-emerald-500' : 'text-rose-500'}`}><Check className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// SIMPLER PAGES (Placeholders with real content)
// ============================================================

function MercadoLibrePage() {
  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold" style={{ color: NAVY }}>Mercado Libre</h1><p className="text-gray-500 text-sm mt-1">Gestiona la integración con Mercado Libre Propiedades</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-100"><CardHeader><CardTitle style={{ color: NAVY }}>Estado de Conexión</CardTitle></CardHeader><CardContent>
          <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl">
            <ShoppingCart className="w-8 h-8 text-amber-500" />
            <div className="flex-1"><p className="text-sm font-medium text-gray-900">Configurado - No conectado</p><p className="text-xs text-gray-500">Autorice la aplicación para publicar</p></div>
            <Button className="rounded-xl bg-yellow-400 hover:bg-yellow-500 text-gray-900">Conectar</Button>
          </div>
        </CardContent></Card>
        <Card className="border-gray-100"><CardHeader><CardTitle style={{ color: NAVY }}>Configuración</CardTitle></CardHeader><CardContent className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">App ID</label><Input placeholder="ID de aplicación" className="rounded-xl" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">App Secret</label><Input type="password" placeholder="Secret" className="rounded-xl" /></div>
          <Button className="rounded-xl text-white" style={{ backgroundColor: NAVY }}>Guardar Configuración</Button>
        </CardContent></Card>
      </div>
    </div>
  )
}

function ZonaPropPage() {
  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold" style={{ color: NAVY }}>ZonaProp</h1><p className="text-gray-500 text-sm mt-1">Gestiona la integración con ZonaProp</p></div>
      <Card className="border-gray-100 mb-6"><CardHeader><CardTitle style={{ color: NAVY }}>URL del Feed XML</CardTitle></CardHeader><CardContent>
        <p className="text-sm text-gray-600 mb-3">Proporcione esta URL a ZonaProp para que importe sus propiedades automáticamente.</p>
        <div className="flex gap-2"><Input readOnly value="https://fzacaria.rf.gd/api/redes.php?action=zp-feed" className="rounded-xl font-mono text-sm bg-gray-50" /><Button className="rounded-xl text-white shrink-0" style={{ backgroundColor: NAVY }}>Copiar</Button></div>
      </CardContent></Card>
      <Card className="border-gray-100"><CardHeader><CardTitle style={{ color: NAVY }}>Propiedades en ZonaProp</CardTitle></CardHeader><CardContent>
        <div className="space-y-2">{mockProperties.filter(p => p.active).map(p => (
          <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
            <Checkbox defaultChecked={p.featured} /><span className="text-sm text-gray-700">{p.title}</span><span className="text-xs text-gray-400 ml-auto">{p.code}</span>
          </div>
        ))}</div>
      </CardContent></Card>
    </div>
  )
}

function CabaPropPage() {
  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold" style={{ color: NAVY }}>CabaProp</h1><p className="text-gray-500 text-sm mt-1">Gestiona la integración con CabaProp</p></div>
      <Card className="border-gray-100 mb-6"><CardHeader><CardTitle style={{ color: NAVY }}>Configuración</CardTitle></CardHeader><CardContent className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">API Key</label><Input type="password" placeholder="API Key de CabaProp" className="rounded-xl" /></div>
        <Button className="rounded-xl text-white" style={{ backgroundColor: NAVY }}>Guardar</Button>
      </CardContent></Card>
      <Card className="border-gray-100"><CardHeader><CardTitle style={{ color: NAVY }}>Activar/Desactivar Propiedades</CardTitle></CardHeader><CardContent>
        <div className="space-y-2">{mockProperties.filter(p => p.active).map(p => (
          <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
            <Checkbox /><span className="text-sm text-gray-700">{p.title}</span><span className="text-xs text-gray-400 ml-auto">{p.code}</span>
          </div>
        ))}</div>
      </CardContent></Card>
    </div>
  )
}

function RedesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold" style={{ color: NAVY }}>Redes</h1><p className="text-gray-500 text-sm mt-1">Gestiona tus redes inmobiliarias</p></div>
        <Button className="rounded-xl text-white gap-2" style={{ backgroundColor: NAVY }}><Plus className="w-4 h-4" /> Nueva Red</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="border-gray-100"><CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3"><h3 className="text-base font-semibold" style={{ color: NAVY }}>Red Pinamar Centro</h3><Badge className="bg-emerald-100 text-emerald-600 hover:bg-emerald-100">Pública</Badge></div>
          <p className="text-sm text-gray-500 mb-3">Red de inmobiliarias de Pinamar y zona centro</p>
          <div className="flex items-center gap-4 text-xs text-gray-400 mb-3"><span>Pinamar</span><span>Comisión: 50%</span><span>3 miembros</span></div>
        </CardContent></Card>
        <Card className="border-gray-100"><CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3"><h3 className="text-base font-semibold" style={{ color: NAVY }}>Red Costa Atlántica</h3><Badge variant="secondary">Privada</Badge></div>
          <p className="text-sm text-gray-500 mb-3">Red exclusiva de la costa atlántica</p>
          <div className="flex items-center gap-4 text-xs text-gray-400 mb-3"><span>Cariló</span><span>Comisión: 40%</span><span>5 miembros</span></div>
        </CardContent></Card>
      </div>
    </div>
  )
}

function UsuariosPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold" style={{ color: NAVY }}>Usuarios</h1><p className="text-gray-500 text-sm mt-1">Gestión de usuarios del panel</p></div>
        <Button className="rounded-xl text-white gap-2" style={{ backgroundColor: NAVY }}><Plus className="w-4 h-4" /> Nuevo Usuario</Button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Último login</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { name: 'Florencia Zacaría', email: 'info@fzacaria.com.ar', role: 'superadmin', active: true, lastLogin: '2025-01-15' },
                { name: 'Martín López', email: 'martin@fzacaria.com.ar', role: 'admin', active: true, lastLogin: '2025-01-14' },
                { name: 'Carolina Ruiz', email: 'carolina@fzacaria.com.ar', role: 'editor', active: false, lastLogin: '2025-01-10' },
              ].map((u, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: NAVY }}><span className="text-white text-sm font-bold">{u.name[0]}</span></div><div><p className="text-sm font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></div></div></td>
                  <td className="px-4 py-3"><Badge className={`text-[10px] ${u.role === 'superadmin' ? 'bg-amber-100 text-amber-600 hover:bg-amber-100' : u.role === 'admin' ? 'bg-blue-50 text-blue-500 hover:bg-blue-50' : 'bg-gray-100 text-gray-600 hover:bg-gray-100'}`}>{u.role}</Badge></td>
                  <td className="px-4 py-3"><Badge className={`text-[10px] ${u.active ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-100' : 'bg-rose-100 text-rose-600 hover:bg-rose-100'}`}>{u.active ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="px-4 py-3 text-sm text-gray-400">{new Date(u.lastLogin).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-3 text-right"><div className="flex gap-1 justify-end"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-navy-500"><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></Button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function RespaldoPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold" style={{ color: NAVY }}>Respaldo</h1><p className="text-gray-500 text-sm mt-1">Crea y gestiona copias de seguridad</p></div>
        <Button className="rounded-xl text-white gap-2" style={{ backgroundColor: NAVY }}><Plus className="w-4 h-4" /> Crear Respaldo</Button>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div><p className="text-sm font-medium text-blue-800">Sobre los respaldos</p><p className="text-xs text-blue-600 mt-1">Los respaldos incluyen todas las propiedades, artículos, mensajes y configuraciones.</p></div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tamaño</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { date: '2025-01-15 10:00', type: 'Manual', size: '1.2 MB', status: 'Completado' },
              { date: '2025-01-14 10:00', type: 'Automático', size: '1.1 MB', status: 'Completado' },
              { date: '2025-01-13 10:00', type: 'Automático', size: '1.1 MB', status: 'Completado' },
            ].map((b, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{b.date}</td>
                <td className="px-4 py-3"><Badge variant={b.type === 'Manual' ? 'default' : 'secondary'} className={`text-[10px] ${b.type === 'Manual' ? 'bg-navy-50 text-blue-600 hover:bg-navy-50' : ''}`}>{b.type}</Badge></td>
                <td className="px-4 py-3 text-sm text-gray-500">{b.size}</td>
                <td className="px-4 py-3"><Badge className="bg-emerald-100 text-emerald-600 hover:bg-emerald-100 text-[10px]">✓ {b.status}</Badge></td>
                <td className="px-4 py-3 text-right"><div className="flex gap-1 justify-end"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-blue-500 hover:bg-blue-50"><RefreshCw className="w-4 h-4" /></Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
