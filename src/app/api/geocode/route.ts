import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    // Use Nominatim (OpenStreetMap) free geocoding service
    const encodedAddress = encodeURIComponent(`${address}, Buenos Aires, Argentina`)
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=5&countrycodes=ar`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'InmobiliariaFlorenciaZacaria/1.0',
        'Accept-Language': 'es',
      },
    })

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`)
    }

    const data = await response.json()

    const results = data.map((item: any) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type,
      importance: item.importance,
    }))

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json({ error: 'Error en geocodificación', results: [] }, { status: 500 })
  }
}
