'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calculator,
  Phone,
  Mail,
  User,
  MapPin,
  FileText,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function Tasacion() {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    tipoPropiedad: '',
    tipoPropiedadOtro: '',
    zona: '',
    mensaje: '',
  })

  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch('/api/tasaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          telefono: formData.telefono,
          email: formData.email,
          tipoPropiedad: formData.tipoPropiedad === 'otro' ? formData.tipoPropiedadOtro : formData.tipoPropiedad,
          zona: formData.zona,
          mensaje: formData.mensaje,
        }),
      })
      if (res.ok) {
        setSubmitted(true)
        setTimeout(() => setSubmitted(false), 4000)
        setFormData({ nombre: '', telefono: '', email: '', tipoPropiedad: '', tipoPropiedadOtro: '', zona: '', mensaje: '' })
      }
    } catch {
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 4000)
    } finally {
      setSending(false)
    }
  }

  return (
    <section id="tasacion" className="py-20 lg:py-28 bg-navy relative overflow-hidden lavender-bg-dark">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <span className="text-gold font-semibold text-sm tracking-[0.2em] uppercase">
            Tasaciones
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">
            Tasamos tu Propiedad{' '}
            <span className="gold-text">sin Cargo</span>
          </h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto leading-relaxed">
            ¿Querés vender o alquilar tu propiedad? Nuestro equipo de martilleros
            matriculados realiza tasaciones profesionales sin costo ni compromiso.
            Conocemos el mercado y te asesoramos para obtener el mejor valor.
          </p>
          <div className="mt-5 flex items-center justify-center gap-4">
            <a href="tel:+5492254449764">
              <Button
                size="lg"
                className="bg-gold hover:bg-gold-dark text-white font-semibold shadow-lg"
              >
                <Phone className="w-5 h-5 mr-2" />
                Llamar Ahora
              </Button>
            </a>
            <span className="text-white/50 text-sm">o completá el formulario</span>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
            <div className="bg-cream rounded-2xl shadow-2xl p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-navy text-xl">Solicitar Tasación</h3>
                  <p className="text-navy-light text-sm">Respondemos en menos de 24hs</p>
                </div>
              </div>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <CheckCircle2 className="w-16 h-16 text-teal-500 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-navy mb-2">¡Solicitud Enviada!</h4>
                  <p className="text-navy">
                    Nos comunicaremos con usted a la brevedad.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-navy-dark mb-1 block">
                        Nombre *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lavender-light" />
                        <Input
                          required
                          placeholder="Tu nombre"
                          value={formData.nombre}
                          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                          className="pl-10 h-11 border-lavender/50 focus:border-gold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-navy-dark mb-1 block">
                        Teléfono *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lavender-light" />
                        <Input
                          required
                          placeholder="Tu teléfono"
                          value={formData.telefono}
                          onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                          className="pl-10 h-11 border-lavender/50 focus:border-gold"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-navy-dark mb-1 block">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lavender-light" />
                      <Input
                        type="email"
                        placeholder="Tu email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-10 h-11 border-lavender/50 focus:border-gold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-navy-dark mb-1 block">
                        Tipo de Propiedad *
                      </label>
                      <Select
                        value={formData.tipoPropiedad}
                        onValueChange={(v) => setFormData({ ...formData, tipoPropiedad: v, tipoPropiedadOtro: v !== 'otro' ? '' : formData.tipoPropiedadOtro })}
                      >
                        <SelectTrigger className="h-11 border-lavender/50 focus:border-gold">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="casa">Casa</SelectItem>
                          <SelectItem value="chalet">Chalet</SelectItem>
                          <SelectItem value="departamento">Departamento</SelectItem>
                          <SelectItem value="ph">PH</SelectItem>
                          <SelectItem value="hotel">Hotel</SelectItem>
                          <SelectItem value="campo">Campo</SelectItem>
                          <SelectItem value="lote">Lote / Terreno</SelectItem>
                          <SelectItem value="local">Local Comercial</SelectItem>
                          <SelectItem value="galpon">Galpón</SelectItem>
                          <SelectItem value="oficina">Oficina</SelectItem>
                          <SelectItem value="quinta">Quinta</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.tipoPropiedad === 'otro' && (
                        <Input
                          placeholder="Escribí el tipo de propiedad..."
                          value={formData.tipoPropiedadOtro}
                          onChange={(e) => setFormData({ ...formData, tipoPropiedadOtro: e.target.value })}
                          className="mt-2 h-11 border-lavender/50 focus:border-gold"
                          autoFocus
                        />
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-navy-dark mb-1 block">
                        Zona *
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lavender-light" />
                        <Input
                          required
                          placeholder="Ej: Pinamar Norte"
                          value={formData.zona}
                          onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
                          className="pl-10 h-11 border-lavender/50 focus:border-gold"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-navy-dark mb-1 block">
                      Mensaje
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 w-4 h-4 text-lavender-light" />
                      <Textarea
                        placeholder="Contanos sobre tu propiedad..."
                        value={formData.mensaje}
                        onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                        className="pl-10 min-h-[80px] border-lavender/50 focus:border-gold resize-none"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-navy hover:bg-navy-light text-white font-semibold h-12 group"
                  >
                    Solicitar Tasación Gratuita
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>

                  <p className="text-lavender-light text-xs text-center">
                    También podés enviar fotos a nuestro WhatsApp para una tasación más precisa
                  </p>
                </form>
              )}
            </div>
          </motion.div>
      </div>
    </section>
  )
}
