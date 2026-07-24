'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users as UsersIcon,
  UserPlus,
  Search,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Edit,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface AdminUser {
  id: string
  email: string
  name: string
  role: 'superadmin' | 'editor'
  active: boolean
  phone: string
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  _count: { properties: number }
}

interface CurrentUser {
  id: string
  email: string
  name: string
  role: string
}

type ModalMode = 'create' | 'edit' | 'delete' | null

export default function UsuariosPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    currentPassword: '',
    role: 'editor' as 'editor' | 'superadmin',
    active: true,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/check', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setCurrentUser(data.admin)
      }
    } catch {
      // ignore
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      // cache: 'no-store' prevents Next.js fetch cache so we always get fresh data
      const res = await fetch('/api/admin/users', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      } else if (res.status === 403) {
        toast.error('Solo el superadmin puede gestionar usuarios')
      }
    } catch {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCurrentUser()
    fetchUsers()
  }, [fetchCurrentUser, fetchUsers])

  // Refetch when window regains focus (user switches back to the tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchUsers()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchUsers])

  const isSuperadmin = currentUser?.role === 'superadmin'

  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.phone || '').includes(term)
    )
  })

  function openCreateModal() {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      currentPassword: '',
      role: 'editor',
      active: true,
    })
    setSelectedUser(null)
    setModalMode('create')
  }

  function openEditModal(user: AdminUser) {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '',
      currentPassword: '',
      role: user.role,
      active: user.active,
    })
    setSelectedUser(user)
    setModalMode('edit')
  }

  function openDeleteModal(user: AdminUser) {
    setSelectedUser(user)
    setModalMode('delete')
  }

  function closeModal() {
    setModalMode(null)
    setSelectedUser(null)
    setShowPassword(false)
    setShowCurrentPassword(false)
  }

  async function handleSubmit() {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Completá nombre y email')
      return
    }

    if (modalMode === 'create' && formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setSaving(true)
    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            role: formData.role,
            active: formData.active,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al crear usuario')
        }
        toast.success(`Usuario ${formData.name} creado correctamente`)
      } else if (modalMode === 'edit' && selectedUser) {
        // Build update body — only include fields that changed
        const body: any = {}
        if (formData.name !== selectedUser.name) body.name = formData.name
        if (formData.email !== selectedUser.email) body.email = formData.email
        if (formData.phone !== (selectedUser.phone || '')) body.phone = formData.phone
        if (formData.role !== selectedUser.role) body.role = formData.role
        if (formData.active !== selectedUser.active) body.active = formData.active
        if (formData.password) {
          body.password = formData.password
          // If editing own account, include currentPassword
          if (currentUser?.id === selectedUser.id && currentUser?.role !== 'superadmin') {
            body.currentPassword = formData.currentPassword
          }
        }

        if (Object.keys(body).length === 0) {
          toast.info('No hay cambios para guardar')
          closeModal()
          return
        }

        const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al actualizar usuario')
        }
        toast.success(`Usuario ${formData.name} actualizado`)
      }

      closeModal()
      // Refresh server-side cache and refetch client-side data
      router.refresh()
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedUser) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al eliminar usuario')
      }
      toast.success(`Usuario ${selectedUser.name} eliminado`)
      closeModal()
      // Refresh server-side cache and refetch client-side data
      router.refresh()
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return 'Nunca'
    try {
      return new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '—'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  if (!isSuperadmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-navy mb-2">Acceso restringido</h2>
        <p className="text-navy-light text-center max-w-md">
          Solo los usuarios con rol <strong>superadmin</strong> pueden gestionar usuarios.
          Contactate con el administrador principal si necesitás acceso.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-gold" />
            Usuarios
          </h2>
          <p className="text-navy-light mt-1">
            Gestioná los usuarios que pueden acceder al panel y cargar propiedades
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-navy hover:bg-navy-light text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-light" />
        <Input
          type="text"
          placeholder="Buscar por nombre, email o teléfono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-navy/10 flex items-center justify-center">
                <UsersIcon className="w-5 h-5 text-navy" />
              </div>
              <div>
                <p className="text-xs text-navy-light">Total</p>
                <p className="text-xl font-bold text-navy">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-xs text-navy-light">Superadmins</p>
                <p className="text-xl font-bold text-navy">
                  {users.filter((u) => u.role === 'superadmin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-navy-light">Activos</p>
                <p className="text-xl font-bold text-navy">
                  {users.filter((u) => u.active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-navy-light">Inactivos</p>
                <p className="text-xl font-bold text-navy">
                  {users.filter((u) => !u.active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-navy text-lg">Listado de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <UsersIcon className="w-12 h-12 text-lavender-light mb-3" />
              <p className="text-navy-light">
                {searchTerm ? 'No se encontraron usuarios con ese criterio' : 'No hay usuarios creados aún'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => {
                const isSelf = currentUser?.id === user.id
                return (
                  <div
                    key={user.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border transition-all ${
                      isSelf
                        ? 'bg-gold/5 border-gold/30'
                        : user.active
                        ? 'bg-white border-lavender/30 hover:border-navy/30'
                        : 'bg-surface border-lavender/30 opacity-70'
                    }`}
                  >
                    {/* Avatar + name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white ${
                          user.role === 'superadmin' ? 'bg-gold' : 'bg-navy'
                        }`}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-navy truncate">{user.name}</p>
                          {isSelf && (
                            <Badge className="bg-gold/20 text-gold-dark border-0 text-[10px]">Vos</Badge>
                          )}
                          {user.role === 'superadmin' ? (
                            <Badge className="bg-gold/20 text-gold-dark border-0 text-[10px]">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Superadmin
                            </Badge>
                          ) : (
                            <Badge className="bg-navy/10 text-navy border-0 text-[10px]">
                              <Shield className="w-3 h-3 mr-1" />
                              Editor
                            </Badge>
                          )}
                          {!user.active && (
                            <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">Inactivo</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-navy-light">
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </span>
                          {user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-navy-light">
                      <div className="flex items-center gap-1" title="Propiedades creadas">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="font-semibold text-navy">{user._count.properties}</span>
                        <span>props</span>
                      </div>
                      <div className="hidden sm:flex items-center gap-1" title="Último login">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDate(user.lastLoginAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(user)}
                        className="border-navy/20 text-navy hover:bg-navy hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="hidden sm:inline ml-1">Editar</span>
                      </Button>
                      {!isSelf && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteModal(user)}
                          className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline ml-1">Eliminar</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Create / Edit */}
      <AnimatePresence>
        {(modalMode === 'create' || modalMode === 'edit') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy-dark/60 z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-lavender/30 sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-navy flex items-center gap-2">
                  {modalMode === 'create' ? (
                    <>
                      <UserPlus className="w-5 h-5 text-gold" />
                      Nuevo Usuario
                    </>
                  ) : (
                    <>
                      <Edit className="w-5 h-5 text-gold" />
                      Editar Usuario
                    </>
                  )}
                </h3>
                <button onClick={closeModal} className="text-navy-light hover:text-navy">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Name */}
                <div>
                  <Label htmlFor="name" className="text-navy">
                    Nombre completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                    className="mt-1"
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className="text-navy">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@florencia.com"
                    className="mt-1"
                  />
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="phone" className="text-navy">
                    Teléfono <span className="text-navy-light text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+54 2255 123456"
                    className="mt-1"
                  />
                </div>

                {/* Current password (only when editing own account, non-superadmin) */}
                {modalMode === 'edit' &&
                  selectedUser &&
                  currentUser?.id === selectedUser.id &&
                  currentUser?.role !== 'superadmin' &&
                  formData.password && (
                    <div>
                      <Label htmlFor="currentPassword" className="text-navy">
                        Contraseña actual <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={formData.currentPassword}
                          onChange={(e) =>
                            setFormData({ ...formData, currentPassword: e.target.value })
                          }
                          placeholder="Ingresá tu contraseña actual"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-light hover:text-navy"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-navy-light mt-1">
                        Requerido para validar el cambio de contraseña
                      </p>
                    </div>
                  )}

                {/* Password */}
                <div>
                  <Label htmlFor="password" className="text-navy">
                    {modalMode === 'create' ? (
                      <>
                        Contraseña <span className="text-red-500">*</span>
                      </>
                    ) : (
                      <>
                        Nueva contraseña{' '}
                        <span className="text-navy-light text-xs">
                          (dejar vacío para mantener la actual)
                        </span>
                      </>
                    )}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={modalMode === 'create' ? 'Mínimo 6 caracteres' : '••••••••'}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-light hover:text-navy"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <Label className="text-navy">Rol</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'editor' })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        formData.role === 'editor'
                          ? 'border-navy bg-navy/5'
                          : 'border-lavender/30 hover:border-navy/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-navy" />
                        <span className="font-semibold text-navy text-sm">Editor</span>
                      </div>
                      <p className="text-xs text-navy-light">
                        Carga y edita propiedades. No gestiona usuarios.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'superadmin' })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        formData.role === 'superadmin'
                          ? 'border-gold bg-gold/5'
                          : 'border-lavender/30 hover:border-gold/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-4 h-4 text-gold" />
                        <span className="font-semibold text-navy text-sm">Superadmin</span>
                      </div>
                      <p className="text-xs text-navy-light">
                        Acceso total. Gestiona usuarios y configuración.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Active */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-surface">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 rounded border-navy/30 text-navy focus:ring-navy"
                  />
                  <Label htmlFor="active" className="text-navy cursor-pointer flex-1">
                    Usuario activo
                    <span className="block text-xs text-navy-light font-normal">
                      Los usuarios inactivos no pueden iniciar sesión
                    </span>
                  </Label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-lavender/30 sticky bottom-0 bg-white">
                <Button variant="outline" onClick={closeModal} disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="bg-navy hover:bg-navy-light text-white"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Guardando...
                    </>
                  ) : modalMode === 'create' ? (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Crear Usuario
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Delete confirmation */}
      <AnimatePresence>
        {modalMode === 'delete' && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy-dark/60 z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-navy">Eliminar usuario</h3>
                    <p className="text-sm text-navy-light">Esta acción no se puede deshacer</p>
                  </div>
                </div>
                <p className="text-navy-light mb-2">
                  ¿Estás seguro de que querés eliminar a{' '}
                  <strong className="text-navy">{selectedUser.name}</strong> ({selectedUser.email})?
                </p>
                {selectedUser._count.properties > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mt-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">
                      Este usuario tiene <strong>{selectedUser._count.properties} propiedades</strong>{' '}
                      creadas. Las propiedades no se eliminan, pero quedarán sin dueño asignado
                      (cualquier superadmin podrá editarlas).
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={closeModal} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleDelete}
                    disabled={saving}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
