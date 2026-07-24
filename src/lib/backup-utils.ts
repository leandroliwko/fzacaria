import path from 'path'

// On Vercel/Railway (production), /tmp is the only reliably writable directory
// On local dev, use ./backups in the project root
export function getBackupDir(): string {
  if (process.env.VERCEL === '1') {
    return '/tmp/backups'
  }
  if (process.env.NODE_ENV === 'production') {
    // Railway: use /tmp for ephemeral storage
    return '/tmp/backups'
  }
  return path.join(process.cwd(), 'backups')
}
