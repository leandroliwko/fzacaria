'use client'

import { motion } from 'framer-motion'
import { Phone, MessageCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CTABanner() {
  return (
    <section className="py-16 relative overflow-hidden bg-gradient-to-r from-navy via-navy-light to-navy lavender-bg-dark">
      {/* Decorative */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-gold rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gold rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center lg:text-left"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              ¿Listo para encontrar tu próximo hogar?
            </h2>
            <p className="text-white/70 text-lg max-w-xl">
              Nuestro equipo está listo para asesorarte y encontrar la propiedad
              perfecta para vos y tu familia.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <a href="tel:+5492255612345">
              <Button
                size="lg"
                className="bg-cream text-navy hover:bg-soft font-semibold shadow-lg h-13 px-8"
              >
                <Phone className="w-5 h-5 mr-2" />
                Llamar Ahora
              </Button>
            </a>
            <a
              href="https://wa.me/5492255612345?text=Hola! Quiero consultar sobre una propiedad"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                className="bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold shadow-lg h-13 px-8 group"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                WhatsApp
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
