'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Maia Poseto',
    role: 'Compradora - Pinamar',
    content:
      'Excelente experiencia con la Inmobiliaria Florencia Zacaría. Desde el primer momento nos sentimos acompañados y asesorados. Encontramos la casa de nuestros sueños en tiempo récord. El equipo fue sumamente profesional y atento a cada detalle del proceso.',
    rating: 5,
    initials: 'MP',
  },
  {
    name: 'Ricardo San Martín',
    role: 'Vendedor - Cariló',
    content:
      'Vendimos nuestra propiedad en muy poco tiempo y al precio justo. La tasación fue precisa y el marketing que hicieron fue excepcional. Sin dudas los recomiendo a cualquiera que quiera vender o comprar propiedades en la zona.',
    rating: 5,
    initials: 'RS',
  },
  {
    name: 'Nora Felicitas Oro',
    role: 'Inquilina - Valeria del Mar',
    content:
      'El proceso de alquiler fue rápido y transparente. Nos ayudaron con todos los trámites y siempre estuvieron disponibles para responder nuestras dudas. La propiedad estaba en perfectas condiciones tal como nos la describieron.',
    rating: 5,
    initials: 'NO',
  },
  {
    name: 'Maria Luzuriaga de Mores',
    role: 'Propietaria - Tandil',
    content:
      'Confío la administración de mis propiedades a Florencia Zacaría desde hace años. Su gestión es impecable, siempre al día con los pagos y el mantenimiento. Es un alivio tener un equipo tan confiable a cargo de mis inversiones.',
    rating: 5,
    initials: 'ML',
  },
  {
    name: 'Claudio Esperon',
    role: 'Comprador - Pinamar',
    content:
      'Gracias al asesoramiento legal de la inmobiliaria, pudimos cerrar la compra de nuestro departamento con total seguridad. Nos explicaron cada paso del proceso y nos acompañaron hasta la escrituración. Un equipo de primera.',
    rating: 5,
    initials: 'CE',
  },
  {
    name: "Fabiana D´Andrea",
    role: 'Vendedora - San Bernardo',
    content:
      'La atención de Florencia Zacaría fue extraordinaria. Me ayudaron a vender mi propiedad rápidamente y al mejor precio del mercado. Su conocimiento de la zona y su profesionalismo hacen la diferencia.',
    rating: 5,
    initials: 'FD',
  },
]

export default function Testimonials() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length)
  const next = () => setCurrent((c) => (c + 1) % testimonials.length)

  return (
    <section className="py-20 lg:py-28 bg-cream lavender-bg">
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
            Testimonios
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-3 mb-4">
            Lo que Dicen Nuestros Clientes
          </h2>
          <div className="section-divider mb-6" />
          <p className="text-navy max-w-2xl mx-auto text-lg">
            La satisfacción de nuestros clientes es nuestro mejor aval. Conocé sus
            experiencias trabajando con nosotros.
          </p>
        </motion.div>

        {/* Testimonial Slider */}
        <div className="relative max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="bg-surface rounded-2xl p-8 sm:p-12 text-center"
            >
              {/* Quote Icon */}
              <div className="w-14 h-14 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Quote className="w-7 h-7 text-gold" />
              </div>

              {/* Stars */}
              <div className="flex justify-center gap-1 mb-6">
                {Array.from({ length: testimonials[current].rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-gold fill-gold" />
                ))}
              </div>

              {/* Content */}
              <p className="text-navy-dark text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
                &ldquo;{testimonials[current].content}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-navy flex items-center justify-center">
                  <span className="text-gold font-bold text-sm">
                    {testimonials[current].initials}
                  </span>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-navy">
                    {testimonials[current].name}
                  </div>
                  <div className="text-navy-light text-sm">
                    {testimonials[current].role}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full border border-lavender/50 flex items-center justify-center hover:bg-navy hover:text-white hover:border-navy transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === current ? 'w-8 bg-gold' : 'w-2 bg-lavender/50'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-10 h-10 rounded-full border border-lavender/50 flex items-center justify-center hover:bg-navy hover:text-white hover:border-navy transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mini Testimonial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-14">
          {testimonials.slice(0, 3).map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-surface rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center">
                  <span className="text-gold font-bold text-xs">{t.initials}</span>
                </div>
                <div>
                  <div className="font-semibold text-navy text-sm">{t.name}</div>
                  <div className="text-lavender-light text-xs">{t.role}</div>
                </div>
              </div>
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-3 h-3 text-gold fill-gold" />
                ))}
              </div>
              <p className="text-navy text-sm line-clamp-3">{t.content}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
