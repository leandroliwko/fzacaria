'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import PropertyForm, { type PropertyFormData, type TemporadaInput, defaultFormData } from '@/components/admin/PropertyForm'
import MultiImageUploader, { type ImageItem } from '@/components/MultiImageUploader'

// ── Migration helper: map old extras/features to ML amenities ──────────

const EXTRA_TO_AMENITY: Record<string, string> = {
  'Aire acond.': 'HAS_AIR_CONDITIONING',
  'Aire acondicionado': 'HAS_AIR_CONDITIONING',
  'Calefacción': 'HAS_HEATING',
  'Parrilla': 'HAS_GRILL',
  'Pileta': 'HAS_SWIMMING_POOL',
  'Jardín': 'HAS_GARDEN',
  'Balcón': 'HAS_BALCONY',
  'Terraza': 'HAS_TERRACE',
  'Amoblado': 'FURNISHED',
  'WiFi': 'HAS_INTERNET_ACCESS',
  'Seguridad': 'HAS_SECURITY',
  'Cochera': 'PARKING_LOTS',
  'Parque': 'HAS_GARDEN',
  'Lavadero': 'HAS_LAUNDRY',
  'Gimnasio': 'HAS_GYM',
  'Cocina integrada': 'HAS_KITCHEN',
  'Agua Corriente': 'HAS_TAP_WATER',
  'Cloacas': 'HAS_DRAINAGE',
  'Gas Natural': 'HAS_NATURAL_GAS',
  'Cochera cubierta': 'PARKING_LOTS',
  'Cochera descubierta': 'PARKING_LOTS',
  'Cochera semi-cubierta': 'PARKING_LOTS',
  'SUM': 'HAS_MULTIPURPOSE_ROOM',
  'Céntrico': '',
}

const FEATURE_TO_FIELD: Record<string, string> = {
  'Apto crédito': 'suitableForMortgage',
  'Barrio cerrado': 'IN_GATED_COMMUNITY',
}

export default function EditarPropiedadPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
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

  // ── Load property data ──────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/properties/${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          alert('Propiedad no encontrada')
          router.push('/admin/propiedades')
          return
        }

        // Parse image URLs
        const imageUrls: string[] = data.images
          ? data.images.split(',').filter(Boolean).map((u: string) =>
              u.startsWith('/uploads/') ? u.replace('/uploads/', '/api/uploads/') : u
            )
          : []
        setImages(
          imageUrls.map((url: string, i: number) => ({
            id: `existing-${i}`,
            url,
            name: url.split('/').pop() || `imagen-${i + 1}`,
            serverLoaded: true,
          }))
        )
        setCoverIndex(data.coverIndex || 0)
        setLatitude(data.latitude ?? null)
        setLongitude(data.longitude ?? null)
        setVideoUrl(data.video || '')

        // Parse price to get currency and value
        let currency = 'USD'
        let priceValue = data.price || ''
        if (priceValue.startsWith('$') && !priceValue.startsWith('U$')) {
          currency = 'ARS'
          priceValue = priceValue.replace(/^\$\s*/, '')
        } else if (priceValue.startsWith('U$S')) {
          currency = 'USD'
          priceValue = priceValue.replace(/^U\$S\s*/, '')
        }

        // Parse mlAmenities JSON
        let parsedMlAmenities: Record<string, boolean> = {}
        if (data.mlAmenities) {
          try {
            parsedMlAmenities = JSON.parse(data.mlAmenities)
          } catch {}
        }

        // ── Migration: map old extras to ML amenities ──
        const extras = data.extras ? data.extras.split(',').map((e: string) => e.trim()).filter(Boolean) : []
        const features = data.features ? data.features.split(',').map((f: string) => f.trim()).filter(Boolean) : []

        for (const extra of extras) {
          const amenityId = EXTRA_TO_AMENITY[extra]
          if (amenityId && !parsedMlAmenities[amenityId]) {
            parsedMlAmenities[amenityId] = true
          }
        }

        // ── Migration: map features to fields ──
        let migratedSuitableForMortgage = data.suitableForMortgage || false
        for (const feature of features) {
          if (feature === 'Apto crédito') migratedSuitableForMortgage = true
          if (feature === 'Barrio cerrado') parsedMlAmenities['IN_GATED_COMMUNITY'] = true
        }

        // ── Migration: code → propertyCode ──
        let migratedPropertyCode = data.propertyCode || ''
        if (!migratedPropertyCode && data.code && data.code !== 'PENDING') {
          migratedPropertyCode = data.code
        }

        // ── Migration: area fallback ──
        let migratedArea = data.area || 0
        if (migratedArea === 0 && data.totalArea) {
          migratedArea = data.totalArea
        }

        setForm({
          title: data.title || '',
          type: data.type || 'casa',
          operation: data.operation || 'venta',
          price: priceValue,
          currency,
          location: data.location || '',
          bedrooms: data.bedrooms || 0,
          bathrooms: data.bathrooms || 0,
          area: migratedArea,
          coveredArea: data.coveredArea || 0,
          totalArea: data.totalArea || 0,
          description: data.description || '',
          featured: data.featured || false,
          published: data.active !== false,
          label: (data.label === 'RESERVADO' || data.label === 'VENDIDO') ? data.label : '',
          extras: extras,
          features: features,
          // ML fields
          rooms: data.rooms || 0,
          parkingLots: data.parkingLots || 0,
          guests: data.guests || 0,
          landAccess: data.landAccess || '',
          propertyAge: data.propertyAge || 0,
          maintenanceFee: data.maintenanceFee || '',
          facing: data.facing || '',
          disposition: data.disposition || '',
          furnished: data.furnished || false,
          unitFloor: data.unitFloor || 0,
          propertySubtype: data.propertySubtype || '',
          lotDisposition: data.lotDisposition || '',
          mlAmenities: parsedMlAmenities,
          propertyCode: migratedPropertyCode,
          contactSchedule: data.contactSchedule || '',
          petsAllowed: data.petsAllowed || false,
          // New ML fields
          warehouses: data.warehouses || 0,
          floors: data.floors || 0,
          apartmentNumber: data.apartmentNumber || '',
          towerNumber: data.towerNumber || 0,
          houseNumber: data.houseNumber || '',
          apartmentsPerFloor: data.apartmentsPerFloor || 0,
          lotDepth: data.lotDepth || 0,
          lotWidth: data.lotWidth || 0,
          lotShape: data.lotShape || '',
          securityType: data.securityType || '',
          minimumStay: data.minimumStay || 0,
          beds: data.beds || 0,
          availableFrom: data.availableFrom || '',
          checkIn: data.checkIn || '',
          checkOut: data.checkOut || '',
          inscriptionNumber: data.inscriptionNumber || '',
          offices: data.offices || 0,
          officesPerFloor: data.officesPerFloor || 0,
          wheelchairRamp: data.wheelchairRamp || false,
          suitableForMortgage: migratedSuitableForMortgage,
          professionalUse: data.professionalUse || false,
          childrenWelcome: data.childrenWelcome || false,
          onlyFamilies: data.onlyFamilies || false,
          monthlyRentFactor: data.monthlyRentFactor || '',
        })

        // Load temporadas
        if (data.temporadas && Array.isArray(data.temporadas) && data.temporadas.length > 0) {
          setTemporadas(
            data.temporadas.map((t: any) => ({
              id: t.id,
              name: t.name || '',
              startDate: t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : '',
              endDate: t.endDate ? new Date(t.endDate).toISOString().split('T')[0] : '',
              price: t.price || '',
              currency: t.currency || 'USD',
              available: t.available !== false,
            }))
          )
        }
      })
      .catch(() => router.push('/admin/propiedades'))
      .finally(() => setLoading(false))
  }, [id, router])

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

      if (form.operation === 'temporario' && form.guests <= 0) {
        setFormError('Para alquiler temporario debés indicar la cantidad de huéspedes'); setSaving(false); return
      }

      if (form.operation === 'temporario' && temporadas.length === 0) {
        setFormError('Para alquiler temporario debés agregar al menos un segmento de temporada'); setSaving(false); return
      }

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

      // Build mlAmenities JSON string
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

      // Handle temporario dates
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

      const res = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      const responseData = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(responseData.details || responseData.error || `Error del servidor (${res.status})`)
      }

      router.refresh()
      alert('¡Propiedad actualizada con éxito!')
      router.push('/admin/propiedades')
    } catch (err: any) {
      const msg = err.message || 'Error al actualizar la propiedad'
      setFormError(msg)
      alert('Error: ' + msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-navy animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/admin/propiedades')} className="p-2 rounded-lg hover:bg-soft transition-colors">
          <ArrowLeft className="w-5 h-5 text-navy" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy">Editar Propiedad</h1>
          <p className="text-navy-light mt-1">Modificá los datos de la propiedad</p>
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
        submitLabel="Guardar Cambios"
      />
    </div>
  )
}
