'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Building2,
  FileText,
  Mail,
  ClipboardCheck,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Home,
  Shield,
  ShoppingCart,
  MapPin,
  Landmark,
  Users,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface AdminInfo {
  id: string
  email: string
  name: string
  role?: string
}

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Propiedades', href: '/admin/propiedades', icon: Building2 },
  { label: 'Mercado Libre', href: '/admin/mercadolibre', icon: ShoppingCart },
  { label: 'ZonaProp', href: '/admin/zonaprop', icon: MapPin },
  { label: 'Cabaprop', href: '/admin/cabaprop', icon: Landmark },
  { label: 'Redes', href: '/admin/redes', icon: Share2 },
  { label: 'Artículos', href: '/admin/articulos', icon: FileText },
  { label: 'Mensajes', href: '/admin/mensajes', icon: Mail },
  { label: 'Tasaciones', href: '/admin/tasaciones', icon: ClipboardCheck },
  { label: 'Usuarios', href: '/admin/usuarios', icon: Users, superadminOnly: true },
  { label: 'Respaldo', href: '/admin/respaldo', icon: Shield },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [admin, setAdmin] = useState<AdminInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const res = await fetch('/api/admin/check', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setAdmin(data.admin)
      } else {
        router.push('/admin/login')
      }
    } catch {
      router.push('/admin/login')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      toast.success('Sesión cerrada')
      router.push('/admin/login')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  // Don't render layout for login page
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-navy border-t-gold rounded-full animate-spin" />
          <p className="text-navy font-medium">Cargando panel...</p>
        </div>
      </div>
    )
  }

  if (!admin) return null

  const sidebarWidth = isDesktop ? (sidebarOpen ? 260 : 72) : 0

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop Sidebar */}
      {isDesktop && (
        <motion.aside
          initial={false}
          animate={{ width: sidebarOpen ? 260 : 72 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed left-0 top-0 bottom-0 z-30 bg-navy text-white flex flex-col shadow-xl"
        >
          {/* Logo */}
          <div className="flex items-center justify-center px-4 py-5 min-h-[72px] overflow-hidden">
            <AnimatePresence>
              {sidebarOpen ? (
                <motion.img
                  key="full"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  src="/logotipo-florencia-zacaria-1.png"
                  alt="Florencia Zacaría"
                  className="h-9 w-auto max-w-[180px]"
                />
              ) : (
                <motion.img
                  key="mini"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  src="/logotipo-florencia-zacaria-1.png"
                  alt="Florencia Zacaría"
                  className="h-9 w-auto max-w-[40px] object-cover"
                />
              )}
            </AnimatePresence>
          </div>

          <Separator className="bg-lavender/20" />

          {/* Nav */}
          <ScrollArea className="flex-1 py-4">
            <nav className="flex flex-col gap-1 px-3">
              {navItems
                .filter((item) => !item.superadminOnly || admin?.role === 'superadmin')
                .map((item) => {
                const isActive = pathname === item.href
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                      isActive
                        ? 'bg-gold text-white shadow-md'
                        : 'text-white/70 hover:text-white hover:bg-lavender/20'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gold/70 group-hover:text-gold'}`} />
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-sm font-medium overflow-hidden whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </a>
                )
              })}
            </nav>
          </ScrollArea>

          {/* Bottom section */}
          <div className="px-3 pb-4">
            <Separator className="bg-lavender/20 mb-4" />
            
            {/* Back to site */}
            <a
              href="/"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-lavender/20 transition-all mb-2"
            >
              <Home className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm overflow-hidden whitespace-nowrap"
                  >
                    Ir al sitio
                  </motion.span>
                )}
              </AnimatePresence>
            </a>

            {/* Admin info */}
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                <span className="text-gold text-xs font-bold">{admin.name.charAt(0)}</span>
              </div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 overflow-hidden"
                  >
                    <p className="text-sm font-medium truncate">{admin.name}</p>
                    <p className="text-xs text-white/50 truncate">{admin.email}</p>
                    {admin.role === 'superadmin' && (
                      <p className="text-[10px] text-gold font-semibold mt-0.5 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Superadmin
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-white/60 hover:text-white hover:bg-lavender/20 mt-1"
            >
              <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
              {sidebarOpen && 'Cerrar Sesión'}
            </Button>
          </div>

          {/* Toggle button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-3 top-8 w-6 h-6 bg-cream rounded-full shadow-md flex items-center justify-center text-navy hover:bg-surface transition-colors z-40"
          >
            <ChevronLeft className={`w-3 h-3 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </motion.aside>
      )}

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy-dark/60 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-navy text-white z-50 lg:hidden shadow-xl"
          >
            <div className="flex items-center justify-between px-4 py-5">
              <div className="flex items-center gap-3">
                <img
                  src="/logotipo-florencia-zacaria-1.png"
                  alt="Florencia Zacaría"
                  className="h-9 w-auto"
                />
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <Separator className="bg-lavender/20" />

            <ScrollArea className="flex-1 py-4">
              <nav className="flex flex-col gap-1 px-3">
                {navItems
                  .filter((item) => !item.superadminOnly || admin?.role === 'superadmin')
                  .map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        isActive
                          ? 'bg-gold text-white shadow-md'
                          : 'text-white/70 hover:text-white hover:bg-lavender/20'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gold/70'}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </a>
                  )
                })}
              </nav>
            </ScrollArea>

            <div className="px-3 pb-4">
              <Separator className="bg-lavender/20 mb-4" />
              <a
                href="/"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-lavender/20 transition-all mb-2"
              >
                <Home className="w-5 h-5" />
                <span className="text-sm">Ir al sitio</span>
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-white/60 hover:text-white hover:bg-lavender/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div
        className="flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-cream border-b border-lavender/50 shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3">
              {!isDesktop && (
                <button
                  onClick={() => setMobileOpen(true)}
                  className="p-2 rounded-md text-navy hover:bg-soft"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-lg font-semibold text-navy hidden sm:block">
                Panel de Control
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-navy-light hidden sm:block">{admin.email}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-navy border-navy/20 hover:bg-navy hover:text-white"
              >
                <LogOut className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
