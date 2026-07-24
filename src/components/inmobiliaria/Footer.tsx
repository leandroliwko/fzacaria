'use client'

import { motion } from 'framer-motion'
import {
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  MessageCircle,
  ArrowUp,
  Heart,
} from 'lucide-react'

const footerLinks = {
  propiedades: [
    { label: 'Casas en Venta', href: '#propiedades' },
    { label: 'Departamentos en Alquiler', href: '#propiedades' },
    { label: 'Chalets Premium', href: '#propiedades' },
    { label: 'Lotes y Terrenos', href: '#propiedades' },
    { label: 'Campos', href: '#propiedades' },
    { label: 'Locales Comerciales', href: '#propiedades' },
  ],
  servicios: [
    { label: 'Venta de Propiedades', href: '#servicios' },
    { label: 'Alquileres', href: '#servicios' },
    { label: 'Tasaciones', href: '#tasacion' },
    { label: 'Administración', href: '#servicios' },
    { label: 'Mantenimiento del Hogar', href: '#servicios' },
    { label: 'Alquileres Temporarios', href: '#servicios' },
  ],
  zonas: [
    { label: 'Pinamar', href: '#propiedades' },
    { label: 'Cariló', href: '#propiedades' },
    { label: 'Valeria del Mar', href: '#propiedades' },
    { label: 'Ostende', href: '#propiedades' },
    { label: 'Tandil', href: '#propiedades' },
    { label: 'Balcarce', href: '#propiedades' },
  ],
}

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="relative text-white overflow-hidden">
      {/* Background image with dark overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/footer-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/95 via-navy-dark/90 to-navy-dark/98" />

      {/* Main Footer */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <a href="#inicio" className="inline-block mb-5">
              <img
                src="/logotipo-florencia-zacaria-1.png"
                alt="Florencia Zacaría Inmobiliaria"
                className="h-14 w-auto"
              />
            </a>
            <p className="text-white/50 text-sm leading-relaxed mb-5">
              Inmobiliaria con más de 9 años de experiencia en venta y alquiler de
              propiedades en la Costa Atlántica y zona serrana.
            </p>

            {/* Contact Quick */}
            <div className="space-y-3">
              <a
                href="tel:+5492254449764"
                className="flex items-center gap-2 text-white/60 hover:text-gold transition-colors text-sm"
              >
                <Phone className="w-4 h-4" />
                2254449764
              </a>
              <a
                href="mailto:info@florenciazacariainmobiliaria.com.ar"
                className="flex items-center gap-2 text-white/60 hover:text-gold transition-colors text-sm"
              >
                <Mail className="w-4 h-4" />
                info@florenciazacariainmobiliaria.com.ar
              </a>
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <MapPin className="w-4 h-4" />
                Jupiter 339, Local 1, Pinamar
              </div>
              <p className="text-white/40 text-xs mt-1">Mat. 1631 | Folio 975 | Tomo III</p>
            </div>

            {/* Social */}
            <div className="flex gap-3 mt-5">
              {[
                { icon: Instagram, href: 'https://www.instagram.com/florenciazacaria.inmobiliaria', label: 'Instagram' },
                { icon: Facebook, href: 'https://www.facebook.com/sol.pinamarense', label: 'Facebook' },
                { icon: MessageCircle, href: 'https://wa.me/5492254449764', label: 'WhatsApp' },
              ].map((social) => {
                const Icon = social.icon
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 bg-lavender/20 rounded-lg flex items-center justify-center hover:bg-gold transition-colors"
                    aria-label={social.label}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Propiedades */}
          <div>
            <h4 className="font-semibold text-gold mb-4">Propiedades</h4>
            <ul className="space-y-2.5">
              {footerLinks.propiedades.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/50 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Servicios */}
          <div>
            <h4 className="font-semibold text-gold mb-4">Servicios</h4>
            <ul className="space-y-2.5">
              {footerLinks.servicios.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/50 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Zonas */}
          <div>
            <h4 className="font-semibold text-gold mb-4">Zonas</h4>
            <ul className="space-y-2.5">
              {footerLinks.zonas.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/50 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative z-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col items-center gap-3">
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
            <div className="flex flex-col items-center sm:items-start gap-2">
              <p className="text-white/40 text-sm">
                &copy; 2025 Inmobiliaria Florencia Zacaría. Todos los derechos reservados.
              </p>
              <img
                src="/data-fiscal-fz.jpeg"
                alt="Data Fiscal - Florencia Zacaría Inmobiliaria"
                className="h-auto"
                style={{ maxHeight: '50px', width: 'auto' }}
              />
            </div>
            <div className="flex items-center gap-1 text-white/40 text-sm">
              Hecho con <Heart className="w-3 h-3 text-red-400 fill-red-400 mx-0.5" /> en
              Argentina
            </div>
          </div>
          <a
            href="https://liwko.com.ar/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 opacity-40 hover:opacity-70 transition-opacity"
          >
            <span className="text-white text-[10px]">Sitio realizado por</span>
            <img
              src="/liwkodesignblanco.png"
              alt="Liwko Design"
              className="h-8 w-auto"
            />
          </a>
        </div>
      </div>

      {/* Scroll to Top */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-24 right-6 z-40 w-10 h-10 bg-navy rounded-full flex items-center justify-center text-white shadow-lg hover:bg-gold transition-colors"
        aria-label="Volver arriba"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </footer>
  )
}
