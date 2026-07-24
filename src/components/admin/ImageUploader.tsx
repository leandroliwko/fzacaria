'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { uploadResizedImage } from '@/lib/upload'
import { X, ImagePlus, Loader2, Upload, Trash2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

// ============================================================
// SINGLE IMAGE UPLOADER
// Uses centralized resize + upload from @/lib/upload
// ============================================================
interface ImageUploaderProps {
  value: string
  onChange: (url: string) => void
  label?: string
}

export function ImageUploader({ value, onChange, label = 'Imagen' }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    setUploadError('')

    try {
      // Resize + upload in one call (centralized in @/lib/upload)
      const serverUrl = await uploadResizedImage(file, file.name)

      // Update the form with the server URL
      onChange(serverUrl)

      toast.success('Imagen cargada correctamente')
    } catch (err) {
      console.error('Image upload error:', err)
      const msg = err instanceof Error ? err.message : 'Error al procesar la imagen'
      setUploadError(msg)
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }, [onChange])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const clearImage = () => {
    onChange('')
    setUploadError('')
  }

  // Determine what image to show
  const displayUrl = value

  if (!mounted) return null

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-navy">{label}</Label>

      {/* File input - positioned absolutely but NOT display:none, to ensure click() works */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Preview */}
      {displayUrl && !uploading && (
        <div className="relative w-full h-52 rounded-xl overflow-hidden border-2 border-gold/20 bg-soft shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt="Vista previa"
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Image load error:', displayUrl?.substring(0, 80))
            }}
          />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-10"
            title="Eliminar imagen"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            Imagen cargada
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="w-full h-52 rounded-xl overflow-hidden border-2 border-gold/30 bg-soft shadow-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-gold animate-spin" />
            <p className="text-sm font-medium text-navy">Procesando y subiendo imagen...</p>
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          uploading
            ? 'border-gold bg-gold/5 pointer-events-none'
            : displayUrl
              ? 'border-gold-light bg-teal-soft/50'
              : 'border-lavender-light bg-surface hover:border-gold/50 hover:bg-cream'
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-gold animate-spin" />
            <p className="text-sm font-medium text-navy">Procesando imagen...</p>
          </div>
        ) : displayUrl ? (
          <div className="flex flex-col items-center gap-2">
            <ImagePlus className="w-6 h-6 text-gold-dark" />
            <p className="text-sm text-gold-dark font-medium">Imagen cargada — clic para reemplazar</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
              <Upload className="w-7 h-7 text-gold" />
            </div>
            <div>
              <p className="text-base font-medium text-navy">Clic para seleccionar imagen</p>
              <p className="text-xs text-lavender-light mt-1">Cualquier formato — se redimensiona automáticamente</p>
            </div>
          </div>
        )}
      </div>

      {/* Button trigger */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-white shadow-md px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <ImagePlus className="w-4 h-4" />
            {displayUrl ? 'Reemplazar imagen' : 'Buscar imagen en mi computadora'}
          </>
        )}
      </button>

      {uploadError && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <X className="w-3 h-3" />
          {uploadError}
        </p>
      )}
    </div>
  )
}

// ============================================================
// MULTI IMAGE UPLOADER (Gallery) — Admin version
// Uses centralized resize + upload from @/lib/upload
// ============================================================
interface MultiImageUploaderProps {
  values: string[]
  onChange: (urls: string[]) => void
  label?: string
}

export function MultiImageUploader({ values, onChange, label = 'Galería de imágenes' }: MultiImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [progress, setProgress] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    setUploading(true)
    setUploadError('')

    try {
      const uploadedUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        setProgress(`Procesando ${i + 1} de ${files.length}...`)
        const url = await uploadResizedImage(files[i], files[i].name)
        uploadedUrls.push(url)
      }

      onChange([...values, ...uploadedUrls])
      toast.success(`${uploadedUrls.length} imagen(es) cargada(s)`)
    } catch (err) {
      console.error('Image upload error:', err)
      const msg = err instanceof Error ? err.message : 'Error al procesar imágenes'
      setUploadError(msg)
      toast.error(msg)
    } finally {
      setUploading(false)
      setProgress('')
    }
  }, [values, onChange])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(Array.from(e.target.files))
    }
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }

  if (!mounted) return null

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-navy">{label}</Label>

      {/* File input - positioned off-screen, not display:none */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Image grid */}
      {values.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {values.map((url, i) => (
            <div key={i} className="relative h-24 rounded-lg overflow-hidden border-2 border-lavender/30 bg-soft shadow-sm group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Imagen ${i + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md opacity-0 group-hover:opacity-100 z-10"
                title="Eliminar"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <div className="absolute bottom-1 left-1 bg-navy-dark/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={`w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          uploading
            ? 'border-gold bg-gold/5 text-gold'
            : 'border-lavender-light bg-surface text-navy hover:border-gold/50 hover:bg-cream'
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{progress || 'Procesando...'}</span>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-gold" />
            <span>Agregar imágenes desde la computadora</span>
          </>
        )}
      </button>

      {uploadError && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <X className="w-3 h-3" />
          {uploadError}
        </p>
      )}
    </div>
  )
}
