'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function VisitTracker() {
  const pathname = usePathname()
  const trackedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Don't track admin pages
    if (pathname.startsWith('/admin')) return

    // Don't track API routes
    if (pathname.startsWith('/api')) return

    // Track each page view once per session per path
    const sessionKey = `visited-${pathname}`
    if (trackedRef.current.has(pathname)) return
    trackedRef.current.add(pathname)

    // Debounce: wait a bit to avoid tracking rapid navigations
    const timer = setTimeout(() => {
      fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathname }),
      }).catch(() => {
        // Silently fail - tracking shouldn't break the site
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [pathname])

  return null
}
