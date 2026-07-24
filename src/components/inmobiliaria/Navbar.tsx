'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone,
  Menu,
  X,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navLinks = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Propiedades', href: '#propiedades' },
  { label: 'Categorías', href: '#categorias' },
  { label: 'Tasación', href: '#tasacion' },
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Servicios', href: '#servicios' },
  { label: 'Blog', href: '#blog' },
  { label: 'Contacto', href: '#contacto' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-cream/95 backdrop-blur-md shadow-lg border-b border-lavender/30'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <a href="#inicio" className="flex items-center group">
              <img
                src="/logotipo-florencia-zacaria-1.png"
                alt="Florencia Zacaría Inmobiliaria"
                className={`h-18 w-auto transition-all duration-500 ${
                  scrolled ? 'logo-scrolled' : ''
                }`}
              />
            </a>

            {/* Desktop Links */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 animated-underline ${
                    scrolled
                      ? 'text-navy-dark hover:text-navy'
                      : 'text-white/90 hover:text-white'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <a href="tel:+5492255612345">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`transition-all duration-300 ${
                    scrolled
                      ? 'text-navy hover:text-gold'
                      : 'text-white hover:text-gold-light'
                  }`}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Llamar
                </Button>
              </a>
              <a href="#tasacion">
                <Button
                  size="sm"
                  className="bg-gold hover:bg-gold-dark text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Tasá tu Propiedad
                </Button>
              </a>
              <a href="/admin/login" title="Panel de Administración">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 rounded-full transition-all duration-300 ${
                    scrolled
                      ? 'text-navy/40 hover:text-gold hover:bg-gold/10'
                      : 'text-white/50 hover:text-gold-light hover:bg-lavender/20'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`lg:hidden p-2 rounded-md transition-colors ${
                scrolled ? 'text-navy' : 'text-white'
              }`}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-navy/98 backdrop-blur-lg pt-24 px-6 lg:hidden"
          >
            <div className="flex flex-col gap-2">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="text-white/90 text-xl font-medium py-3 border-b border-white/10 hover:text-gold transition-colors"
                >
                  {link.label}
                </motion.a>
              ))}
              <div className="mt-6 flex flex-col gap-3">
                <a href="tel:+5492255612345">
                  <Button
                    variant="outline"
                    className="w-full border-gold/50 text-gold hover:bg-gold/10"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Llamar Ahora
                  </Button>
                </a>
                <a href="#tasacion" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full bg-gold hover:bg-gold-dark text-white font-semibold">
                    Tasá tu Propiedad
                  </Button>
                </a>
                <a href="/admin/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full text-white/40 hover:text-gold hover:bg-lavender/10">
                    <Lock className="w-4 h-4 mr-2" />
                    Administración
                  </Button>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
