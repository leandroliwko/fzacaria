'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { uploadResizedImage, uploadFile } from '@/lib/upload'
import {
  Upload,
  X,
  Star,
  ImagePlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowUpDown,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ImageItem {
  id: string
  url: string
  name: string
  uploading?: boolean
  error?: boolean
  errorMessage?: string // Detailed error message for display
  localPreview?: string // Object URL for immediate preview while uploading
  serverLoaded?: boolean // True when server URL image has loaded successfully
  originalFile?: File // Keep reference for retry
}

interface MultiImageUploaderProps {
  images: ImageItem[]
  onChange: React.Dispatch<React.SetStateAction<ImageItem[]>>
  coverIndex: number
  onCoverChange: (index: number) => void
  maxImages?: number
}

export default function MultiImageUploader({
  images,
  onChange,
  coverIndex,
  onCoverChange,
  maxImages = 20,
}: MultiImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isProcessingRef = useRef(false)
  const uploadQueueRef = useRef<{ file: File; tempId: string; localPreview: string }[]>([])
  const objectURLsRef = useRef<Set<string>>(new Set())

  // Cleanup objectURLs on unmount
  useEffect(() => {
    return () => {
      objectURLsRef.current.forEach(url => URL.revokeObjectURL(url))
    }
  }, [])

  // Process upload queue sequentially
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    while (uploadQueueRef.current.length > 0) {
      const item = uploadQueueRef.current.shift()!
      const { file, tempId, localPreview } = item

      try {
        // Resize image BEFORE uploading — this is the key fix!
        // All images are resized to max 1920px, converted to WebP, max 3MB
        // This ensures large camera photos upload reliably via any path
        const url = await uploadResizedImage(file, file.name)

        // Update state with server URL but KEEP localPreview for smooth transition
        // The localPreview will be revoked only after the server image loads (via onServerImageLoad)
        onChange(prev => prev.map(i => i.id === tempId ? {
          ...i,
          url: url,
          uploading: false,
          originalFile: undefined, // No longer needed after successful upload
        } : i))
      } catch (err: any) {
        const errorMsg = err?.message || 'Error al subir la imagen'
        console.error('Upload error:', errorMsg, err)
        // On error, we can revoke the objectURL since the image won't be used
        if (localPreview) {
          URL.revokeObjectURL(localPreview)
          objectURLsRef.current.delete(localPreview)
        }
        onChange(prev => prev.map(i => i.id === tempId ? {
          ...i,
          uploading: false,
          error: true,
          errorMessage: errorMsg,
          localPreview: undefined,
        } : i))
      }
    }

    isProcessingRef.current = false
  }, [onChange])

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (fileArray.length === 0) return

    const currentCount = images.filter(i => !i.error).length
    const remaining = maxImages - currentCount
    if (remaining <= 0) {
      alert(`Ya tenes el maximo de ${maxImages} imagenes`)
      return
    }

    const toUpload = fileArray.slice(0, remaining)
    if (toUpload.length < fileArray.length) {
      alert(`Solo se permiten ${maxImages} imagenes. Se subiran ${toUpload.length}.`)
    }

    // Create placeholders with local preview for immediate display
    const placeholders: ImageItem[] = toUpload.map((file) => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const localPreview = URL.createObjectURL(file)
      objectURLsRef.current.add(localPreview)
      return {
        id: tempId,
        url: '',
        name: file.name,
        uploading: true,
        localPreview,
        originalFile: file, // Keep for retry
      }
    })

    // Enqueue files for upload
    toUpload.forEach((file, idx) => {
      uploadQueueRef.current.push({
        file,
        tempId: placeholders[idx].id,
        localPreview: placeholders[idx].localPreview!,
      })
    })

    // Add placeholders to state
    onChange(prev => [...prev, ...placeholders])

    // Start processing queue
    setTimeout(() => processQueue(), 0)
  }, [maxImages, onChange, processQueue, images])

  const openFilePicker = () => {
    if (images.length >= maxImages) return
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setDragOverIndex(null)
    setDragFromIndex(null)

    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const removeImage = (index: number) => {
    onChange(prev => {
      const item = prev[index]
      // Revoke local preview if it exists
      if (item?.localPreview) {
        URL.revokeObjectURL(item.localPreview)
        objectURLsRef.current.delete(item.localPreview)
      }
      return prev.filter((_, i) => i !== index)
    })
    if (coverIndex === index) onCoverChange(0)
    else if (coverIndex > index) onCoverChange(coverIndex - 1)
  }

  const moveImage = (from: number, to: number) => {
    if (to < 0) return
    onChange(prev => {
      if (to >= prev.length) return prev
      const newImages = [...prev]
      const [moved] = newImages.splice(from, 1)
      newImages.splice(to, 0, moved)
      return newImages
    })
    if (coverIndex === from) onCoverChange(to)
    else if (coverIndex === to) onCoverChange(from)
  }

  // Called when a server URL image successfully loads in the browser
  // Now we can safely revoke the localPreview since the server image is displayed
  const handleServerImageLoad = useCallback((imageId: string) => {
    onChange(prev => prev.map(i => {
      if (i.id === imageId && i.localPreview) {
        // Revoke the objectURL since the server image loaded
        URL.revokeObjectURL(i.localPreview)
        objectURLsRef.current.delete(i.localPreview)
        return { ...i, localPreview: undefined, serverLoaded: true }
      }
      if (i.id === imageId && !i.localPreview) {
        return { ...i, serverLoaded: true }
      }
      return i
    }))
  }, [onChange])

  // Retry a failed upload
  const retryUpload = useCallback((index: number) => {
    const image = images[index]
    if (!image) return

    // If we have the original file, retry the upload
    if (image.originalFile) {
      const tempId = image.id
      const localPreview = URL.createObjectURL(image.originalFile)
      objectURLsRef.current.add(localPreview)

      // Reset the error state
      onChange(prev => prev.map(i => i.id === tempId ? {
        ...i,
        error: false,
        errorMessage: undefined,
        uploading: true,
        localPreview,
      } : i))

      // Re-enqueue the file
      uploadQueueRef.current.push({
        file: image.originalFile,
        tempId,
        localPreview,
      })

      setTimeout(() => processQueue(), 0)
    } else {
      // No original file stored, remove and let user re-add
      removeImage(index)
    }
  }, [images, onChange, processQueue])

  // Get the display URL for an image
  // Priority: if we have a server URL and it's loaded, use that
  // Otherwise, use localPreview as fallback (ensures no blank flash)
  const getImageSrc = (image: ImageItem) => {
    if (image.serverLoaded && image.url) return image.url
    if (image.localPreview) return image.localPreview
    if (image.url) return image.url
    return ''
  }

  // Determine if we should use a hidden img to preload the server URL
  const shouldPreloadServerUrl = (image: ImageItem) => {
    return image.url && image.localPreview && !image.uploading && !image.serverLoaded
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ position: 'fixed', top: -9999, left: -9999, opacity: 0, pointerEvents: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Drop Zone */}
      <div
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault()
          const rect = e.currentTarget.getBoundingClientRect()
          if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
            setIsDragging(false)
          }
        }}
        onDrop={handleDrop}
        onClick={openFilePicker}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300',
          isDragging ? 'border-gold bg-gold/5 scale-[1.02]' : 'border-lavender-light hover:border-navy/40 hover:bg-surface',
          images.length >= maxImages && 'opacity-50 pointer-events-none'
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
            isDragging ? 'bg-gold/20' : 'bg-soft'
          )}>
            <ImagePlus className={cn('w-8 h-8 transition-colors', isDragging ? 'text-gold' : 'text-lavender-light')} />
          </div>
          <div>
            <p className="font-semibold text-navy text-lg">
              {isDragging ? 'Solta las imagenes aqui' : 'Arrastrá imagenes o hace clic'}
            </p>
            <p className="text-sm text-navy-light mt-1">
              JPG, PNG, WebP, HEIC · Max {maxImages} imagenes · Se redimensionan automáticamente
            </p>
          </div>
          {images.length > 0 && (
            <div className="flex items-center gap-2 bg-navy/5 rounded-full px-4 py-1.5">
              <ImageIcon className="w-4 h-4 text-navy" />
              <span className="text-sm font-medium text-navy">{images.length} / {maxImages}</span>
            </div>
          )}
        </div>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-navy text-sm flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4" />
              Imagenes ({images.length})
            </h4>
            <p className="text-xs text-lavender-light">Arrastrá para reordenar · ★ = portada</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((image, index) => {
              const imgSrc = getImageSrc(image)
              return (
                <div
                  key={image.id}
                  draggable={!image.uploading}
                  onDragStart={() => !image.uploading && setDragFromIndex(index)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index) }}
                  onDragEnd={() => { setDragFromIndex(null); setDragOverIndex(null) }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (dragFromIndex !== null && dragFromIndex !== index) {
                      const newImages = [...images]
                      const [moved] = newImages.splice(dragFromIndex, 1)
                      newImages.splice(index, 0, moved)
                      onChange(newImages)
                      if (coverIndex === dragFromIndex) onCoverChange(index)
                      else if (dragFromIndex < coverIndex && index >= coverIndex) onCoverChange(coverIndex - 1)
                      else if (dragFromIndex > coverIndex && index <= coverIndex) onCoverChange(coverIndex + 1)
                    }
                    setDragFromIndex(null)
                    setDragOverIndex(null)
                  }}
                  className={cn(
                    'group relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all duration-200',
                    dragOverIndex === index && dragFromIndex !== null && 'border-gold border-dashed scale-105',
                    index === coverIndex && !image.uploading && !image.error && 'border-gold shadow-lg shadow-gold/20 ring-2 ring-gold/40',
                    image.error && 'border-red-300 bg-red-50',
                    image.uploading && 'border-lavender/50 bg-surface',
                    !imgSrc && !image.uploading && !image.error && 'border-lavender/50 bg-soft',
                    !(dragOverIndex === index && dragFromIndex !== null) && index !== coverIndex && !image.error && !image.uploading && 'border-lavender/50 hover:border-navy/30'
                  )}
                >
                  {/* Main visible image */}
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={image.name}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : !image.uploading && !image.error ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-lavender" />
                    </div>
                  ) : null}

                  {/* Hidden preloader for server URL - loads image in background
                      When it loads successfully, we switch from localPreview to server URL */}
                  {shouldPreloadServerUrl(image) && (
                    <img
                      src={image.url}
                      alt=""
                      className="hidden"
                      draggable={false}
                      onLoad={() => handleServerImageLoad(image.id)}
                      onError={(e) => {
                        console.error('Server image failed to load:', image.url)
                        // Keep using localPreview, try again after a delay
                        setTimeout(() => {
                          handleServerImageLoad(image.id)
                        }, 2000)
                      }}
                    />
                  )}

                  {image.uploading && (
                    <div className="absolute inset-0 bg-navy/30 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                      <span className="text-white text-xs font-medium">Optimizando y subiendo...</span>
                    </div>
                  )}

                  {image.error && (
                    <div
                      className="absolute inset-0 bg-red-500/20 backdrop-blur-sm flex flex-col items-center justify-center gap-1 cursor-pointer p-2"
                      onClick={(e) => { e.stopPropagation(); removeImage(index) }}
                    >
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-[10px] text-red-600 font-medium text-center leading-tight line-clamp-3">{image.errorMessage || 'Error al subir'}</span>
                      <div className="flex gap-1 mt-1">
                        {image.originalFile && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); retryUpload(index) }}
                            className="text-[9px] bg-white/80 text-blue-600 px-2 py-0.5 rounded-full font-medium hover:bg-white transition-colors"
                          >
                            <RotateCw className="w-2.5 h-2.5 inline mr-0.5" />
                            Reintentar
                          </button>
                        )}
                        <span className="text-[9px] text-red-400">Quitar</span>
                      </div>
                    </div>
                  )}

                  {index === coverIndex && !image.uploading && !image.error && (
                    <div className="absolute top-1.5 left-1.5 bg-gold text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-md z-10">
                      <Star className="w-2.5 h-2.5 fill-white" />
                      PORTADA
                    </div>
                  )}

                  <div className="absolute top-1.5 right-1.5 bg-navy-dark/60 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center z-10">
                    {index + 1}
                  </div>

                  {!image.uploading && !image.error && imgSrc && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-end justify-center pb-2 gap-1 opacity-0 group-hover:opacity-100 z-20">
                      <button type="button" onClick={(e) => { e.stopPropagation(); onCoverChange(index) }}
                        className={cn('w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-md',
                          index === coverIndex ? 'bg-gold text-white' : 'bg-cream/90 text-navy hover:bg-gold hover:text-white'
                        )} title="Portada">
                        <Star className={cn('w-3.5 h-3.5', index === coverIndex && 'fill-white')} />
                      </button>
                      {index > 0 && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); moveImage(index, index - 1) }}
                          className="w-7 h-7 rounded-full bg-cream/90 text-navy hover:bg-navy hover:text-white flex items-center justify-center transition-all shadow-md" title="← Mover">
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {index < images.length - 1 && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); moveImage(index, index + 1) }}
                          className="w-7 h-7 rounded-full bg-cream/90 text-navy hover:bg-navy hover:text-white flex items-center justify-center transition-all shadow-md" title="Mover →">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(index) }}
                        className="w-7 h-7 rounded-full bg-cream/90 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all shadow-md" title="Eliminar">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {images.length < maxImages && (
              <div onClick={(e) => { e.stopPropagation(); openFilePicker() }}
                className="aspect-[4/3] rounded-xl border-2 border-dashed border-lavender-light hover:border-gold hover:bg-gold/5 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 gap-2 group">
                <Upload className="w-6 h-6 text-lavender-light group-hover:text-gold transition-colors" />
                <span className="text-xs text-lavender-light group-hover:text-gold font-medium transition-colors">Agregar</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-gold-dark bg-teal-soft rounded-lg px-4 py-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {images.filter(i => !i.uploading && !i.error).length} de {images.length} imagenes cargadas
              {images.some(i => i.uploading) && <span className="text-violet-600 font-medium"> · Optimizando...</span>}
              {coverIndex < images.length && <span className="text-gold font-medium"> · Portada: imagen {coverIndex + 1}</span>}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
