// Force dynamic rendering for admin user management pages to prevent CDN caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function UsuariosLayout({ children }: { children: React.ReactNode }) {
  return children
}
