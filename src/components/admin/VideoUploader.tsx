'use client'

import { useState, useRef } from 'react'
import { uploadFile } from '@/lib/upload'
import { Upload, X, Loader2, Film } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Map file extensions to MIME types (fallback for devices with empty MIME types)
const extensionToMime: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mpeg': 'video/mpeg',
  '.mpg': 'video/mpeg',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.3gp': 'video/3gpp',
  '.3g2': 'video/3gpp2',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.ts': 'video/mp2t',
  '.ogg': 'video/ogg',
  '.ogv': 'video/ogg',
  '.flv': 'video/x-flv',
}

interface VideoUploaderProps {
  videoUrl: string
  onVideoChange: (url: string) => void
}

export default function VideoUploader({ videoUrl, onVideoChange }: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate format - accept most common video formats including phone recordings
    const allowedTypes = [
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
      'video/3gpp', 'video/3gpp2',
      'video/webm', 'video/x-matroska',
      'video/mp2t', 'video/ogg', 'video/x-flv',
    ]
    const allowedExtensions = [
      '.mp4', '.mpeg', '.mpg', '.mov', '.avi',
      '.3gp', '.3g2', '.webm', '.mkv', '.ts',
      '.ogg', '.ogv', '.flv',
    ]

    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
    const isAllowedByType = allowedTypes.includes(file.type) || file.type.startsWith('video/')
    const isAllowedByExt = !file.type && allowedExtensions.includes(fileExt)

    if (!isAllowedByType && !isAllowedByExt) {
      setError(`Formato no válido (${file.type || 'desconocido'}). Probá con MP4, MOV, 3GP, WEBM`)
      return
    }

    // Validate size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('El archivo es demasiado grande (máx. 100MB)')
      return
    }

    setError('')
    setUploading(true)
    setProgress(0)

    try {
      // Determine the correct content type (phones like TCL may report empty MIME types)
      const contentType = file.type || extensionToMime[fileExt] || 'video/mp4'

      // Upload with automatic fallback: client-side first, server-side if that fails
      const url = await uploadFile(file.name, file, {
        contentType,
        multipart: file.size > 5 * 1024 * 1024, // Use multipart for files > 5MB
        onUploadProgress: (progressEvent) => {
          setProgress(progressEvent.percentage)
        },
      })

      onVideoChange(url)
    } catch (err: any) {
      console.error('Video upload error:', err)
      setError(err.message || 'Error al subir el video')
    } finally {
      setUploading(false)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = () => {
    onVideoChange('')
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-navy-dark">Video de la Propiedad</label>

      {videoUrl ? (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              src={videoUrl}
              controls
              className="w-full max-h-64 object-contain"
              preload="metadata"
            >
              Tu navegador no soporta el elemento de video.
            </video>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Film className="w-4 h-4 mr-1" />
              Reemplazar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1" />
              Eliminar
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            uploading
              ? 'border-gold bg-gold/5 cursor-wait'
              : 'border-lavender-light hover:border-gold hover:bg-gold/5'
          }`}
        >
          {uploading ? (
            <div className="space-y-3">
              <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto" />
              <p className="text-sm text-navy">Subiendo video... {progress}%</p>
              <div className="w-full bg-lavender/30 rounded-full h-2">
                <div
                  className="bg-gold h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 text-lavender-light mx-auto" />
              <p className="text-sm text-navy">
                Hacé click para subir un video
              </p>
              <p className="text-xs text-lavender-light">MP4, MOV, 3GP, WEBM · Máx. 100MB</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  )
}
