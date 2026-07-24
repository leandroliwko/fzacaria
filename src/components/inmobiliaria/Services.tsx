'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Home,
  Key,
  Clock,
  Building2,
  Calculator,
  Scale,
  Wrench,

  CheckCircle2,
} from 'lucide-react'

const services = [
  {
    icon: Home,
    title: 'Venta de Propiedades',
    description:
      'Gestionamos la venta de tu propiedad con estrategia profesional, marketing de alto impacto y negociación experta para obtener el mejor precio en el menor tiempo posible.',
    features: ['Fotos profesionales', 'Publicación en portales', 'Tasación de mercado'],
    color: 'bg-navy-light',
    span: 1,
  },
  {
    icon: Key,
    title: 'Alquileres Permanentes',
    description:
      'Encontramos el inquilino ideal para tu propiedad o el hogar perfecto para alquilar. Realizamos verificación de antecedentes y gestionamos toda la documentación contractual.',
    features: ['Verificación de inquilinos', 'Contratos legales', 'Seguimiento de pagos'],
    color: 'bg-gold',
    span: 1,
  },
  {
    icon: Clock,
    title: 'Alquileres Temporarios',
    description:
      'Administramos alquileres por temporada con un sistema eficiente de reservas, check-in/check-out coordinado y atención al huésped durante toda la estadía.',
    features: ['Gestión de reservas', 'Atención al huésped', 'Mantenimiento incluido'],
    color: 'bg-teal-pale',
    span: 1,
  },
  {
    icon: Building2,
    title: 'Administración',
    description:
      'Nos ocupamos de la administración completa de tu propiedad: cobro de alquileres, pago de expensas, mantenimiento y resolución de cualquier inconveniente que surja. Gestionamos todos los aspectos operativos para que vos solo te preocupes por disfrutar tu inversión.',
    features: ['Cobro mensual', 'Pago de servicios y expensas', 'Mantenimiento', 'Resolución de incidencias', 'Rendición de cuentas', 'Asesoramiento legal'],
    color: 'bg-lavender',
    span: 'half',
  },
  {
    icon: Calculator,
    title: 'Tasaciones',
    description:
      'Realizamos tasaciones profesionales sin cargo, basadas en un análisis exhaustivo del mercado, la ubicación y las características particulares de cada propiedad. Nuestro equipo de martilleros matriculados garantiza una valuación precisa y confiable.',
    features: ['Sin cargo', 'Informe detallado', 'Análisis de mercado', 'Martilleros matriculados', 'Valuación precisa', 'Comparables de zona'],
    color: 'bg-gold',
    span: 'half',
  },
]

const featuredService = {
  icon: Wrench,
  title: 'Mantenimiento del Hogar',
  description:
    'Contamos con un servicio integral de remodelaciones y mantenimiento del hogar, con un equipo de confianza y experiencia que brinda soluciones completas para que no tengas que preocuparte por nada. Desde reparaciones menores hasta remodelaciones completas, nos encargamos de cada detalle para que tu propiedad se mantenga en perfectas condiciones durante todo el año.',
  features: ['Remodelaciones integrales', 'Mantenimiento preventivo y correctivo', 'Equipo de confianza', 'Presupuestos sin cargo', 'Respuesta rápida', 'Servicio en toda la Costa Atlántica y zona serrana'],
  color: 'bg-red-500',
}

export default function Services() {
  return (
    <section id="servicios" className="py-20 lg:py-28 bg-surface lavender-bg">
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
            Lo que Ofrecemos
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-3 mb-4">
            Nuestros Servicios
          </h2>
          <div className="section-divider mb-6" />
          <p className="text-navy max-w-2xl mx-auto text-lg">
            Ofrecemos un servicio integral que abarca todas las necesidades
            inmobiliarias, con la calidad y el profesionalismo que nos caracterizan.
          </p>
        </motion.div>

        {/* Featured Service - Mantenimiento del Hogar (primero) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-r from-amber-50 via-cream to-amber-50 rounded-2xl p-8 lg:p-10 shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-amber-300 hover:border-amber-500 relative overflow-hidden">
            {/* Decorative accent */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600" />

            <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
              {/* Logo */}
              <div className="flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <Image
                  src="/mantenimiento-logo.png"
                  alt="Mantenimiento del Hogar - Soluciones Integrales"
                  width={200}
                  height={200}
                  className="w-40 h-40 lg:w-48 lg:h-48 object-contain drop-shadow-lg"
                  priority
                />
              </div>

              {/* Description & Features */}
              <div className="flex-1">
                <p className="text-navy leading-relaxed mb-5">
                  {featuredService.description}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {featuredService.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-navy-light">
                      <CheckCircle2 className="w-4 h-4 text-amber-700 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Services Grid - Top row: 3 regular services */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-6 lg:mb-8">
          {services.filter(s => s.span === 1).map((service, i) => {
            const Icon = service.icon
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -5 }}
                className="bg-cream rounded-2xl p-6 lg:p-8 shadow-sm hover:shadow-xl transition-all duration-300 group border border-lavender/30 hover:border-gold/20"
              >
                <div
                  className={`w-14 h-14 ${service.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-xl font-bold text-navy mb-3 group-hover:text-gold-dark transition-colors">
                  {service.title}
                </h3>

                <p className="text-navy text-sm leading-relaxed mb-5">
                  {service.description}
                </p>

                <ul className="space-y-2 mb-5">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-navy-light">
                      <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>


              </motion.div>
            )
          })}
        </div>

        {/* Bottom row: Administración + Tasaciones side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {services.filter(s => s.span === 'half').map((service, i) => {
            const Icon = service.icon
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -5 }}
                className="bg-cream rounded-2xl p-6 lg:p-8 shadow-sm hover:shadow-xl transition-all duration-300 group border border-lavender/30 hover:border-gold/20"
              >
                <div
                  className={`w-14 h-14 ${service.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-xl font-bold text-navy mb-3 group-hover:text-gold-dark transition-colors">
                  {service.title}
                </h3>

                <p className="text-navy text-sm leading-relaxed mb-5">
                  {service.description}
                </p>

                <ul className="grid grid-cols-2 gap-x-4 gap-y-2 mb-5">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-navy-light">
                      <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>


              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
