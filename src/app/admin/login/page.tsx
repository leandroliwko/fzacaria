'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Bienvenido al panel de control')
        // Refresh router cache so the admin dashboard shows fresh data after login
        router.refresh()
        router.push('/admin')
      } else {
        toast.error(data.error || 'Error al iniciar sesión')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: '#EDE7F6' }}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-lavender -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-lavender translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#B5A4D6]/30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-cream rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-navy px-8 py-8 text-center">
            <img
              src="/logotipo-florencia-zacaria-1.png"
              alt="Florencia Zacaría Inmobiliaria"
              className="h-16 w-auto mx-auto mb-3"
            />
            <p className="text-gold text-sm tracking-wide">Panel de Control</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-navy font-medium">
                <Mail className="w-4 h-4 inline mr-2 text-gold" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@florencia.com"
                required
                className="border-navy/20 focus:border-gold focus:ring-gold/40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-navy font-medium">
                <Lock className="w-4 h-4 inline mr-2 text-gold" />
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="border-navy/20 focus:border-gold focus:ring-gold/40 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lavender-light hover:text-navy"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-dark text-white font-semibold py-3 text-base shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </div>
              ) : (
                'Ingresar'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <a
              href="/"
              className="text-sm text-lavender-light hover:text-gold transition-colors"
            >
              ← Volver al sitio
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
