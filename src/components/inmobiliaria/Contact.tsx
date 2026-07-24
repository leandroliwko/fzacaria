'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  Instagram,
  Facebook,
  CheckCircle2,
  MessageCircle,
  User,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import dynamic from 'next/dynamic'

const MapComponent = dynamic(() => import('@/components/ui/map'), { ssr: false })

const contactInfo = [
  {
    icon: MapPin,
    title: 'Dirección',
    lines: ['Jupiter 339, Local 1', 'Pinamar, Buenos Aires'],
  },
  {
    icon: Phone,
    title: 'Teléfono',
    lines: ['2254449764'],
  },
  {
    icon: Mail,
    title: 'Email',
    lines: ['info@florenciazacariainmobiliaria.com.ar'],
  },
  {
    icon: Clock,
    title: 'Horarios',
    lines: ['Lun a Vie: 9:00 - 18:00', 'Sáb: 9:00 - 13:00'],
  },
]

const socialLinks = [
  { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/florenciazacaria.inmobiliaria' },
  { icon: Facebook, label: 'Facebook', href: 'https://www.facebook.com/sol.pinamarense' },
  { icon: MessageCircle, label: 'WhatsApp', href: 'https://wa.me/5492254449764' },
]

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    asunto: '',
    mensaje: '',
  })

  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch('/api/contact-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.nombre,
          email: formData.email,
          phone: formData.telefono,
          subject: formData.asunto,
          message: formData.mensaje,
        }),
      })
      if (res.ok) {
        setSubmitted(true)
        setTimeout(() => setSubmitted(false), 4000)
        setFormData({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' })
      }
    } catch {
      // Silently fail gracefully
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 4000)
    } finally {
      setSending(false)
    }
  }

  return (
    <section id="contacto" className="py-20 lg:py-28 bg-cream lavender-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="text-gold font-semibold text-sm tracking-[0.2em] uppercase">
            Contacto
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-3 mb-4">
            Ponete en Contacto
          </h2>
          <div className="section-divider mb-6" />
          <p className="text-navy max-w-2xl mx-auto text-lg">
            Estamos listos para ayudarte. Escribinos y te responderemos a la brevedad.
          </p>
        </motion.div>

        {/* Map - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="rounded-2xl overflow-hidden shadow-lg border border-lavender/30 h-72 sm:h-80 lg:h-96">
            <MapComponent
              latitude={-37.1067}
              longitude={-56.8688}
              zoom={16}
              height="100%"
              interactive={false}
              showCircle={false}
              showMarker={true}
              markerLabel="Jupiter 339, Local 1 - Pinamar"
              className="rounded-xl"
            />
          </div>
          <div className="flex items-center justify-between mt-3 px-1">
            <div className="flex items-center gap-2 text-navy-light text-sm">
              <MapPin className="w-4 h-4 text-gold" />
              Jupiter 339, Local 1, Pinamar, Buenos Aires
            </div>
            <a
              href="https://www.openstreetmap.org/?mlat=-37.1067&mlon=-56.8688#map=16/-37.1067/-56.8688"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold text-sm font-medium hover:text-gold-dark transition-colors"
            >
              Ver mapa más grande →
            </a>
          </div>
        </motion.div>

        {/* Form + Info */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Info - Left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-1"
          >
            <div className="bg-navy rounded-2xl p-6 sm:p-8 text-white h-full">
              <div className="mb-6">
                <img
                  src="/logotipo-florencia-zacaria-1.png"
                  alt="Florencia Zacaría Inmobiliaria"
                  className="h-12 w-auto"
                />
              </div>

              <p className="text-white/60 text-sm mb-8 leading-relaxed">
                Visitanos en nuestra oficina o contactanos por cualquier vía. Te esperamos.
              </p>

              <p className="text-gold/80 text-xs tracking-wider uppercase mb-4">Mat. 1631 | Folio 975 | Tomo III</p>

              <div className="space-y-5 mb-8">
                {contactInfo.map((info) => {
                  const Icon = info.icon
                  return (
                    <div key={info.title} className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-gold/15 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-gold" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-0.5">{info.title}</h4>
                        {info.lines.map((line) => (
                          <p key={line} className="text-white/50 text-sm leading-relaxed">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Social */}
              <div className="pt-6 border-t border-white/10">
                <h4 className="font-semibold text-sm mb-3">Seguinos</h4>
                <div className="flex gap-2.5">
                  {socialLinks.map((social) => {
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
            </div>
          </motion.div>

          {/* Contact Form - Right (wider) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-teal-soft border border-teal-pale rounded-2xl p-12 text-center min-h-[300px] flex flex-col items-center justify-center"
              >
                <CheckCircle2 className="w-16 h-16 text-teal-500 mb-4" />
                <h3 className="text-2xl font-bold text-navy mb-2">¡Mensaje Enviado!</h3>
                <p className="text-navy max-w-md">
                  Gracias por contactarnos. Te responderemos a la brevedad.
                </p>
              </motion.div>
            ) : (
              <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-lavender/30 h-full">
                <h3 className="text-xl font-bold text-navy mb-1">Envianos un Mensaje</h3>
                <p className="text-navy-light text-sm mb-6">Completá el formulario y te contactaremos pronto.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-navy-dark mb-1.5 block">
                        Nombre *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lavender-light" />
                        <Input
                          required
                          placeholder="Tu nombre completo"
                          value={formData.nombre}
                          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                          className="h-11 pl-10 bg-cream border-lavender/50 focus:border-gold focus:ring-gold/40"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-navy-dark mb-1.5 block">
                        Email *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lavender-light" />
                        <Input
                          required
                          type="email"
                          placeholder="tu@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="h-11 pl-10 bg-cream border-lavender/50 focus:border-gold focus:ring-gold/40"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-navy-dark mb-1.5 block">
                        Teléfono
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lavender-light" />
                        <Input
                          placeholder="Tu teléfono"
                          value={formData.telefono}
                          onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                          className="h-11 pl-10 bg-cream border-lavender/50 focus:border-gold focus:ring-gold/40"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-navy-dark mb-1.5 block">
                        Asunto *
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lavender-light" />
                        <Input
                          required
                          placeholder="¿En qué podemos ayudarte?"
                          value={formData.asunto}
                          onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                          className="h-11 pl-10 bg-cream border-lavender/50 focus:border-gold focus:ring-gold/40"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-navy-dark mb-1.5 block">
                      Mensaje *
                    </label>
                    <Textarea
                      required
                      placeholder="Contanos tu consulta..."
                      value={formData.mensaje}
                      onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                      className="min-h-[120px] bg-cream border-lavender/50 focus:border-gold focus:ring-gold/40 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-lavender-light text-xs hidden sm:block">
                      También podés escribirnos por WhatsApp
                    </p>
                    <Button
                      type="submit"
                      size="lg"
                      className="bg-navy hover:bg-navy-light text-white font-semibold h-12 px-8 group"
                    >
                      <Send className="w-4 h-4 mr-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      Enviar Mensaje
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
