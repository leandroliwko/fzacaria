'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, Upload, Loader2, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const categories = ['General', 'Ventas', 'Legal', 'Inversiones', 'Finanzas', 'Alquileres']

export default function NuevoArticuloPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [localPreview, setLocalPreview] = useState('')
  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'General',
    image: '',
    readTime: '5 min',
    published: true,
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')
    // Show local preview immediately
    const preview = URL.createObjectURL(file)
    setLocalPreview(preview)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file, file.name)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al subir')
      }

      URL.revokeObjectURL(preview)
      setLocalPreview('')
      setForm(prev => ({ ...prev, image: data.url }))
    } catch (err: unknown) {
      console.error(err)
      URL.revokeObjectURL(preview)
      setLocalPreview('')
      setUploadError(err instanceof Error ? err.message : 'Error subiendo imagen')
    } finally {
      setUploading(false)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) throw new Error('Error creando artículo')

      router.push('/admin/articulos')
    } catch (err) {
      console.error(err)
      alert('Error al guardar el artículo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/admin/articulos')}
          className="p-2 rounded-lg hover:bg-soft transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-navy" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">Nuevo Artículo</h1>
          <p className="text-navy-light mt-1">Escribí un nuevo artículo para el blog</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image */}
        <div className="bg-cream rounded-xl border border-lavender/30 p-6 shadow-sm">
          <h2 className="font-bold text-navy text-lg mb-4">Imagen de Portada</h2>
          {form.image || localPreview ? (
            <div className="relative w-full h-48 rounded-xl overflow-hidden group">
              <img src={localPreview || form.image} alt="" className="w-full h-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 bg-navy/30 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              {!uploading && (
                <button
                  type="button"
                  onClick={() => { setForm(prev => ({ ...prev, image: '' })); setLocalPreview('') }}
                  className="absolute top-2 right-2 w-8 h-8 bg-navy-dark/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-lavender-light rounded-xl cursor-pointer hover:border-gold hover:bg-gold/5 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
              ) : (
                <ImagePlus className="w-8 h-8 text-lavender-light" />
              )}
              <span className="text-sm text-navy-light">
                {uploading ? 'Subiendo...' : 'Clic para subir imagen'}
              </span>
              {uploadError && (
                <span className="text-sm text-red-500">{uploadError}</span>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Basic info */}
        <div className="bg-cream rounded-xl border border-lavender/30 p-6 shadow-sm space-y-5">
          <h2 className="font-bold text-navy text-lg">Información</h2>

          <div>
            <label className="block text-sm font-medium text-navy-dark mb-1">Título *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg border border-lavender/50 focus:ring-2 focus:ring-gold focus:border-gold text-sm"
              placeholder="Título del artículo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-dark mb-1">Resumen</label>
            <textarea
              rows={2}
              value={form.excerpt}
              onChange={(e) => setForm(prev => ({ ...prev, excerpt: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg border border-lavender/50 focus:ring-2 focus:ring-gold focus:border-gold text-sm resize-none"
              placeholder="Breve resumen del artículo..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-navy-dark mb-2">Categoría</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, category: cat }))}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      form.category === cat
                        ? 'bg-gold text-white'
                        : 'bg-soft text-navy hover:bg-lavender/30'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-dark mb-1">Tiempo de lectura</label>
              <input
                type="text"
                value={form.readTime}
                onChange={(e) => setForm(prev => ({ ...prev, readTime: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg border border-lavender/50 focus:ring-2 focus:ring-gold focus:border-gold text-sm"
                placeholder="5 min"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-cream rounded-xl border border-lavender/30 p-6 shadow-sm space-y-5">
          <h2 className="font-bold text-navy text-lg">Contenido</h2>
          <textarea
            rows={12}
            value={form.content}
            onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border border-lavender/50 focus:ring-2 focus:ring-gold focus:border-gold text-sm resize-none font-mono"
            placeholder="Escribí el contenido del artículo aquí..."
          />
        </div>

        {/* Options */}
        <div className="bg-cream rounded-xl border border-lavender/30 p-6 shadow-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm(prev => ({ ...prev, published: e.target.checked }))}
              className="w-5 h-5 rounded border-lavender-light text-gold focus:ring-gold"
            />
            <span className="text-sm font-medium text-navy-dark">Publicar inmediatamente</span>
          </label>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pb-8">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/articulos')}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-gold hover:bg-gold-dark text-white min-w-[160px]"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Artículo
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
