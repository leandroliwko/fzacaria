'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import PropertyForm, { type PropertyFormData, type TemporadaInput, defaultFormData } from '@/components/admin/PropertyForm'
import MultiImageUploader, { type ImageItem } from '@/components/MultiImageUploader'

export default function NuevaPropiedadPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Images
  const [images, setImages] = useState<ImageItem[]>([])
  const [coverIndex, setCoverIndex] = useState(0)

  // Video
  const [videoUrl, setVideoUrl] = useState('')

  // Map
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

  // Temporadas
  const [temporadas, setTemporadas] = useState<TemporadaInput[]>([])

  // Form fields
  const [form, setForm] = useState<PropertyFormData>({ ...defaultFormData })

  // ── Save ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (saving) return
    setFormError('')
    setSaving(true)

    try {
      // Validation
      if (!form.type) { setFormError('El tipo de propiedad es obligatorio'); setSaving(false); return }
      if (form.operation !== 'temporario' && !form.price.trim()) { setFormError('El precio es obligatorio'); setSaving(false); return }
      if (!form.location.trim()) { setFormError('La ubicación es obligatoria'); setSaving(false); return }

      // For temporario: require guests
      if (form.operation === 'temporario' && form.guests <= 0) {
        setFormError('Para alquiler temporario debés indicar la cantidad de huéspedes'); setSaving(false); return
      }

      // For temporario: require at least one temporada segment
      if (form.operation === 'temporario' && temporadas.length === 0) {
        setFormError('Para alquiler temporario debés agregar al menos un segmento de temporada'); setSaving(false); return
      }

      // Validate temporada dates
      if (form.operation === 'temporario') {
        for (let i = 0; i < temporadas.length; i++) {
          const t = temporadas[i]
          if (!t.startDate || !t.endDate) {
            setFormError(`El segmento ${i + 1} debe tener fecha de ingreso y egreso`); setSaving(false); return
          }
        }
      }

      // Get uploaded image URLs
      const imageUrls = images.filter((i) => i.url && !i.uploading && !i.error).map((i) => i.url)

      // Build mlAmenities JSON string (only true values)
      const mlAmenitiesTrue: Record<string, boolean> = {}
      for (const [key, value] of Object.entries(form.mlAmenities)) {
        if (value === true) mlAmenitiesTrue[key] = true
      }

      // Build the data object
      const currencyPrefix = form.currency === 'ARS' ? '$' : 'U$S'
      const submitData: any = {
        title: form.title || `${form.operation === 'venta' ? 'Venta' : form.operation === 'alquiler' ? 'Alquiler' : 'Temporario'} - ${form.type} en ${form.location}`,
        type: form.type,
        operation: form.operation,
        price: form.operation === 'temporario'
          ? ''
          : (form.price.trim() ? `${currencyPrefix} ${form.price}` : ''),
        location: form.location,
        bedrooms: form.bedrooms,
        bathrooms: form.bathrooms,
        area: form.area,
        image: imageUrls.length > 0 ? imageUrls[coverIndex < imageUrls.length ? coverIndex : 0] : '',
        images: imageUrls.join(','),
        description: form.description,
        extras: '',
        features: '',
        featured: form.featured,
        active: form.published,
        label: form.label || null,
        video: videoUrl || null,
        coveredArea: form.coveredArea || null,
        totalArea: form.totalArea || null,
        latitude: latitude ?? -37.1067,
        longitude: longitude ?? -56.8688,
        // ML fields
        rooms: form.rooms,
        parkingLots: form.parkingLots,
        guests: form.guests,
        landAccess: form.landAccess,
        propertyAge: form.propertyAge,
        maintenanceFee: form.maintenanceFee,
        facing: form.facing,
        disposition: form.disposition,
        furnished: form.furnished,
        unitFloor: form.unitFloor,
        propertySubtype: form.propertySubtype,
        lotDisposition: form.lotDisposition,
        mlAmenities: JSON.stringify(mlAmenitiesTrue),
        propertyCode: form.propertyCode,
        contactSchedule: form.contactSchedule,
        petsAllowed: form.petsAllowed,
        // New ML fields
        warehouses: form.warehouses,
        floors: form.floors,
        apartmentNumber: form.apartmentNumber,
        towerNumber: form.towerNumber,
        houseNumber: form.houseNumber,
        apartmentsPerFloor: form.apartmentsPerFloor,
        lotDepth: form.lotDepth,
        lotWidth: form.lotWidth,
        lotShape: form.lotShape,
        securityType: form.securityType,
        minimumStay: form.minimumStay,
        beds: form.beds,
        availableFrom: form.availableFrom,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        inscriptionNumber: form.inscriptionNumber,
        offices: form.offices,
        officesPerFloor: form.officesPerFloor,
        wheelchairRamp: form.wheelchairRamp,
        suitableForMortgage: form.suitableForMortgage,
        professionalUse: form.professionalUse,
        childrenWelcome: form.childrenWelcome,
        onlyFamilies: form.onlyFamilies,
        monthlyRentFactor: form.monthlyRentFactor,
      }

      // Handle temporario dates (legacy fields)
      if (form.operation === 'temporario' && temporadas.length > 0) {
        const firstTemp = temporadas[0]
        const lastTemp = temporadas[temporadas.length - 1]
        submitData.tempStart = new Date(firstTemp.startDate + 'T00:00:00').toISOString()
        submitData.tempEnd = new Date(lastTemp.endDate + 'T00:00:00').toISOString()
      } else {
        submitData.tempStart = null
        submitData.tempEnd = null
      }

      // Include temporadas
      if (form.operation === 'temporario' && temporadas.length > 0) {
        submitData.temporadas = temporadas.map((t, i) => ({
          name: t.name,
          startDate: t.startDate,
          endDate: t.endDate,
          price: t.price,
          currency: t.currency,
          available: t.available,
          order: i,
        }))
      }

      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      const responseData = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(responseData.details || responseData.error || `Error del servidor (${res.status})`)
      }

      router.refresh()
      alert('¡Propiedad creada con éxito!')
      router.push('/admin/propiedades')
    } catch (err: any) {
      const msg = err.message || 'Error al guardar la propiedad'
      setFormError(msg)
      alert('Error: ' + msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/admin/propiedades')} className="p-2 rounded-lg hover:bg-soft transition-colors">
          <ArrowLeft className="w-5 h-5 text-navy" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">Nueva Propiedad</h1>
          <p className="text-navy-light mt-1">Completá los datos de la propiedad</p>
        </div>
      </div>

      <PropertyForm
        form={form}
        setForm={setForm}
        images={images}
        setImages={setImages}
        coverIndex={coverIndex}
        setCoverIndex={setCoverIndex}
        videoUrl={videoUrl}
        setVideoUrl={setVideoUrl}
        latitude={latitude}
        setLatitude={setLatitude}
        longitude={longitude}
        setLongitude={setLongitude}
        temporadas={temporadas}
        setTemporadas={setTemporadas}
        saving={saving}
        formError={formError}
        onSubmit={handleSave}
        onCancel={() => router.push('/admin/propiedades')}
        submitLabel="Crear Propiedad"
      />
    </div>
  )
}
