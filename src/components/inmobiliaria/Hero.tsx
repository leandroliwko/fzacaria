'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  MapPin,
  Home,
  Building2,
  TreePine,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const heroImages = [
  '/hero-bg.jpg',
]

export default function Hero() {
  const [operation, setOperation] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [location, setLocation] = useState('')
  const [totalProperties, setTotalProperties] = useState(0)

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

  const heroStats = [
    { value: '126+', label: 'Propiedades', icon: Home },
    { value: '9+', label: 'Años de Experiencia', icon: Building2 },
    { value: '178+', label: 'Clientes Felices', icon: TreePine },
    { value: '98%', label: 'Satisfacción', icon: Building2 },
  ]

  return (
    <section id="inicio" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image with Parallax */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${heroImages[0]}')`,
          }}
        />
        <div className="hero-overlay absolute inset-0" />

        {/* Animated geometric shapes */}
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-20 -right-20 w-96 h-96 border border-gold/10 rounded-full"
        />
        <motion.div
          animate={{
            rotate: -360,
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-32 -left-32 w-[500px] h-[500px] border border-gold/5 rounded-full"
        />
        <motion.div
          animate={{
            y: [0, -20, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 right-1/4 w-4 h-4 bg-gold/30 rounded-full"
        />
        <motion.div
          animate={{
            y: [0, 15, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/3 left-1/4 w-3 h-3 bg-gold/20 rounded-full"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">
        <div className="max-w-3xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-lavender/20 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6"
          >
            <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />
            <span className="text-white/90 text-sm font-medium">
              Tu inmobiliaria de confianza
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-6"
          >
            Encontrá tu{' '}
            <span className="gold-text">hogar ideal</span>
            <br />
            con nosotros
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg sm:text-xl text-white/80 mb-10 max-w-xl"
          >
            Venta y alquiler de casas, chalets, departamentos, campos, lotes y
            locales. Asesoramiento profesional y tasaciones sin cargo.
          </motion.p>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="bg-cream rounded-2xl shadow-2xl p-4 sm:p-6 max-w-2xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <Select value={operation} onValueChange={setOperation}>
                <SelectTrigger className="h-12 border-lavender/50 focus:border-gold">
                  <SelectValue placeholder="Operación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venta">Venta</SelectItem>
                  <SelectItem value="alquiler">Alquiler</SelectItem>
                  <SelectItem value="temporario">Temporario</SelectItem>
                </SelectContent>
              </Select>

              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger className="h-12 border-lavender/50 focus:border-gold">
                  <SelectValue placeholder="Tipo de Propiedad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="chalet">Chalet</SelectItem>
                  <SelectItem value="departamento">Departamento</SelectItem>
                  <SelectItem value="campo">Campo</SelectItem>
                  <SelectItem value="lote">Lote / Terreno</SelectItem>
                  <SelectItem value="local">Local Comercial</SelectItem>
                  <SelectItem value="galpon">Galpón</SelectItem>
                  <SelectItem value="oficina">Oficina</SelectItem>
                  <SelectItem value="quinta">Quinta</SelectItem>
                </SelectContent>
              </Select>

              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="h-12 border-lavender/50 focus:border-gold">
                  <SelectValue placeholder="Ubicación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pinamar">Pinamar</SelectItem>
                  <SelectItem value="carilo">Cariló</SelectItem>
                  <SelectItem value="valeria">Valeria del Mar</SelectItem>
                  <SelectItem value="ostende">Ostende</SelectItem>
                  <SelectItem value="mar-de-ajo">Mar de Ajó</SelectItem>
                  <SelectItem value="san-bernardo">San Bernardo</SelectItem>
                  <SelectItem value="tandil">Tandil</SelectItem>
                  <SelectItem value="balcarce">Balcarce</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full h-12 bg-navy hover:bg-navy-light text-white font-semibold text-base group">
              <Search className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Buscar Propiedades
            </Button>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 max-w-3xl"
        >
          {heroStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl font-bold gold-text mb-1">
                {stat.value}
              </div>
              <div className="text-white/70 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <a href="#propiedades" className="text-white/60 hover:text-gold transition-colors">
          <ChevronDown className="w-8 h-8" />
        </a>
      </motion.div>
    </section>
  )
}
