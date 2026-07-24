'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  HardDrive,
  FileJson,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface BackupRecord {
  id: string
  filename: string
  size: number
  type: string
  status: string
  propertyCount: number
  articleCount: number
  integrityOk: boolean
  notes: string
  createdAt: string
  fileExists: boolean
}

interface IntegrityIssue {
  severity: 'critical' | 'warning' | 'info'
  message: string
  propertyId?: string
  propertyTitle?: string
}

interface IntegrityResult {
  ok: boolean
  criticalCount: number
  warningCount: number
  totalChecks: number
  issues: IntegrityIssue[]
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Ahora mismo'
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  return `Hace ${diffDays}d`
}

export default function RespaldoPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [integrity, setIntegrity] = useState<IntegrityResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [checkingIntegrity, setCheckingIntegrity] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [expandedBackup, setExpandedBackup] = useState<string | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadAction, setUploadAction] = useState<'save' | 'restore'>('save')

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch('/api/backup')
      if (res.ok) {
        const data = await res.json()
        setBackups(data.backups || [])
      }
    } catch {
      toast.error('Error al cargar backups')
    }
  }, [])

  const fetchIntegrity = useCallback(async () => {
    setCheckingIntegrity(true)
    try {
      const res = await fetch('/api/backup/integrity')
      if (res.ok) {
        const data = await res.json()
        setIntegrity(data)
      }
    } catch {
      toast.error('Error al verificar integridad')
    } finally {
      setCheckingIntegrity(false)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchBackups(), fetchIntegrity()])
      setLoading(false)
    }
    load()
  }, [fetchBackups, fetchIntegrity])

  async function handleCreateManualBackup() {
    setCreating(true)
    try {
      const res = await fetch('/api/backup', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Backup creado exitosamente')
        if (!data.integrityOk && data.issues?.length > 0) {
          toast.warning(`Problemas detectados: ${data.issues.length} advertencias`)
        }
        await fetchBackups()
        await fetchIntegrity()
      } else {
        toast.error(data.error || 'Error al crear backup')
      }
    } catch {
      toast.error('Error de conexión al crear backup')
    } finally {
      setCreating(false)
    }
  }

  async function handleDownload(filename: string) {
    setDownloading(filename)
    try {
      const res = await fetch(`/api/backup/download?file=${encodeURIComponent(filename)}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success('Backup descargado exitosamente')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al descargar')
      }
    } catch {
      toast.error('Error al descargar backup')
    } finally {
      setDownloading(null)
    }
  }

  async function handleRestore(filename: string) {
    if (confirmRestore !== filename) {
      setConfirmRestore(filename)
      toast.warning('Presiona nuevamente para confirmar la restauración. Esto reemplazará todos los datos actuales.')
      return
    }

    setRestoring(filename)
    setConfirmRestore(null)

    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, source: 'server' }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(`Restauración completa: ${data.propertiesRestored} propiedades, ${data.articlesRestored} artículos`)
        await fetchBackups()
        await fetchIntegrity()
      } else {
        toast.error(data.error || 'Error al restaurar')
      }
    } catch {
      toast.error('Error de conexión al restaurar')
    } finally {
      setRestoring(null)
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      toast.error('Solo se permiten archivos JSON')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('action', uploadAction)

      const res = await fetch('/api/backup/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (res.ok) {
        if (uploadAction === 'restore') {
          toast.success(`Archivo subido y restaurado: ${data.propertiesRestored} propiedades, ${data.articlesRestored} artículos`)
        } else {
          toast.success(data.message || 'Backup subido exitosamente')
        }
        await fetchBackups()
        await fetchIntegrity()
      } else {
        toast.error(data.error || 'Error al subir archivo')
      }
    } catch {
      toast.error('Error de conexión al subir archivo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  const lastAutoBackup = backups.find(b => b.type === 'auto' && b.status === 'completed')
  const lastManualBackup = backups.find(b => b.type === 'manual' && b.status === 'completed')

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Page title */}
      <motion.div variants={item}>
        <h2 className="text-2xl font-bold text-navy flex items-center gap-3">
          <Shield className="w-7 h-7 text-gold" />
          Respaldo de Base de Datos
        </h2>
        <p className="text-navy-light mt-1">Protege y restaura los datos de tu inmobiliaria</p>
      </motion.div>

      {/* Quick status cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Integrity status */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${integrity?.ok ? 'bg-green-50' : 'bg-red-50'}`}>
                {integrity?.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-navy-light">Integridad</p>
                <p className={`text-sm font-bold ${integrity?.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {integrity?.ok ? 'OK' : 'Problemas'}
                </p>
              </div>
            </div>
          </CardContent>
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${integrity?.ok ? 'bg-green-500' : 'bg-red-500'}`} />
        </Card>

        {/* Last auto backup */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-navy-light">Último Auto-Backup</p>
                <p className="text-sm font-bold text-navy">
                  {lastAutoBackup ? timeAgo(lastAutoBackup.createdAt) : 'Ninguno'}
                </p>
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
        </Card>

        {/* Total backups */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-navy-light">Backups Totales</p>
                <p className="text-sm font-bold text-navy">{backups.length}</p>
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
        </Card>

        {/* Total size */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <FileJson className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-navy-light">Espacio Usado</p>
                <p className="text-sm font-bold text-navy">
                  {formatBytes(backups.reduce((acc, b) => acc + (b.fileExists ? b.size : 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </Card>
      </motion.div>

      {/* Action buttons */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-navy text-lg">Acciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {/* Create manual backup */}
              <Button
                onClick={handleCreateManualBackup}
                disabled={creating}
                className="bg-navy hover:bg-navy-light text-white"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <HardDrive className="w-4 h-4 mr-2" />
                )}
                Crear Backup Manual
              </Button>

              {/* Check integrity */}
              <Button
                onClick={fetchIntegrity}
                disabled={checkingIntegrity}
                variant="outline"
                className="border-navy text-navy hover:bg-navy hover:text-white"
              >
                {checkingIntegrity ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                Verificar Integridad
              </Button>

              {/* Refresh list */}
              <Button
                onClick={() => { fetchBackups(); fetchIntegrity() }}
                variant="outline"
                className="border-gold text-gold-dark hover:bg-gold hover:text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
            </div>

            {/* Upload section */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium text-navy mb-3">Restaurar desde archivo en tu PC</p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="uploadAction"
                      checked={uploadAction === 'save'}
                      onChange={() => setUploadAction('save')}
                      className="accent-navy"
                    />
                    <span className="text-sm text-navy">Solo guardar</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer ml-4">
                    <input
                      type="radio"
                      name="uploadAction"
                      checked={uploadAction === 'restore'}
                      onChange={() => setUploadAction('restore')}
                      className="accent-red-600"
                    />
                    <span className="text-sm text-navy">Guardar y restaurar</span>
                  </label>
                </div>

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={uploadAction === 'restore' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gold hover:bg-gold-dark text-white'}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploadAction === 'restore' ? 'Subir y Restaurar' : 'Subir Backup'}
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleUpload}
                  className="hidden"
                />
              </div>
              {uploadAction === 'restore' && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Modo restauración: Esto reemplazará todos los datos actuales con los del archivo subido
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Integrity check results */}
      {integrity && (
        <motion.div variants={item}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-navy text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-gold" />
                Verificación de Integridad
              </CardTitle>
              <div className="flex items-center gap-2">
                {integrity.criticalCount > 0 && (
                  <Badge className="bg-red-100 text-red-700 border-0">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {integrity.criticalCount} críticos
                  </Badge>
                )}
                {integrity.warningCount > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-0">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {integrity.warningCount} advertencias
                  </Badge>
                )}
                {integrity.criticalCount === 0 && integrity.warningCount === 0 && (
                  <Badge className="bg-green-100 text-green-700 border-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Todo OK
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {integrity.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                      issue.severity === 'critical' ? 'bg-red-50 border border-red-100' :
                      issue.severity === 'warning' ? 'bg-amber-50 border border-amber-100' :
                      'bg-blue-50 border border-blue-100'
                    }`}
                  >
                    {issue.severity === 'critical' ? (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : issue.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span className={
                        issue.severity === 'critical' ? 'text-red-700' :
                        issue.severity === 'warning' ? 'text-amber-700' :
                        'text-blue-700'
                      }>
                        {issue.message}
                      </span>
                      {issue.propertyTitle && (
                        <span className="text-navy-light ml-1">({issue.propertyTitle})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Auto-backup info */}
      <motion.div variants={item}>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Backup Automático</p>
                <p className="text-xs text-blue-600 mt-1">
                  El sistema crea un backup automático cada 15 minutos si la base de datos está funcionando correctamente.
                  Se conservan las últimas 24 horas de backups automáticos. Los backups manuales se conservan por 90 días.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Backup list */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-navy text-lg">Historial de Backups</CardTitle>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <div className="text-center py-10">
                <HardDrive className="w-12 h-12 text-lavender-light mx-auto mb-3" />
                <p className="text-navy-light">No hay backups registrados</p>
                <p className="text-xs text-lavender-light mt-1">Crea tu primer backup manual para comenzar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="border border-lavender/30 rounded-lg overflow-hidden hover:border-lavender transition-colors"
                  >
                    {/* Backup row */}
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surface/50"
                      onClick={() => setExpandedBackup(expandedBackup === backup.id ? null : backup.id)}
                    >
                      {/* Type icon */}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        backup.type === 'auto' ? 'bg-blue-50' : 'bg-gold/10'
                      }`}>
                        {backup.type === 'auto' ? (
                          <Clock className="w-4 h-4 text-blue-600" />
                        ) : (
                          <HardDrive className="w-4 h-4 text-gold-dark" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-navy truncate">
                            {backup.type === 'auto' ? 'Automático' : 'Manual'}
                          </p>
                          {backup.status === 'completed' ? (
                            <Badge className="bg-green-100 text-green-700 border-0 text-[10px] px-1.5">Completado</Badge>
                          ) : backup.status === 'failed' ? (
                            <Badge className="bg-red-100 text-red-700 border-0 text-[10px] px-1.5">Fallido</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] px-1.5">Validando</Badge>
                          )}
                          {!backup.integrityOk && backup.status === 'completed' && (
                            <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] px-1.5">
                              <AlertTriangle className="w-3 h-3 mr-0.5" />
                              Issues
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-navy-light mt-0.5">
                          {formatDate(backup.createdAt)} · {formatBytes(backup.size)} · {backup.propertyCount} props · {backup.articleCount} arts
                        </p>
                      </div>

                      {/* Time ago */}
                      <span className="text-xs text-lavender-light flex-shrink-0 hidden sm:block">
                        {timeAgo(backup.createdAt)}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {backup.fileExists && backup.status === 'completed' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(backup.filename)}
                              disabled={downloading === backup.filename}
                              className="h-8 w-8 p-0 text-navy-light hover:text-navy hover:bg-soft"
                              title="Descargar"
                            >
                              {downloading === backup.filename ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(backup.filename)}
                              disabled={restoring === backup.filename}
                              className={`h-8 w-8 p-0 ${
                                confirmRestore === backup.filename
                                  ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                  : 'text-navy-light hover:text-red-600 hover:bg-red-50'
                              }`}
                              title={confirmRestore === backup.filename ? 'Confirmar restauración' : 'Restaurar'}
                            >
                              {restoring === backup.filename ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                            </Button>
                          </>
                        )}
                        {!backup.fileExists && (
                          <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px]">
                            Archivo no disponible
                          </Badge>
                        )}
                      </div>

                      {/* Expand */}
                      {expandedBackup === backup.id ? (
                        <ChevronUp className="w-4 h-4 text-navy-light flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-navy-light flex-shrink-0" />
                      )}
                    </div>

                    {/* Expanded details */}
                    {expandedBackup === backup.id && (
                      <div className="px-3 pb-3 pt-0 border-t border-lavender/20">
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-navy-light">Archivo:</span>
                              <span className="text-navy ml-2 text-xs font-mono">{backup.filename}</span>
                            </div>
                            <div>
                              <span className="text-navy-light">Tamaño:</span>
                              <span className="text-navy ml-2">{formatBytes(backup.size)}</span>
                            </div>
                            <div>
                              <span className="text-navy-light">Tipo:</span>
                              <span className="text-navy ml-2 capitalize">{backup.type}</span>
                            </div>
                            <div>
                              <span className="text-navy-light">Integridad:</span>
                              <span className={`ml-2 ${backup.integrityOk ? 'text-green-600' : 'text-amber-600'}`}>
                                {backup.integrityOk ? 'OK' : 'Con problemas'}
                              </span>
                            </div>
                          </div>
                          {backup.notes && (
                            <div className="mt-2">
                              <span className="text-navy-light">Notas:</span>
                              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-1">{backup.notes}</p>
                            </div>
                          )}
                          {confirmRestore === backup.filename && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Confirmar restauración
                              </p>
                              <p className="text-xs text-red-600 mt-1">
                                Esto reemplazará TODOS los datos actuales con este backup. Presiona el botón de restaurar nuevamente para confirmar.
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmRestore(null)}
                                className="mt-2 text-red-600 hover:text-red-800 hover:bg-red-100"
                              >
                                Cancelar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
