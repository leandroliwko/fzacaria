'use client'

import { useState } from 'react'
import {
  Save, Building2, Home, Castle, LandPlot, Store,
  TreePine, Briefcase, Warehouse, Plus, X, Star, MapPin,
  CheckCircle2, Calendar, AlertCircle, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import MultiImageUploader, { type ImageItem } from '@/components/MultiImageUploader'
import VideoUploader from '@/components/admin/VideoUploader'
import PropertyMap from '@/components/PropertyMap'

// ── Types ──────────────────────────────────────────────────────────────

export interface PropertyFormData {
  title: string
  type: string
  operation: string
  price: string
  currency: string
  location: string
  bedrooms: number
  bathrooms: number
  area: number
  coveredArea: number
  totalArea: number
  description: string
  featured: boolean
  published: boolean
  label: '' | 'RESERVADO' | 'VENDIDO'
  extras: string[]
  features: string[]
  // ML fields
  rooms: number
  parkingLots: number
  guests: number
  landAccess: string
  propertyAge: number
  maintenanceFee: string
  facing: string
  disposition: string
  furnished: boolean
  unitFloor: number
  propertySubtype: string
  lotDisposition: string
  mlAmenities: Record<string, boolean>
  propertyCode: string
  contactSchedule: string
  petsAllowed: boolean
  // New ML fields
  warehouses: number
  floors: number
  apartmentNumber: string
  towerNumber: number
  houseNumber: string
  apartmentsPerFloor: number
  lotDepth: number
  lotWidth: number
  lotShape: string
  securityType: string
  minimumStay: number
  beds: number
  availableFrom: string
  checkIn: string
  checkOut: string
  inscriptionNumber: string
  offices: number
  officesPerFloor: number
  wheelchairRamp: boolean
  suitableForMortgage: boolean
  professionalUse: boolean
  childrenWelcome: boolean
  onlyFamilies: boolean
  monthlyRentFactor: string
}

export interface TemporadaInput {
  id?: string
  name: string
  startDate: string
  endDate: string
  price: string
  currency: string
  available: boolean
}

export const defaultFormData: PropertyFormData = {
  title: '',
  type: 'casa',
  operation: 'venta',
  price: '',
  currency: 'USD',
  location: '',
  bedrooms: 0,
  bathrooms: 0,
  area: 0,
  coveredArea: 0,
  totalArea: 0,
  description: '',
  featured: false,
  published: true,
  label: '',
  extras: [],
  features: [],
  rooms: 0,
  parkingLots: 0,
  guests: 0,
  landAccess: '',
  propertyAge: 0,
  maintenanceFee: '',
  facing: '',
  disposition: '',
  furnished: false,
  unitFloor: 0,
  propertySubtype: '',
  lotDisposition: '',
  mlAmenities: {},
  propertyCode: '',
  contactSchedule: '',
  petsAllowed: false,
  warehouses: 0,
  floors: 0,
  apartmentNumber: '',
  towerNumber: 0,
  houseNumber: '',
  apartmentsPerFloor: 0,
  lotDepth: 0,
  lotWidth: 0,
  lotShape: '',
  securityType: '',
  minimumStay: 0,
  beds: 0,
  availableFrom: '',
  checkIn: '',
  checkOut: '',
  inscriptionNumber: '',
  offices: 0,
  officesPerFloor: 0,
  wheelchairRamp: false,
  suitableForMortgage: false,
  professionalUse: false,
  childrenWelcome: false,
  onlyFamilies: false,
  monthlyRentFactor: '',
}

// ── Config ──────────────────────────────────────────────────────────────

const propertyTypes = [
  { value: 'casa', label: 'Casa', icon: Home },
  { value: 'departamento', label: 'Depto', icon: Building2 },
  { value: 'chalet', label: 'Chalet', icon: Castle },
  { value: 'ph', label: 'PH', icon: Building2 },
  { value: 'lote', label: 'Lote', icon: LandPlot },
  { value: 'local', label: 'Local', icon: Store },
  { value: 'galpon', label: 'Galpón', icon: Warehouse },
  { value: 'campo', label: 'Campo', icon: TreePine },
  { value: 'oficina', label: 'Oficina', icon: Briefcase },
  { value: 'quinta', label: 'Quinta', icon: Warehouse },
  { value: 'hotel', label: 'Hotel', icon: Building2 },
]

const operationTypes = [
  { value: 'venta', label: 'Venta', color: 'bg-gold' },
  { value: 'alquiler', label: 'Alquiler', color: 'bg-navy-light' },
  { value: 'temporario', label: 'Alquiler temporario', color: 'bg-teal-pale' },
]

// ── ML Select options ────────────────────────────────────────────────

const facingOptions = [
  { value: '', label: 'Seleccionar...' },
  { value: 'norte', label: 'Norte' },
  { value: 'sur', label: 'Sur' },
  { value: 'este', label: 'Este' },
  { value: 'oeste', label: 'Oeste' },
]

const dispositionOptions = [
  { value: '', label: 'Seleccionar...' },
  { value: 'frente', label: 'Frente' },
  { value: 'contrafrente', label: 'Contrafrente' },
  { value: 'interno', label: 'Interno' },
  { value: 'lateral', label: 'Lateral' },
]

const landAccessOptions = [
  { value: '', label: 'Seleccionar...' },
  { value: 'tierra', label: 'Tierra' },
  { value: 'arena', label: 'Arena' },
  { value: 'asfalto', label: 'Asfalto' },
  { value: 'ripio', label: 'Ripio' },
  { value: 'otro', label: 'Otro' },
]

const lotDispositionOptions = [
  { value: '', label: 'Seleccionar...' },
  { value: 'Otro', label: 'Otro' },
  { value: 'Perimetral', label: 'Perimetral' },
  { value: 'A rio', label: 'A río' },
  { value: 'A laguna', label: 'A laguna' },
  { value: 'Interno', label: 'Interno' },
]

const lotShapeOptions = [
  { value: '', label: 'Seleccionar...' },
  { value: 'Irregular', label: 'Irregular' },
  { value: 'Plano', label: 'Plano' },
  { value: 'Regular', label: 'Regular' },
]

const securityTypeOptions = [
  { value: '', label: 'Seleccionar...' },
  { value: '24 horas', label: '24 horas' },
  { value: 'Diurno', label: 'Diurno' },
  { value: 'Nocturno', label: 'Nocturno' },
  { value: 'Virtual', label: 'Virtual' },
]

const houseSubtypeOptions = [
  { value: '', label: 'Seleccionar...' },
  { value: 'Casa', label: 'Casa' },
  { value: 'Cabaña', label: 'Cabaña' },
  { value: 'Chalet', label: 'Chalet' },
  { value: 'Dúplex', label: 'Dúplex' },
  { value: 'Ph', label: 'PH' },
  { value: 'Tríplex', label: 'Tríplex' },
]

const apartmentSubtypeOptions = [
  { value: '', label: 'Seleccionar...' },
  { value: 'Departamento', label: 'Departamento' },
  { value: 'Dúplex', label: 'Dúplex' },
  { value: 'Loft', label: 'Loft' },
  { value: 'Monoambiente', label: 'Monoambiente' },
  { value: 'Penthhouse', label: 'Penthouse' },
  { value: 'Ph', label: 'PH' },
  { value: 'Piso', label: 'Piso' },
  { value: 'Semi piso', label: 'Semi piso' },
  { value: 'Tríplex', label: 'Tríplex' },
]

// Time options for check-in/check-out
const timeOptions = [
  { value: '', label: 'Seleccionar...' },
  ...Array.from({ length: 24 }, (_, i) => ({
    value: `${String(i).padStart(2, '0')}:00`,
    label: `${String(i).padStart(2, '0')}:00`,
  })),
]

// ── ML Amenity definitions ─────────────────────────────────────────────
// Organized exactly like ML with exact names

const mlAmenityCategories = [
  {
    name: 'Confort',
    items: [
      { id: 'HAS_AIR_CONDITIONING', label: 'Aire acondicionado' },
      { id: 'HAS_HEATING', label: 'Calefacción' },
      { id: 'HAS_INDOOR_FIREPLACE', label: 'Chimenea' },
      { id: 'HAS_JACUZZI', label: 'Jacuzzi' },
      { id: 'HAS_BOILER', label: 'Caldera' },
    ],
  },
  {
    name: 'Ambientes',
    items: [
      { id: 'HAS_KITCHEN', label: 'Cocina' },
      { id: 'HAS_DINNING_ROOM', label: 'Comedor' },
      { id: 'HAS_LIVING_ROOM', label: 'Living' },
      { id: 'HAS_BEDROOM_SUITE', label: 'Dormitorio en suite' },
      { id: 'HAS_MAID_ROOM', label: 'Dependencia de servicio' },
      { id: 'HAS_STUDY', label: 'Estudio' },
      { id: 'HAS_PLAYROOM', label: 'Playroom' },
      { id: 'HAS_HALF_BATH', label: 'Toilette' },
      { id: 'HAS_DRESSING_ROOM', label: 'Vestidor' },
      { id: 'HAS_BREAKFAST_BAR', label: 'Desayunador' },
      { id: 'HAS_BALCONY', label: 'Balcón' },
      { id: 'HAS_TERRACE', label: 'Terraza' },
    ],
  },
  {
    name: 'Exterior',
    items: [
      { id: 'HAS_GARDEN', label: 'Jardín' },
      { id: 'HAS_GRILL', label: 'Parrilla' },
      { id: 'HAS_PATIO', label: 'Patio' },
      { id: 'HAS_SWIMMING_POOL', label: 'Pileta' },
      { id: 'HAS_ELECTRIC_GATE_OPENER', label: 'Portón automático' },
      { id: 'HAS_CINEMA_HALL', label: 'Área de cine' },
    ],
  },
  {
    name: 'Seguridad',
    items: [
      { id: 'HAS_SECURITY', label: 'Seguridad' },
      { id: 'HAS_ALARM', label: 'Alarma' },
      { id: 'HAS_CONTROLLED_ACCESS', label: 'Acceso controlado' },
      { id: 'IN_GATED_COMMUNITY', label: 'En barrio cerrado' },
    ],
  },
  {
    name: 'Servicios',
    items: [
      { id: 'HAS_NATURAL_GAS', label: 'Gas natural' },
      { id: 'HAS_TAP_WATER', label: 'Agua corriente' },
      { id: 'HAS_DRAINAGE', label: 'Cloaca' },
      { id: 'HAS_ELECTRIC_LIGHT', label: 'Luz eléctrica' },
      { id: 'HAS_INTERNET_ACCESS', label: 'Internet' },
      { id: 'HAS_TELEPHONE_LINE', label: 'Línea telefónica' },
      { id: 'HAS_LAUNDRY', label: 'Con lavadero' },
      { id: 'WITH_LAUNDRY_CONNECTION', label: 'Con conexión para lavarropas' },
      { id: 'HAS_CISTERN', label: 'Cisterna' },
    ],
  },
  {
    name: 'Amenities del edificio/barrio',
    items: [
      { id: 'HAS_LIFT', label: 'Ascensor' },
      { id: 'HAS_GYM', label: 'Gimnasio' },
      { id: 'HAS_PADDLE_COURT', label: 'Cancha de paddle' },
      { id: 'HAS_TENNIS_COURT', label: 'Cancha de tenis' },
      { id: 'WITH_SOCCER_FIELD', label: 'Cancha de fútbol' },
      { id: 'HAS_PARTY_ROOM', label: 'Salón de fiestas' },
      { id: 'HAS_MULTIPURPOSE_ROOM', label: 'Salón de usos múltiples' },
      { id: 'HAS_PLAYGROUND', label: 'Área de juegos infantiles' },
      { id: 'HAS_GUEST_PARKING', label: 'Estacionamiento para visitantes' },
      { id: 'WITH_GREEN_AREA', label: 'Con área verde' },
      { id: 'HAS_SAUNA', label: 'Sauna' },
      { id: 'HAS_ELECTRIC_GENERATOR', label: 'Grupo electrógeno' },
      { id: 'WITH_SOLAR_ENERGY', label: 'Con energia solar' },
      { id: 'HAS_FRONT_DESK', label: 'Recepción' },
      { id: 'HAS_CLOSETS', label: 'Placards' },
      { id: 'HAS_FORESTATION', label: 'Forestación' },
      { id: 'HAS_BUSINESS_CENTER', label: 'Cowork' },
      { id: 'HAS_ROOF_GARDEN', label: 'Roof garden' },
    ],
  },
  {
    name: 'Equipamiento',
    items: [
      { id: 'HAS_FRIDGE', label: 'Heladera' },
      { id: 'HAS_MICROWAVE', label: 'Microondas' },
      { id: 'HAS_WASHING_MACHINE', label: 'Lavarropa' },
      { id: 'HAS_TV', label: 'TV' },
      { id: 'HAS_CABLE_TV', label: 'TV por cable' },
      { id: 'HAS_CUTLERY', label: 'Vajilla' },
    ],
  },
  {
    name: 'Servicios (temporario)',
    items: [
      { id: 'BREAKFAST_SERVICE', label: 'Servicio de desayuno' },
      { id: 'HOUSEKEEPING_SERVICE', label: 'Servicio de limpieza' },
    ],
  },
]

// ── Compute which amenities to show based on type/operation ─────────────

function getVisibleAmenities(type: string, operation: string) {
  const isTerrain = ['lote', 'campo'].includes(type)
  const isDepto = type === 'departamento'
  const isTemporario = operation === 'temporario'

  return mlAmenityCategories.map(cat => {
    let items = cat.items

    // Filter items based on type
    if (isTerrain) {
      // Terrenos: limited amenities
      if (cat.name === 'Ambientes' || cat.name === 'Confort' || cat.name === 'Equipamiento' || cat.name === 'Servicios (temporario)') {
        items = []
      }
      if (cat.name === 'Amenities del edificio/barrio') {
        items = items.filter(i => ['HAS_FORESTATION'].includes(i.id))
      }
      if (cat.name === 'Seguridad') {
        items = items // all security items for terrenos
      }
      if (cat.name === 'Servicios') {
        items = items.filter(i => ['HAS_DRAINAGE', 'HAS_ELECTRIC_LIGHT', 'HAS_NATURAL_GAS', 'HAS_TAP_WATER'].includes(i.id))
      }
    }

    if (cat.name === 'Equipamiento' && !isTemporario) {
      items = items.filter(i => i.id === 'HAS_FIRE_SYSTEM')
    }

    if (cat.name === 'Servicios (temporario)' && !isTemporario) {
      items = []
    }

    // Depto-specific amenities
    if (cat.name === 'Amenities del edificio/barrio' && isDepto) {
      // Show all including cowork and roof garden
    }

    return { ...cat, items }
  }).filter(cat => cat.items.length > 0)
}

// ── Reusable field components ──────────────────────────────────────────

function NumberField({ label, value, onChange, required, placeholder, suffix, min = 0 }: {
  label: string; value: number; onChange: (v: number) => void; required?: boolean; placeholder?: string; suffix?: string; min?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-dark mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {suffix && <span className="text-navy-light font-normal ml-1 text-xs">({suffix})</span>}
      </label>
      <div className="relative">
        <input type="number" min={min} value={value || ''} onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-full px-3 py-2.5 rounded-lg border border-lavender/50 focus:ring-2 focus:ring-gold focus:border-gold text-sm pr-12"
          placeholder={placeholder || '0'} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-navy-light">{suffix}</span>}
      </div>
    </div>
  )
}

function TextField({ label, value, onChange, required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-dark mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border border-lavender/50 focus:ring-2 focus:ring-gold focus:border-gold text-sm"
        placeholder={placeholder || ''} />
    </div>
  )
}

function SelectField({ label, value, onChange, options, required }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-dark mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border border-lavender/50 focus:ring-2 focus:ring-gold focus:border-gold text-sm bg-white">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function ToggleField({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer py-1">
      <button type="button" role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? 'bg-gold' : 'bg-lavender-light'
        }`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`} />
      </button>
      <span className="text-sm font-medium text-navy-dark">{label}</span>
    </label>
  )
}

// ── Main Component ───────────────────────────────────────────────────────

interface PropertyFormProps {
  form: PropertyFormData
  setForm: React.Dispatch<React.SetStateAction<PropertyFormData>>
  images: ImageItem[]
  setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>
  coverIndex: number
  setCoverIndex: React.Dispatch<React.SetStateAction<number>>
  videoUrl: string
  setVideoUrl: React.Dispatch<React.SetStateAction<string>>
  latitude: number | null
  setLatitude: React.Dispatch<React.SetStateAction<number | null>>
  longitude: number | null
  setLongitude: React.Dispatch<React.SetStateAction<number | null>>
  temporadas: TemporadaInput[]
  setTemporadas: React.Dispatch<React.SetStateAction<TemporadaInput[]>>
  saving: boolean
  formError: string
  onSubmit: () => void
  onCancel: () => void
  submitLabel: string
}

export default function PropertyForm({
  form, setForm, images, setImages, coverIndex, setCoverIndex,
  videoUrl, setVideoUrl, latitude, setLatitude, longitude, setLongitude,
  temporadas, setTemporadas, saving, formError, onSubmit, onCancel, submitLabel,
}: PropertyFormProps) {

  const [geocoding, setGeocoding] = useState(false)

  // ── Helpers ─────────────────────────────────────────────────────────

  const updateForm = (partial: Partial<PropertyFormData>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const toggleMlAmenity = (id: string) => {
    setForm((prev) => ({
      ...prev,
      mlAmenities: { ...prev.mlAmenities, [id]: !prev.mlAmenities[id] },
    }))
  }

  const addTemporada = () => {
    setTemporadas((prev) => [
      ...prev,
      { name: '', startDate: '', endDate: '', price: '', currency: 'USD', available: true },
    ])
  }

  const removeTemporada = (idx: number) => {
    setTemporadas((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateTemporada = (idx: number, field: keyof TemporadaInput, value: any) => {
    setTemporadas((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t))
    )
  }

  // ── Computed: show/hide fields based on type ──────────────────────

  const isTerrain = ['lote', 'campo'].includes(form.type)
  const isDepto = form.type === 'departamento'
  const isPH = form.type === 'ph'
  const isCasa = ['casa', 'chalet', 'quinta'].includes(form.type)
  const isLocal = form.type === 'local'
  const isOficina = form.type === 'oficina'
  const isTemporario = form.operation === 'temporario'
  const isAlquiler = form.operation === 'alquiler'
  const isVenta = form.operation === 'venta'

  const visibleAmenities = getVisibleAmenities(form.type, form.operation)

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <form noValidate className="space-y-8">

      {/* ═══════════════════ Section 1: TIPO DE PROPIEDAD ═══════════════════ */}
      <div className="bg-cream rounded-xl border border-lavender/30 p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-navy text-lg">Tipo de propiedad</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {propertyTypes.map((t) => {
            const Icon = t.icon
            return (
              <button key={t.value} type="button"
                onClick={() => updateForm({ type: t.value, propertySubtype: '' })}
                className={`flex flex-col items-center gap-2 px-3 py-4 rounded-xl border-2 text-sm font-medium transition-all ${
                  form.type === t.value
                    ? 'border-navy bg-navy/5 text-navy shadow-sm'
                    : 'border-lavender/30 text-navy-light hover:border-lavender-light hover:bg-white'
                }`}>
                <Icon className="w-7 h-7" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══════════════════ Section 2: OPERACIÓN ═══════════════════ */}
      <div className="bg-cream rounded-xl border border-lavender/30 p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-navy text-lg">Operación</h2>
        <div className="grid grid-cols-3 gap-3">
          {operationTypes.map((op) => (
            <button key={op.value} type="button"
              onClick={() => updateForm({ operation: op.value })}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                form.operation === op.value
                  ? `border-transparent text-white ${op.color} shadow-md`
                  : 'border-lavender/30 text-navy-light hover:border-lavender-light'
              }`}>
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════ Section 3: UBICACIÓN ═══════════════════ */}
      <div className="bg-cream rounded-xl border border-lavender/30 p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-navy text-lg">Ubicación</h2>
        <div>
          <label className="block text-sm font-medium text-navy-dark mb-1">
            Dirección <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input type="text" value={form.location} onChange={(e) => updateForm({ location: e.target.value })}
              className="flex-1 px-4 py-3 rounded-lg border border-lavender/50 focus:ring-2 focus:ring-gold focus:border-gold text-sm"
              placeholder="Ej: Pinamar Norte, Calle 10 y Av. Del Mar" />
            <Button type="button" variant="outline" size="sm"
              className="px-3 border-gold text-gold hover:bg-gold hover:text-white flex-shrink-0"
              disabled={geocoding || !form.location.trim()}
              onClick={async () => {
                setGeocoding(true)
                try {
                  const res = await fetch(`/api/geocode?address=${encodeURIComponent(form.location)}`)
                  const data = await res.json()
                  if (data.results && data.results.length > 0) {
                    setLatitude(data.results[0].lat)
                    setLongitude(data.results[0].lon)
                  } else {
                    alert('No se encontró la dirección.')
                  }
                } catch { alert('Error al buscar la dirección.') }
                finally { setGeocoding(false) }
              }}>
              {geocoding ? <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" /> : <MapPin className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-dark mb-2">Ubicación en el mapa</label>
          <p className="text-xs text-lavender-light mb-3">
            Ingresá la dirección y tocá <MapPin className="w-3 h-3 inline" /> para buscar, o hacé clic en el mapa.
          </p>
          <PropertyMap latitude={latitude} longitude={longitude} location={form.location} editable={true}
            onPositionChange={(lat, lng) => { setLatitude(lat); setLongitude(lng) }} />
          {latitude !== null && longitude !== null && (
            <p className="text-xs text-gold-dark mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Coordenadas: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          )}
        </div>
      </div>

      {/* ═══════════════════ Section 4: PRECIO ═══════════════════ */}
      {!isTemporario && (
        <div className="bg-cream rounded-xl border border-lavender/30 p-6 shadow-sm space-y-5">
          <h2 className="font-bold text-navy text-lg">Precio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-navy-dark mb-1">
                Moneda <span className="text-red-500">*</span>
              </label>
              <div className="flex rounded-xl border border-lavender/50 overflow-hidden">
                {[{ value: 'USD', label: 'USD' }, { value: 'ARS', label: 'ARS' }].map((c) => (
                  <button key={c.value} type="button" onClick={() => updateForm({ currency: c.value })}
                    className={`flex-1 px-4 py-3 text-sm font-bold transition-all ${
                      form.currency === c.value ? 'bg-navy text-white' : 'bg-cream text-lavender-light hover:bg-surface'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-dark mb-1">
                Precio <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.price} onChange={(e) => updateForm({ price: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-lavender/50 focus:ring-2 focus:ring-gold focus:border-gold text-sm"
                placeholder="Ej: 320.000" />
            </div>
          </div>
          {/* Expensas - only for depto/alquiler */}
          {(isDepto || isAlquiler) && (
            <div className="max-w-xs">
              <NumberField label="Expensas" value={parseInt(form.maintenanceFee) || 0}
                onChange={(v) => updateForm({ maintenanceFee: v > 0 ? String(v) : '' })}
                suffix="ARS" placeholder="Ej: 25000" />
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ Section 5: CARACTERÍSTICAS ═══════════════════ */}
      <div className="bg-cream rounded-xl border border-lavender/30 p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-navy text-lg">Características</h2>

        {/* ── Departamentos ── */}
        {isDepto && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Ambientes" value={form.rooms} onChange={(v) => updateForm({ rooms: v })} required />
              <NumberField label="Dormitorios" value={form.bedrooms} onChange={(v) => updateForm({ bedrooms: v })} required />
              <NumberField label="Baños" value={form.bathrooms} onChange={(v) => updateForm({ bathrooms: v })} required />
              <NumberField label="Cocheras" value={form.parkingLots} onChange={(v) => updateForm({ parkingLots: v })} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Superficie total" value={form.area} onChange={(v) => updateForm({ area: v })} required suffix="m²" />
              <NumberField label="Superficie cubierta" value={form.coveredArea} onChange={(v) => updateForm({ coveredArea: v })} suffix="m²" />
              <SelectField label="Tipo de departamento" value={form.propertySubtype} onChange={(v) => updateForm({ propertySubtype: v })} options={apartmentSubtypeOptions} />
              <NumberField label="Piso" value={form.unitFloor} onChange={(v) => updateForm({ unitFloor: v })} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <TextField label="Departamento nro" value={form.apartmentNumber} onChange={(v) => updateForm({ apartmentNumber: v })} placeholder="Ej: 4B" />
              <NumberField label="Torre nro" value={form.towerNumber} onChange={(v) => updateForm({ towerNumber: v })} />
              <NumberField label="Deptos por piso" value={form.apartmentsPerFloor} onChange={(v) => updateForm({ apartmentsPerFloor: v })} />
              <NumberField label="Bauleras" value={form.warehouses} onChange={(v) => updateForm({ warehouses: v })} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Antigüedad" value={form.propertyAge} onChange={(v) => updateForm({ propertyAge: v })} suffix="años" />
              <SelectField label="Disposición" value={form.disposition} onChange={(v) => updateForm({ disposition: v })} options={dispositionOptions} />
              <SelectField label="Orientación" value={form.facing} onChange={(v) => updateForm({ facing: v })} options={facingOptions} />
              <div /> {/* spacer */}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {isVenta && <ToggleField label="Apto crédito" checked={form.suitableForMortgage} onChange={(v) => updateForm({ suitableForMortgage: v })} />}
              <ToggleField label="Apto profesional" checked={form.professionalUse} onChange={(v) => updateForm({ professionalUse: v })} />
              <ToggleField label="Rampa silla de ruedas" checked={form.wheelchairRamp} onChange={(v) => updateForm({ wheelchairRamp: v })} />
              <ToggleField label="Amoblado" checked={form.furnished} onChange={(v) => updateForm({ furnished: v })} />
            </div>
          </>
        )}

        {/* ── Casas ── */}
        {isCasa && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Dormitorios" value={form.bedrooms} onChange={(v) => updateForm({ bedrooms: v })} />
              <NumberField label="Baños" value={form.bathrooms} onChange={(v) => updateForm({ bathrooms: v })} />
              <NumberField label="Ambientes" value={form.rooms} onChange={(v) => updateForm({ rooms: v })} />
              <NumberField label="Cocheras" value={form.parkingLots} onChange={(v) => updateForm({ parkingLots: v })} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Superficie total" value={form.area} onChange={(v) => updateForm({ area: v })} suffix="m²" />
              <NumberField label="Superficie cubierta" value={form.coveredArea} onChange={(v) => updateForm({ coveredArea: v })} suffix="m²" />
              <SelectField label="Tipo de casa" value={form.propertySubtype} onChange={(v) => updateForm({ propertySubtype: v })} options={houseSubtypeOptions} />
              <NumberField label="Cantidad de pisos" value={form.floors} onChange={(v) => updateForm({ floors: v })} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <TextField label="Número de la casa" value={form.houseNumber} onChange={(v) => updateForm({ houseNumber: v })} placeholder="Ej: 1234" />
              <NumberField label="Bauleras" value={form.warehouses} onChange={(v) => updateForm({ warehouses: v })} />
              <NumberField label="Antigüedad" value={form.propertyAge} onChange={(v) => updateForm({ propertyAge: v })} suffix="años" />
              <SelectField label="Orientación" value={form.facing} onChange={(v) => updateForm({ facing: v })} options={facingOptions} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <ToggleField label="Amoblado" checked={form.furnished} onChange={(v) => updateForm({ furnished: v })} />
              {isVenta && <ToggleField label="Apto crédito" checked={form.suitableForMortgage} onChange={(v) => updateForm({ suitableForMortgage: v })} />}
            </div>
          </>
        )}

        {/* ── PH ── */}
        {isPH && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Ambientes" value={form.rooms} onChange={(v) => updateForm({ rooms: v })} />
              <NumberField label="Dormitorios" value={form.bedrooms} onChange={(v) => updateForm({ bedrooms: v })} />
              <NumberField label="Baños" value={form.bathrooms} onChange={(v) => updateForm({ bathrooms: v })} />
              <NumberField label="Cocheras" value={form.parkingLots} onChange={(v) => updateForm({ parkingLots: v })} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Superficie total" value={form.area} onChange={(v) => updateForm({ area: v })} suffix="m²" />
              <NumberField label="Superficie cubierta" value={form.coveredArea} onChange={(v) => updateForm({ coveredArea: v })} suffix="m²" />
              <NumberField label="Antigüedad" value={form.propertyAge} onChange={(v) => updateForm({ propertyAge: v })} suffix="años" />
              <SelectField label="Orientación" value={form.facing} onChange={(v) => updateForm({ facing: v })} options={facingOptions} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <ToggleField label="Amoblado" checked={form.furnished} onChange={(v) => updateForm({ furnished: v })} />
              {isVenta && <ToggleField label="Apto crédito" checked={form.suitableForMortgage} onChange={(v) => updateForm({ suitableForMortgage: v })} />}
            </div>
          </>
        )}

        {/* ── Terrenos/Lotes ── */}
        {isTerrain && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Superficie total" value={form.area} onChange={(v) => updateForm({ area: v })} required suffix="m²" />
              <SelectField label="Acceso" value={form.landAccess} onChange={(v) => updateForm({ landAccess: v })} options={landAccessOptions} />
              <NumberField label="Superficie cubierta" value={form.coveredArea} onChange={(v) => updateForm({ coveredArea: v })} suffix="m²" />
              <SelectField label="Disposición del lote" value={form.lotDisposition} onChange={(v) => updateForm({ lotDisposition: v })} options={lotDispositionOptions} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SelectField label="Forma del terreno" value={form.lotShape} onChange={(v) => updateForm({ lotShape: v })} options={lotShapeOptions} />
              <NumberField label="Metros de frente" value={form.lotWidth} onChange={(v) => updateForm({ lotWidth: v })} />
              <NumberField label="Metros de fondo" value={form.lotDepth} onChange={(v) => updateForm({ lotDepth: v })} />
            </div>
          </>
        )}

        {/* ── Locales ── */}
        {isLocal && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Superficie total" value={form.area} onChange={(v) => updateForm({ area: v })} suffix="m²" />
              <NumberField label="Superficie cubierta" value={form.coveredArea} onChange={(v) => updateForm({ coveredArea: v })} suffix="m²" />
              <NumberField label="Baños" value={form.bathrooms} onChange={(v) => updateForm({ bathrooms: v })} />
              <NumberField label="Cocheras" value={form.parkingLots} onChange={(v) => updateForm({ parkingLots: v })} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Antigüedad" value={form.propertyAge} onChange={(v) => updateForm({ propertyAge: v })} suffix="años" />
              <NumberField label="Bauleras" value={form.warehouses} onChange={(v) => updateForm({ warehouses: v })} />
              <NumberField label="Cantidad de pisos" value={form.floors} onChange={(v) => updateForm({ floors: v })} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <ToggleField label="Probador" checked={!!form.mlAmenities['HAS_FITTING_ROOM']} onChange={(v) => toggleMlAmenity('HAS_FITTING_ROOM')} />
              <ToggleField label="Rampa silla de ruedas" checked={form.wheelchairRamp} onChange={(v) => updateForm({ wheelchairRamp: v })} />
              <ToggleField label="Sistema contra incendio" checked={!!form.mlAmenities['HAS_FIRE_SYSTEM']} onChange={(v) => toggleMlAmenity('HAS_FIRE_SYSTEM')} />
            </div>
          </>
        )}

        {/* ── Oficinas ── */}
        {isOficina && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Superficie total" value={form.area} onChange={(v) => updateForm({ area: v })} suffix="m²" />
              <NumberField label="Superficie cubierta" value={form.coveredArea} onChange={(v) => updateForm({ coveredArea: v })} suffix="m²" />
              <NumberField label="Baños" value={form.bathrooms} onChange={(v) => updateForm({ bathrooms: v })} />
              <NumberField label="Cocheras" value={form.parkingLots} onChange={(v) => updateForm({ parkingLots: v })} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Piso" value={form.unitFloor} onChange={(v) => updateForm({ unitFloor: v })} />
              <NumberField label="Número de oficinas" value={form.offices} onChange={(v) => updateForm({ offices: v })} />
              <NumberField label="Oficinas por piso" value={form.officesPerFloor} onChange={(v) => updateForm({ officesPerFloor: v })} />
              <NumberField label="Antigüedad" value={form.propertyAge} onChange={(v) => updateForm({ propertyAge: v })} suffix="años" />
            </div>
          </>
        )}

        {/* ── Hotel (fallback: similar to local) ── */}
        {form.type === 'hotel' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Superficie total" value={form.area} onChange={(v) => updateForm({ area: v })} suffix="m²" />
              <NumberField label="Superficie cubierta" value={form.coveredArea} onChange={(v) => updateForm({ coveredArea: v })} suffix="m²" />
              <NumberField label="Baños" value={form.bathrooms} onChange={(v) => updateForm({ bathrooms: v })} />
              <NumberField label="Cocheras" value={form.parkingLots} onChange={(v) => updateForm({ parkingLots: v })} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Antigüedad" value={form.propertyAge} onChange={(v) => updateForm({ propertyAge: v })} suffix="años" />
              <NumberField label="Cantidad de pisos" value={form.floors} onChange={(v) => updateForm({ floors: v })} />
            </div>
          </>
        )}

        {/* ── EXTRA: Temporario fields ── */}
        {isTemporario && (
          <div className="mt-4 pt-4 border-t border-lavender/20">
            <h3 className="font-semibold text-navy text-base mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold" />
              Datos de alquiler temporario
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Huéspedes" value={form.guests} onChange={(v) => updateForm({ guests: v })} required />
              <NumberField label="Camas" value={form.beds} onChange={(v) => updateForm({ beds: v })} />
              <NumberField label="Estadía mínima" value={form.minimumStay} onChange={(v) => updateForm({ minimumStay: v })} suffix="noches" />
              <TextField label="Nro. registro" value={form.inscriptionNumber} onChange={(v) => updateForm({ inscriptionNumber: v })} placeholder="Ej: 12345" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <SelectField label="Horario check in" value={form.checkIn} onChange={(v) => updateForm({ checkIn: v })} options={timeOptions} />
              <SelectField label="Horario check out" value={form.checkOut} onChange={(v) => updateForm({ checkOut: v })} options={timeOptions} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
              <ToggleField label="Admite mascotas" checked={form.petsAllowed} onChange={(v) => updateForm({ petsAllowed: v })} />
              <ToggleField label="Apto familias con niños" checked={form.childrenWelcome} onChange={(v) => updateForm({ childrenWelcome: v })} />
              <ToggleField label="Solo familias" checked={form.onlyFamilies} onChange={(v) => updateForm({ onlyFamilies: v })} />
              <ToggleField label="Amoblado" checked={form.furnished} onChange={(v) => updateForm({ furnished: v })} />
            </div>
          </div>
        )}

        {/* ── EXTRA: Alquiler fields ── */}
        {isAlquiler && !isTemporario && (
          <div className="mt-4 pt-4 border-t border-lavender/20">
            <h3 className="font-semibold text-navy text-base mb-3">Datos de alquiler</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <TextField label="Disponible desde" value={form.availableFrom} onChange={(v) => updateForm({ availableFrom: v })} placeholder="Ej: 01/03/2025" />
              {isCasa && (
                <TextField label="Factor multiplicador" value={form.monthlyRentFactor} onChange={(v) => updateForm({ monthlyRentFactor: v })} placeholder="Ej: 1.5" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════ Section 6: SERVICIOS Y AMENITIES ═══════════════════ */}
      <div className="bg-cream rounded-xl border border-gold/30 p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-navy text-lg flex items-center gap-2">
          🏪 Servicios y Amenities
        </h2>
        <p className="text-sm text-navy-light">Tildá los que correspondan. Estos campos se sincronizan con Mercado Libre.</p>

        <div className="space-y-5">
          {visibleAmenities.map((category) => (
            <div key={category.name}>
              <h3 className="text-sm font-semibold text-navy-dark mb-2 border-b border-lavender/20 pb-1">
                {category.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleMlAmenity(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      form.mlAmenities[item.id]
                        ? 'bg-gold text-white shadow-sm'
                        : 'bg-soft text-navy hover:bg-lavender/30'
                    }`}
                  >
                    {form.mlAmenities[item.id] && <CheckCircle2 className="w-3 h-3" />}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Security type select (only when HAS_SECURITY is true) */}
          {form.mlAmenities['HAS_SECURITY'] && (
            <div className="max-w-xs">
              <SelectField label="Tipo de seguridad" value={form.securityType} onChange={(v) => updateForm({ securityType: v })} options={securityTypeOptions} />
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════ Section 7: DESCRIPCIÓN ═══════════════════ */}
      <div className="bg-cream rounded-xl border border-lavender/30 p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-navy text-lg">Descripción</h2>
        <textarea rows={6} value={form.description} onChange={(e) => updateForm({ description: e.target.value })}
          className="w-full px-4 py-3 rounded-lg border border-lavender/50 focus:ring-2 focus:ring-gold focus:border-gold text-sm resize-y"
          placeholder="Describí la propiedad en detalle..." />
      </div>

      {/* ═══════════════════ Section 8: FOTOS ═══════════════════ */}
      <div className="bg-cream rounded-xl border border-lavender/30 p-6 shadow-sm">
        <h2 className="font-bold text-navy text-lg mb-1 flex items-center gap-2">
          <Star className="w-5 h-5 text-gold" />
          Fotografías
        </h2>
        <p className="text-sm text-navy-light mb-4">
          Subí fotos de la propiedad. Arrastrá para reordenar y marcá la portada con ★.
        </p>
        <MultiImageUploader images={images} onChange={setImages} coverIndex={coverIndex} onCoverChange={setCoverIndex} maxImages={20} />
      </div>

      {/* ═══════════════════ VIDEO ═══════════════════ */}
      <div className="bg-cream rounded-xl border border-lavender/30 p-6 shadow-sm">
        <VideoUploader videoUrl={videoUrl} onVideoChange={setVideoUrl} />
      </div>

      {/* ═══════════════════ Section 9: CÓDIGO DE PROPIEDAD ═══════════════════ */}
      <div className="bg-cream rounded-xl border border-lavender/30 p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-navy text-lg">Código de propiedad</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Código de propiedad" value={form.propertyCode} onChange={(v) => updateForm({ propertyCode: v })} placeholder="Ej: CA35" />
          <TextField label="Horario de contacto" value={form.contactSchedule} onChange={(v) => updateForm({ contactSchedule: v })} placeholder="Ej: Lunes a Viernes 9-18hs" />
        </div>
      </div>

      {/* ═══════════════════ Section 10: TEMPORADAS (only temporario) ═══════════════════ */}
      {isTemporario && (
        <div className="bg-teal-soft/50 border border-gold/20 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-navy text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gold" />
              Segmentos de Temporada
            </h2>
            <Button type="button" size="sm" className="bg-gold hover:bg-gold-dark text-white text-xs" onClick={addTemporada}>
              <Plus className="w-3 h-3 mr-1" />Agregar Segmento
            </Button>
          </div>
          <p className="text-sm text-navy-light">
            Agregá los segmentos de fechas y precios para el alquiler temporario.
          </p>

          {temporadas.length === 0 && (
            <div className="text-center py-8 bg-cream/50 rounded-lg border border-dashed border-gold/30">
              <Calendar className="w-10 h-10 text-lavender-light mx-auto mb-3" />
              <p className="text-sm text-navy-light font-medium">No hay segmentos de temporada</p>
              <p className="text-xs text-lavender-light mt-1">Hacé clic en &quot;Agregar Segmento&quot; para comenzar</p>
            </div>
          )}

          {temporadas.map((temp, idx) => (
            <div key={idx} className="bg-cream rounded-lg border border-gold/20 p-4 space-y-3 relative">
              <button type="button" onClick={() => removeTemporada(idx)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors">
                <X className="w-3 h-3" />
              </button>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gold/20 text-gold text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                <input type="text" value={temp.name} onChange={(e) => updateTemporada(idx, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gold/30 focus:ring-2 focus:ring-gold focus:border-gold text-sm"
                  placeholder="Nombre del segmento (ej: Primera quincena de enero)" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-navy-light">Fecha de Ingreso *</label>
                  <input type="date" value={temp.startDate} onChange={(e) => updateTemporada(idx, 'startDate', e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-lavender/50 focus:ring-2 focus:ring-gold focus:border-gold text-sm" />
                </div>
                <div>
                  <label className="text-xs text-navy-light">Fecha de Egreso *</label>
                  <input type="date" value={temp.endDate} min={temp.startDate || undefined} onChange={(e) => updateTemporada(idx, 'endDate', e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-lavender/50 focus:ring-2 focus:ring-gold focus:border-gold text-sm" />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs text-navy-light">Precio de esta temporada</label>
                  <div className="flex gap-2 mt-1">
                    <div className="flex rounded-lg border border-lavender/50 overflow-hidden flex-shrink-0">
                      {[{ value: 'USD', label: 'U$S' }, { value: 'ARS', label: '$' }].map((c) => (
                        <button key={c.value} type="button" onClick={() => updateTemporada(idx, 'currency', c.value)}
                          className={`px-2.5 py-2 text-xs font-semibold transition-all ${
                            (temp.currency || 'USD') === c.value ? 'bg-navy text-white' : 'bg-cream text-lavender-light hover:bg-surface'
                          }`}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <input type="text" value={temp.price} onChange={(e) => updateTemporada(idx, 'price', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-lavender/50 focus:ring-2 focus:ring-gold focus:border-gold text-sm"
                      placeholder="Ej: 500" />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input type="checkbox" checked={temp.available} onChange={(e) => updateTemporada(idx, 'available', e.target.checked)}
                    className="w-4 h-4 rounded border-lavender-light text-green-500 focus:ring-green-500" />
                  <span className="text-xs text-navy-light">{temp.available ? 'Disponible' : 'Reservado'}</span>
                </label>
              </div>
              {temp.startDate && temp.endDate && (
                <div className="bg-surface rounded-md px-3 py-2 text-xs text-navy flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-gold" />
                  <span className="font-medium">
                    {(() => {
                      const start = new Date(temp.startDate + 'T00:00:00')
                      const end = new Date(temp.endDate + 'T00:00:00')
                      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                      return `${start.toLocaleDateString('es-AR')} → ${end.toLocaleDateString('es-AR')} (${diff} día${diff !== 1 ? 's' : ''})`
                    })()}
                  </span>
                  {temp.price && <span className="text-gold font-semibold">• {(temp.currency || 'USD') === 'ARS' ? '$' : 'U$S'} {temp.price}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════ OPCIONES ═══════════════════ */}
      <div className="bg-cream rounded-xl border border-lavender/30 p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-navy text-lg">Opciones</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={(e) => updateForm({ featured: e.target.checked })}
              className="w-5 h-5 rounded border-lavender-light text-gold focus:ring-gold" />
            <span className="text-sm font-medium text-navy-dark">Propiedad destacada</span><Star className="w-4 h-4 text-gold" />
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.published} onChange={(e) => updateForm({ published: e.target.checked })}
              className="w-5 h-5 rounded border-lavender-light text-gold focus:ring-gold" />
            <span className="text-sm font-medium text-navy-dark">Publicar inmediatamente</span>
          </label>
        </div>
        <div className="pt-2 border-t border-lavender/20">
          <label className="block text-sm font-semibold text-navy-dark mb-2">Cartel sobre la foto</label>
          <div className="flex flex-wrap gap-2">
            {(['', 'RESERVADO', 'VENDIDO'] as const).map((opt) => {
              const isActive = form.label === opt
              const label = opt === '' ? 'Sin cartel' : opt
              const colorClass =
                opt === '' ? 'bg-white text-navy-dark border-lavender-light hover:bg-lavender-pale/40'
                : opt === 'RESERVADO' ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                : 'bg-red-600 text-white border-red-700 hover:bg-red-700'
              return (
                <button key={opt || 'none'} type="button" onClick={() => updateForm({ label: opt })}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border-2 transition-colors ${colorClass} ${isActive ? 'ring-2 ring-offset-1 ring-navy-dark' : ''}`}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── ERROR ── */}
      {formError && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">Error</p>
            <p className="text-sm text-red-600 mt-1">{formError}</p>
          </div>
        </div>
      )}

      {/* ── SUBMIT ── */}
      <div className="sticky bottom-0 bg-cream/95 backdrop-blur-sm border-t border-lavender/30 -mx-6 -mb-6 px-6 py-4 flex justify-between items-center gap-3 rounded-b-xl">
        <p className="text-sm text-navy-light">Los campos con * son obligatorios</p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="button" disabled={saving} onClick={onSubmit}
            className="bg-navy hover:bg-navy-light text-white min-w-[180px] text-base py-3 shadow-lg">
            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : (<><Save className="w-4 h-4 mr-2" />{submitLabel}</>)}
          </Button>
        </div>
      </div>
    </form>
  )
}
