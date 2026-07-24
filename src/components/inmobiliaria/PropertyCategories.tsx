'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Home,
  Castle,
  Building2,
  TreePine,
  LandPlot,
  Store,
  Briefcase,
  Warehouse,
  Hotel,
  ArrowRight,
} from 'lucide-react'

interface CategoryConfig {
  icon: any
  name: string
  type: string
  description: string
  color: string
  bgLight: string
  image: string
}

const categoryConfigs: CategoryConfig[] = [
  {
    icon: Home,
    name: 'Casas',
    type: 'casa',
    description: 'Casas familiares con todos los confort',
    color: 'from-[#7A4E9B] to-[#9D7FB8]',
    bgLight: 'bg-lavender/20',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80',
  },
  {
    icon: Castle,
    name: 'Chalets',
    type: 'chalet',
    description: 'Chalets premium con diseño exclusivo',
    color: 'from-[#9D7FB8] to-[#B5A4D6]',
    bgLight: 'bg-lavender-light/20',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80',
  },
  {
    icon: Building2,
    name: 'Departamentos',
    type: 'departamento',
    description: 'Deptos modernos en las mejores ubicaciones',
    color: 'from-[#5D3A7A] to-[#7A4E9B]',
    bgLight: 'bg-lavender/20',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80',
  },
  {
    icon: TreePine,
    name: 'Campos',
    type: 'campo',
    description: 'Campos productivos y quintas de recreo',
    color: 'from-[#6d7357] to-[#8a8e76]',
    bgLight: 'bg-teal-pale/30',
    image: 'https://images.unsplash.com/photo-1500076656116-558758c991c1?w=400&q=80',
  },
  {
    icon: LandPlot,
    name: 'Lotes',
    type: 'lote',
    description: 'Terrenos y lotes para construir tu hogar',
    color: 'from-[#7A4E9B] to-[#6d7357]',
    bgLight: 'bg-teal-soft/30',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80',
  },
  {
    icon: Store,
    name: 'Locales',
    type: 'local',
    description: 'Locales comerciales estratégicos',
    color: 'from-[#5D3A7A] to-[#7A4E9B]',
    bgLight: 'bg-lavender/20',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80',
  },
  {
    icon: Briefcase,
    name: 'Oficinas',
    type: 'oficina',
    description: 'Espacios de trabajo profesionales',
    color: 'from-[#5D3A7A] to-[#4A2D63]',
    bgLight: 'bg-surface',
    image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&q=80',
  },
  {
    icon: Warehouse,
    name: 'Galpones',
    type: 'galpon',
    description: 'Galpones industriales y de almacenamiento',
    color: 'from-[#6d7357] to-[#5a5e48]',
    bgLight: 'bg-teal-pale/30',
    image: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=400&q=80',
  },
  {
    icon: Warehouse,
    name: 'Quintas',
    type: 'quinta',
    description: 'Quintas con amplios espacios verdes',
    color: 'from-[#8a8e76] to-[#6d7357]',
    bgLight: 'bg-teal-pale/30',
    image: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=400&q=80',
  },
  {
    icon: Building2,
    name: 'PH',
    type: 'ph',
    description: 'Propiedades horizontales con identidad propia',
    color: 'from-[#B5A4D6] to-[#9D7FB8]',
    bgLight: 'bg-lavender-light/20',
    image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400&q=80',
  },
  {
    icon: Hotel,
    name: 'Hoteles',
    type: 'hotel',
    description: 'Hoteles con excelente ubicación y rentabilidad',
    color: 'from-[#7A4E9B] to-[#5D3A7A]',
    bgLight: 'bg-lavender/20',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
  },
]

export default function PropertyCategories() {
  const [countsByType, setCountsByType] = useState<Record<string, number>>({})

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) {
        const data = await res.json()
        setCountsByType(data.countsByType || {})
      }
    } catch {
      // Use empty counts on error
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <section id="categorias" className="py-20 lg:py-28 bg-cream lavender-bg">
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
            Explorá por Tipo
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-3 mb-4">
            Categorías de Propiedades
          </h2>
          <div className="section-divider mb-6" />
          <p className="text-navy max-w-2xl mx-auto text-lg">
            Elegí el tipo de propiedad que buscás y encontrá las mejores opciones
            disponibles en nuestra cartera.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categoryConfigs.map((cat, i) => {
            const Icon = cat.icon
            const count = countsByType[cat.type] || 0
            return (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative overflow-hidden rounded-2xl cursor-pointer shadow-md hover:shadow-xl transition-shadow duration-300"
                onClick={() => {
                  const el = document.getElementById('propiedades')
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' })
                    window.dispatchEvent(new CustomEvent('filter-by-type', { detail: cat.type }))
                  }
                }}
              >
                {/* Background Image */}
                <div className="relative h-64">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/40 to-transparent" />

                  {/* Content Overlay */}
                  <div className="absolute inset-0 p-5 flex flex-col justify-end">
                    <div
                      className={`w-12 h-12 rounded-xl ${cat.bgLight} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className="w-6 h-6 text-navy" />
                    </div>

                    <h3 className="text-white font-bold text-xl mb-1">{cat.name}</h3>
                    <p className="text-white/70 text-sm mb-3">{cat.description}</p>

                    <div className="flex items-center justify-between">
                      <span className="text-gold font-semibold text-sm">
                        {count} propiedades
                      </span>
                      <div className="w-8 h-8 bg-gold/20 rounded-full flex items-center justify-center group-hover:bg-gold transition-colors duration-300">
                        <ArrowRight className="w-4 h-4 text-gold group-hover:text-white transition-colors duration-300" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
