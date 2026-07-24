import { NextRequest, NextResponse } from 'next/server'
import { getAuthStatus } from '@/lib/auth'
import { getValidToken } from '@/lib/mercadolibre'

const ML_API = 'https://api.mercadolibre.com'

// GET - Diagnose ML account status, available listing types, quotas, and scopes
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get token
    let accessToken: string
    try {
      accessToken = await getValidToken()
    } catch (error: any) {
      return NextResponse.json({ error: 'Sin token: ' + error.message }, { status: 401 })
    }

    const headers = { 'Authorization': `Bearer ${accessToken}` }

    // 1. Get user info
    const userRes = await fetch(`${ML_API}/users/me`, { headers })
    const userData = await userRes.json()
    const userId = userData.id

    // 2. Get user reputation and full info
    const reputationRes = await fetch(`${ML_API}/users/${userId}`, { headers })
    const reputationData = await reputationRes.json()

    // 3. Check ALL listing types for this user (not filtered by category)
    let allListingTypes: any = null
    try {
      const altRes = await fetch(`${ML_API}/users/${userId}/listing_types`, { headers })
      allListingTypes = altRes.ok ? await altRes.json() : { error: await altRes.text(), status: altRes.status }
    } catch (error: any) {
      allListingTypes = { error: error.message }
    }

    // 4. Check available listing types for real estate categories
    const categories = ['MLA401686', 'MLA1473', 'MLA50279', 'MLA401685']
    const listingTypes: Record<string, any> = {}

    for (const catId of categories) {
      try {
        // Try with /me/ endpoint
        const meRes = await fetch(
          `${ML_API}/users/me/available_listing_types?category_id=${catId}`,
          { headers }
        )
        const meData = await meRes.json()

        // Also try with explicit user ID
        const idRes = await fetch(
          `${ML_API}/users/${userId}/available_listing_types?category_id=${catId}`,
          { headers }
        )
        const idData = await idRes.json()

        listingTypes[catId] = {
          viaMe: meRes.ok ? meData : { error: meData.message || meData.error, status: meRes.status, raw: meData },
          viaUserId: idRes.ok ? idData : { error: idData.message || idData.error, status: idRes.status, raw: idData },
        }
      } catch (error: any) {
        listingTypes[catId] = { error: error.message }
      }
    }

    // 5. Check posting limits / classifieds metrics
    let postingLimits: any = null
    try {
      const plRes = await fetch(
        `${ML_API}/users/${userId}/classifieds_metrics`,
        { headers }
      )
      postingLimits = plRes.ok ? await plRes.json() : { error: await plRes.text(), status: plRes.status }
    } catch {}

    // 6. Check MercadoPago account (needed for paid listings)
    let mercadopagoAccount: any = null
    try {
      const mpRes = await fetch(`${ML_API}/users/${userId}/mercadopago_account`, { headers })
      mercadopagoAccount = mpRes.ok ? await mpRes.json() : { status: mpRes.status, error: await mpRes.text() }
    } catch {}

    // 7. Check active listings count
    let activeListings: any = null
    try {
      const alRes = await fetch(
        `${ML_API}/users/${userId}/items/search?status=active`,
        { headers }
      )
      const alData = await alRes.json()
      activeListings = {
        total: alData.paging?.total || 0,
        results: alData.results || [],
      }
    } catch (error: any) {
      activeListings = { error: error.message }
    }

    // 8. Check token scope
    let tokenInfo: any = null
    try {
      const { prisma } = await import('@/lib/prisma')
      const tokenRecord = await prisma.mercadoLibreToken.findFirst({
        orderBy: { createdAt: 'desc' },
      })
      tokenInfo = tokenRecord ? {
        scope: tokenRecord.scope,
        expiresIn: tokenRecord.expiresIn,
        updatedAt: tokenRecord.updatedAt,
        hasRefreshToken: !!tokenRecord.refreshToken,
      } : null
    } catch {}

    // 9. Try a test validation for a sample item with 'free' listing type
    let testValidation: any = null
    try {
      const testItem = {
        title: 'Test - Departamento en Pinamar',
        category_id: 'MLA401686',
        price: 1,
        currency_id: 'ARS',
        available_quantity: 1,
        condition: 'not_specified',
        listing_type_id: 'free',
        description: { plain_text: 'Test validation only' },
        location: {
          address: 'Pinamar',
          city: { id: 'TVhYUGluYW1hclVISnZkbWx1YTJsaGRtVnZJR', name: 'Pinamar' },
          state: { id: 'UHJvdmlua2lhdmVvIGRlIEJ1ZW5vcyBBaXJl', name: 'Buenos Aires' },
          country_id: 'MLA',
        },
        attributes: [
          { id: 'OPERATION', value_name: 'Venta' },
          { id: 'ROOMS', value_name: '2' },
          { id: 'BEDROOMS', value_name: '1' },
          { id: 'FULL_BATHROOMS', value_name: '1' },
          { id: 'PARKING_LOTS', value_name: '0' },
          { id: 'TOTAL_AREA', value_name: '50 m\u00B2', value_struct: { number: 50, unit: 'm\u00B2' } },
          { id: 'COVERED_AREA', value_name: '40 m\u00B2', value_struct: { number: 40, unit: 'm\u00B2' } },
        ],
      }
      const valRes = await fetch(`${ML_API}/items/validate`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(testItem),
      })
      const valData = await valRes.json()
      testValidation = {
        free: {
          status: valRes.status,
          ok: valRes.ok,
          data: valData,
        },
      }

      // Also test with 'silver'
      const testItemSilver = { ...testItem, listing_type_id: 'silver' }
      const valResSilver = await fetch(`${ML_API}/items/validate`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(testItemSilver),
      })
      const valDataSilver = await valResSilver.json()
      testValidation.silver = {
        status: valResSilver.status,
        ok: valResSilver.ok,
        data: valDataSilver,
      }

      // Also test with 'gold_special'
      const testItemGold = { ...testItem, listing_type_id: 'gold_special' }
      const valResGold = await fetch(`${ML_API}/items/validate`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(testItemGold),
      })
      const valDataGold = await valResGold.json()
      testValidation.gold_special = {
        status: valResGold.status,
        ok: valResGold.ok,
        data: valDataGold,
      }
    } catch (error: any) {
      testValidation = { error: error.message }
    }

    return NextResponse.json({
      user: {
        id: userId,
        nickname: userData.nickname,
        registration_date: userData.registration_date,
        country_id: userData.country_id,
        permalink: userData.permalink,
        seller_reputation: reputationData.seller_reputation,
        buyer_reputation: reputationData.buyer_reputation,
        status: reputationData.status,
        site_status: userData.site_status,
      },
      tokenInfo,
      allListingTypes,
      availableListingTypes: listingTypes,
      postingLimits,
      mercadopagoAccount,
      activeListings,
      testValidation,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
