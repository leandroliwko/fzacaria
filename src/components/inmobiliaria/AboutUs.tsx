'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Home,
  Users,
  Award,
  Clock,
  Handshake,
  Shield,
  Heart,
  Target,
  Briefcase,
  Phone,
  MapPin,
  Hotel,
} from 'lucide-react'

const values = [
  {
    icon: Shield,
    title: 'Transparencia',
    description:
      'Trabajamos con total honestidad y claridad en cada operación, para que nuestros clientes siempre sepan exactamente qué esperar.',
  },
  {
    icon: Handshake,
    title: 'Compromiso',
    description:
      'Nos comprometemos al 100% con cada cliente, acompañándolos durante todo el proceso de compra, venta o alquiler.',
  },
  {
    icon: Heart,
    title: 'Pasión',
    description:
      'Amamos lo que hacemos y eso se refleja en la calidad de nuestro servicio y en la dedicación que ponemos en cada gestión.',
  },
  {
    icon: Target,
    title: 'Excelencia',
    description:
      'Buscamos siempre la mejor opción para cada necesidad, con un estándar de calidad que nos distingue en el mercado.',
  },
]

const teamMembers = [
  {
    name: 'Melisa Galeano',
    role: 'Especialista en Gestión Hotelera',
    photo: '/team/melisa.jpg',
    fallbackPhoto: '/team/melisa-placeholder.svg',
    icon: Hotel,
    description:
'Melisa Galeano se especializa en gestión hotelera con más de cinco años en el rubro inmobiliario. Su formación le permite comprender el mercado de alquileres temporarios y propiedades turísticas, clave en Pinamar y la costa atlántica. Evalúa cada inmueble, identifica oportunidades y gestiona con el rigor de la hotelería de alta categoría. Su trato cercano, profesionalismo y compromiso la convierten en una referente de Inmobiliaria Florencia Zacaría.',
  },
  {
    name: 'Jazmín Barrientos',
    role: 'Recepcionista',
    photo: '/team/jazmin.jpg',
    fallbackPhoto: '/team/jazmin-placeholder.svg',
    icon: Phone,
    description:
'Jazmín Barrientos es la primera persona que recibe a nuestros clientes. Se destaca por su trato cordial y compromiso para brindar atención cálida y eficiente. Orienta a quienes visitan la oficina, coordina consultas y acompaña cada cliente desde el primer contacto, asegurando una experiencia cercana y personalizada. Gestiona la agenda, la comunicación diaria y actúa como nexo entre áreas, garantizando que cada consulta llegue al profesional correspondiente. Su empatía y dedicación hacen que todos se sienten bienvenidos, reflejando los valores de confianza y profesionalismo de Inmobiliaria Florencia Zacaría.',
  },
  {
    name: 'Mariano Barrientos',
    role: 'Socio y Asesor Inmobiliario',
    photo: '/team/mariano.jpg',
    fallbackPhoto: '/team/mariano-placeholder.svg',
    icon: Briefcase,
    description:
'Nacido y criado en Pinamar, Mariano Barrientos conoce la ciudad y la dinámica del mercado inmobiliario local. Brinda asesoramiento cercano y confiable, adaptado a cada cliente, con entendimiento genuino de la costa atlántica. Como socio de Inmobiliaria Florencia Zacaría, cumple un rol clave en la dirección estratégica, acompañando propietarios, compradores e inquilinos con compromiso y transparencia. Coordina el área de mantenimiento, supervisando mejoras y acondicionamiento para que cada propiedad esté en optimal estado. Su vocación de servicio y conocimiento de Pinamar reflejan los valores de profesionalismo, cercanía y confianza que distinguen a la empresa.',
  },
]

export default function AboutUs() {
  const [totalProperties, setTotalProperties] = useState(0)
  const [photoErrors, setPhotoErrors] = useState<Record<string, boolean>>({})

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) {
        const data = await res.json()
        setTotalProperties(data.totalProperties || 0)
      }
    } catch {
      // Use defaults on error
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const stats = [
    { icon: Home, value: '126+', label: 'Propiedades Gestionadas' },
    { icon: Users, value: '178+', label: 'Clientes Satisfechos' },
    { icon: Clock, value: '9+', label: 'Años de Experiencia' },
    { icon: Award, value: '98%', label: 'Tasa de Satisfacción' },
  ]

  const handlePhotoError = (name: string) => {
    setPhotoErrors(prev => ({ ...prev, [name]: true }))
  }

  return (
    <section id="nosotros" className="py-20 lg:py-28 bg-cream lavender-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-gold font-semibold text-sm tracking-[0.2em] uppercase">
            Quiénes Somos
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-3 mb-4">
            Sobre Nosotros
          </h2>
          <div className="section-divider mb-6" />
        </motion.div>

        {/* Story Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="/about-us.png"
                  alt="Inmobiliaria Florencia Zacaría"
                  className="w-full h-80 object-cover"
                />
              </div>
              {/* Floating card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="absolute -bottom-6 -right-6 bg-gold text-white rounded-xl p-5 shadow-xl hidden sm:block"
              >
                <div className="text-3xl font-bold">9+</div>
                <div className="text-sm opacity-90">Años de trayectoria</div>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-2xl sm:text-3xl font-bold text-navy mb-4">
              Tradición y Profesionalismo Inmobiliario
            </h3>
            <p className="text-navy mb-4 leading-relaxed">
              La <strong>Inmobiliaria Florencia Zacaría</strong> nació con la
              misión de ofrecer un servicio inmobiliario de excelencia, combinando
              la calidez humana con el profesionalismo que el mercado exige. Desde
              nuestros inicios, hemos trabajado incansablemente para construir
              relaciones de confianza con cada uno de nuestros clientes.
            </p>
            <p className="text-navy mb-4 leading-relaxed">
              Nuestro equipo de martilleros y corredores matriculados cuenta con un
              profundo conocimiento del mercado inmobiliario de la zona, lo que nos
              permite ofrecer tasaciones precisas y asesoramiento estratégico tanto
              para compradores como para vendedores y propietarios que desean
              alquilar sus propiedades.
            </p>
            <p className="text-navy mb-6 leading-relaxed">
              Nos enorgullece haber ayudado a más de 178 familias a encontrar su
              hogar ideal y a cientos de inversores a concretar operaciones
              exitosas. Cada propiedad es importante para nosotros, y cada cliente
              recibe la atención personalizada que merece.
            </p>

            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.name}
                    className="w-10 h-10 rounded-full border-2 border-white bg-navy/20 overflow-hidden"
                  >
                    <img
                      src={photoErrors[member.name] ? member.fallbackPhoto : member.photo}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      onError={() => handlePhotoError(member.name)}
                    />
                  </div>
                ))}
              </div>
              <span className="text-navy text-sm">
                Equipo profesional matriculado
              </span>
            </div>
          </motion.div>
        </div>

        {/* Team Members - 3 Columns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <span className="text-gold font-semibold text-sm tracking-[0.2em] uppercase">
            Nuestro Equipo
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-navy mt-2 mb-2">
            Las Personas Que Hacen La Diferencia
          </h3>
          <p className="text-navy max-w-xl mx-auto">
            Detrás de cada operación exitosa hay un equipo comprometido que trabaja con pasión, dedicación y un profundo sentido de responsabilidad.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 mb-20">
          {teamMembers.map((member, i) => {
            const Icon = member.icon
            return (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="text-center group"
              >
                {/* Circular Photo */}
                <div className="relative mx-auto w-36 h-36 lg:w-44 lg:h-44 mb-6">
                  <div className="w-full h-full rounded-full overflow-hidden border-4 border-gold/30 group-hover:border-gold shadow-lg transition-all duration-300 group-hover:shadow-xl bg-lavender/20">
                    <img
                      src={photoErrors[member.name] ? member.fallbackPhoto : member.photo}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      onError={() => handlePhotoError(member.name)}
                    />
                  </div>
                  {/* Decorative ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-navy/10 group-hover:border-navy/20 transition-colors duration-300 scale-110" />
                  {/* Role icon badge */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gold rounded-full px-3 py-1 shadow-md">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Name & Role */}
                <h4 className="text-xl lg:text-2xl font-bold text-navy mb-1">
                  {member.name}
                </h4>
                <p className="text-gold font-semibold text-sm tracking-wide uppercase mb-4">
                  {member.role}
                </p>

                {/* Description */}
                <p className="text-navy-light leading-relaxed text-sm lg:text-base">
                  {member.description}
                </p>
              </motion.div>
            )
          })}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20"
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-2xl bg-surface hover:bg-navy group transition-all duration-300 cursor-default"
              >
                <div className="w-14 h-14 mx-auto rounded-xl bg-gold/10 group-hover:bg-gold/20 flex items-center justify-center mb-3 transition-colors">
                  <Icon className="w-7 h-7 text-gold" />
                </div>
                <div className="text-3xl font-bold text-navy group-hover:text-white transition-colors">
                  {stat.value}
                </div>
                <div className="text-navy-light text-sm group-hover:text-white/70 transition-colors">
                  {stat.label}
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Values */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h3 className="text-2xl sm:text-3xl font-bold text-navy mb-2">
            Nuestros Valores
          </h3>
          <p className="text-navy max-w-xl mx-auto">
            Los pilares que guían cada una de nuestras acciones y decisiones.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, i) => {
            const Icon = value.icon
            return (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-2xl border border-lavender/30 hover:border-gold/30 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="w-14 h-14 mx-auto rounded-xl bg-navy/5 group-hover:bg-gold/10 flex items-center justify-center mb-4 transition-colors">
                  <Icon className="w-6 h-6 text-navy group-hover:text-gold transition-colors" />
                </div>
                <h4 className="font-bold text-navy mb-2">{value.title}</h4>
                <p className="text-navy-light text-sm leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
