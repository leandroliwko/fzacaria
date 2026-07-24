// Force dynamic rendering for admin property pages to prevent CDN caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function PropiedadesLayout({ children }: { children: React.ReactNode }) {
  return children
}
