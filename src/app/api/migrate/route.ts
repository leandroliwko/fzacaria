import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthStatus } from '@/lib/auth'
import { hashPassword } from '@/lib/password'

// Admin-only endpoint to push schema changes to the database
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthStatus()
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const results: string[] = []

    // Helper: check if table exists
    async function tableExists(name: string): Promise<boolean> {
      const res = await prisma.$queryRawUnsafe(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
        name
      )
      return (res as any)[0]?.exists || false
    }

    // Helper: check if column exists
    async function columnExists(table: string, column: string): Promise<boolean> {
      const res = await prisma.$queryRawUnsafe(
        `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2)`,
        table, column
      )
      return (res as any)[0]?.exists || false
    }

    // Helper: check if index exists
    async function indexExists(name: string): Promise<boolean> {
      const res = await prisma.$queryRawUnsafe(
        `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1)`,
        name
      )
      return (res as any)[0]?.exists || false
    }

    // ─── Admin table schema upgrade ───
    // Add role, active, phone, lastLoginAt, updatedAt columns if missing
    const adminColumns = [
      { name: 'role', sql: `ALTER TABLE "Admin" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'editor'` },
      { name: 'active', sql: `ALTER TABLE "Admin" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true` },
      { name: 'phone', sql: `ALTER TABLE "Admin" ADD COLUMN "phone" TEXT` },
      { name: 'lastLoginAt', sql: `ALTER TABLE "Admin" ADD COLUMN "lastLoginAt" TIMESTAMP(3)` },
      { name: 'updatedAt', sql: `ALTER TABLE "Admin" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP` },
    ]

    for (const col of adminColumns) {
      if (!(await columnExists('Admin', col.name))) {
        await prisma.$executeRawUnsafe(col.sql)
        results.push(`Added column Admin.${col.name}`)
      }
    }

    // Promote existing admin (the original one) to superadmin if it still has default 'editor' role
    // Only if there's exactly one Admin row
    const adminCount = await prisma.admin.count()
    if (adminCount === 1) {
      const existingAdmin = await prisma.admin.findFirst()
      if (existingAdmin && existingAdmin.role === 'editor') {
        await prisma.admin.update({
          where: { id: existingAdmin.id },
          data: { role: 'superadmin' },
        })
        results.push('Promoted existing admin to superadmin role')
      }
    }

    // ─── Property table: add createdById column + foreign key ───
    if (!(await columnExists('Property', 'createdById'))) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN "createdById" TEXT`)
      results.push('Added column Property.createdById')
    }

    // Add foreign key constraint if missing
    const fkExists = await prisma.$queryRawUnsafe(
      `SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_name = 'Property_createdById_fkey')`
    )
    if (!(fkExists as any)[0]?.exists) {
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Property" ADD CONSTRAINT "Property_createdById_fkey"
          FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE
        `)
        results.push('Added foreign key Property.createdById → Admin.id')
      } catch (e: any) {
        // Ignore if it already exists
        if (!e.message.includes('already exists')) {
          results.push(`FK warning: ${e.message}`)
        }
      }
    }

    // Add index on createdById for performance
    if (!(await indexExists('Property_createdById_idx'))) {
      try {
        await prisma.$executeRawUnsafe(`CREATE INDEX "Property_createdById_idx" ON "Property"("createdById")`)
        results.push('Added index Property.createdById')
      } catch {
        // ignore
      }
    }

    // ─── Legacy migrations (kept for backward compatibility) ───
    // Add Property columns if they don't exist
    const propertyColumns = [
      { name: 'video', sql: `ALTER TABLE "Property" ADD COLUMN "video" TEXT` },
      { name: 'coveredArea', sql: `ALTER TABLE "Property" ADD COLUMN "coveredArea" INTEGER NOT NULL DEFAULT 0` },
      { name: 'totalArea', sql: `ALTER TABLE "Property" ADD COLUMN "totalArea" INTEGER NOT NULL DEFAULT 0` },
      { name: 'tempStart', sql: `ALTER TABLE "Property" ADD COLUMN "tempStart" TIMESTAMP(3)` },
      { name: 'tempEnd', sql: `ALTER TABLE "Property" ADD COLUMN "tempEnd" TIMESTAMP(3)` },
      { name: 'latitude', sql: `ALTER TABLE "Property" ADD COLUMN "latitude" DOUBLE PRECISION NOT NULL DEFAULT -37.1067` },
      { name: 'longitude', sql: `ALTER TABLE "Property" ADD COLUMN "longitude" DOUBLE PRECISION NOT NULL DEFAULT -56.8688` },
      { name: 'label', sql: `ALTER TABLE "Property" ADD COLUMN "label" TEXT` },
      { name: 'order', sql: `ALTER TABLE "Property" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0` },
    ]

    for (const col of propertyColumns) {
      if (!(await columnExists('Property', col.name))) {
        await prisma.$executeRawUnsafe(col.sql)
        results.push(`Added column Property.${col.name}`)
      }
    }

    // Create Temporada table if not exists
    if (!(await tableExists('Temporada'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "Temporada" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "startDate" TIMESTAMP(3) NOT NULL,
          "endDate" TIMESTAMP(3) NOT NULL,
          "price" TEXT NOT NULL DEFAULT '',
          "currency" TEXT NOT NULL DEFAULT 'USD',
          "available" BOOLEAN NOT NULL DEFAULT true,
          "order" INTEGER NOT NULL DEFAULT 0,
          "propertyId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Temporada_pkey" PRIMARY KEY ("id")
        )
      `)
      await prisma.$executeRawUnsafe(`CREATE INDEX "Temporada_propertyId_idx" ON "Temporada"("propertyId")`)
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Temporada" ADD CONSTRAINT "Temporada_propertyId_fkey"
        FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `)
      results.push('Created table Temporada')
    }

    // Create MLSettings table if not exists
    if (!(await tableExists('MLSettings'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "MLSettings" (
          "id" TEXT NOT NULL,
          "appId" TEXT NOT NULL DEFAULT '',
          "appSecret" TEXT NOT NULL DEFAULT '',
          "redirectUri" TEXT NOT NULL DEFAULT 'https://fzacaria.com.ar/api/mercadolibre/auth/callback',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "MLSettings_pkey" PRIMARY KEY ("id")
        )
      `)
      results.push('Created table MLSettings')
    }

    // Create MercadoLibreToken table if not exists
    if (!(await tableExists('MercadoLibreToken'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "MercadoLibreToken" (
          "id" TEXT NOT NULL,
          "accessToken" TEXT NOT NULL,
          "refreshToken" TEXT NOT NULL,
          "expiresIn" INTEGER NOT NULL,
          "scope" TEXT NOT NULL DEFAULT '',
          "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
          "mlUserId" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "MercadoLibreToken_pkey" PRIMARY KEY ("id")
        )
      `)
      results.push('Created table MercadoLibreToken')
    }

    // Create MercadoLibreListing table if not exists
    if (!(await tableExists('MercadoLibreListing'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "MercadoLibreListing" (
          "id" TEXT NOT NULL,
          "propertyId" TEXT NOT NULL,
          "mlItemId" TEXT NOT NULL DEFAULT '',
          "mlPermalink" TEXT NOT NULL DEFAULT '',
          "status" TEXT NOT NULL DEFAULT 'pending',
          "lastSynced" TIMESTAMP(3),
          "errorMessage" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "MercadoLibreListing_pkey" PRIMARY KEY ("id")
        )
      `)
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "MercadoLibreListing_propertyId_key" ON "MercadoLibreListing"("propertyId")`)
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "MercadoLibreListing" ADD CONSTRAINT "MercadoLibreListing_propertyId_fkey"
        FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `)
      results.push('Created table MercadoLibreListing')
    }

    // Create ZonaPropListing table if not exists
    if (!(await tableExists('ZonaPropListing'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "ZonaPropListing" (
          "id" TEXT NOT NULL,
          "propertyId" TEXT NOT NULL,
          "zpStatus" TEXT NOT NULL DEFAULT 'active',
          "zpId" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ZonaPropListing_pkey" PRIMARY KEY ("id")
        )
      `)
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "ZonaPropListing_propertyId_key" ON "ZonaPropListing"("propertyId")`)
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "ZonaPropListing" ADD CONSTRAINT "ZonaPropListing_propertyId_fkey"
        FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `)
      results.push('Created table ZonaPropListing')
    }

    // Create CabapropSettings table if not exists
    if (!(await tableExists('CabapropSettings'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "CabapropSettings" (
          "id" TEXT NOT NULL,
          "apiKey" TEXT NOT NULL DEFAULT '',
          "webhookUrl" TEXT NOT NULL DEFAULT '',
          "matricula" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CabapropSettings_pkey" PRIMARY KEY ("id")
        )
      `)
      results.push('Created table CabapropSettings')
    }

    // Create CabapropListing table if not exists
    if (!(await tableExists('CabapropListing'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "CabapropListing" (
          "id" TEXT NOT NULL,
          "propertyId" TEXT NOT NULL,
          "cbStatus" TEXT NOT NULL DEFAULT 'active',
          "cbId" TEXT NOT NULL DEFAULT '',
          "cbPermalink" TEXT NOT NULL DEFAULT '',
          "lastSynced" TIMESTAMP(3),
          "errorMessage" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CabapropListing_pkey" PRIMARY KEY ("id")
        )
      `)
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "CabapropListing_propertyId_key" ON "CabapropListing"("propertyId")`)
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "CabapropListing" ADD CONSTRAINT "CabapropListing_propertyId_fkey"
        FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `)
      results.push('Created table CabapropListing')
    }

    // Create Backup table if not exists
    if (!(await tableExists('Backup'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "Backup" (
          "id" TEXT NOT NULL,
          "filename" TEXT NOT NULL,
          "size" INTEGER NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'auto',
          "status" TEXT NOT NULL DEFAULT 'completed',
          "propertyCount" INTEGER NOT NULL DEFAULT 0,
          "articleCount" INTEGER NOT NULL DEFAULT 0,
          "integrityOk" BOOLEAN NOT NULL DEFAULT true,
          "notes" TEXT NOT NULL DEFAULT '',
          "blobUrl" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Backup_pkey" PRIMARY KEY ("id")
        )
      `)
      results.push('Created table Backup')
    }

    // Create Visit table if not exists
    if (!(await tableExists('Visit'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "Visit" (
          "id" TEXT NOT NULL,
          "path" TEXT NOT NULL DEFAULT '/',
          "referrer" TEXT NOT NULL DEFAULT '',
          "country" TEXT NOT NULL DEFAULT '',
          "userAgent" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
        )
      `)
      results.push('Created table Visit')
    }

    // Create ContactMessage table if not exists
    if (!(await tableExists('ContactMessage'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "ContactMessage" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "phone" TEXT NOT NULL DEFAULT '',
          "subject" TEXT NOT NULL DEFAULT '',
          "message" TEXT NOT NULL,
          "read" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
        )
      `)
      results.push('Created table ContactMessage')
    }

    // Create TasacionRequest table if not exists
    if (!(await tableExists('TasacionRequest'))) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "TasacionRequest" (
          "id" TEXT NOT NULL,
          "nombre" TEXT NOT NULL,
          "telefono" TEXT NOT NULL,
          "email" TEXT NOT NULL DEFAULT '',
          "tipoPropiedad" TEXT NOT NULL,
          "zona" TEXT NOT NULL,
          "mensaje" TEXT NOT NULL DEFAULT '',
          "contacted" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "TasacionRequest_pkey" PRIMARY KEY ("id")
        )
      `)
      results.push('Created table TasacionRequest')
    }

    // ─── Seed: ensure at least one superadmin exists ───
    const superadminCount = await prisma.admin.count({ where: { role: 'superadmin' } })
    if (superadminCount === 0) {
      // Promote any existing admin to superadmin
      const anyAdmin = await prisma.admin.findFirst()
      if (anyAdmin) {
        await prisma.admin.update({
          where: { id: anyAdmin.id },
          data: { role: 'superadmin' },
        })
        results.push(`Promoted ${anyAdmin.email} to superadmin (none existed)`)
      } else {
        // Create default admin if none exists
        const hashedPassword = await hashPassword('admin123')
        await prisma.admin.create({
          data: {
            email: 'admin@florencia.com',
            password: hashedPassword,
            name: 'Administrador',
            role: 'superadmin',
            active: true,
          },
        })
        results.push('Created default superadmin: admin@florencia.com / admin123')
      }
    }

    if (results.length === 0) {
      results.push('All tables and columns already exist - no migration needed')
    }

    return NextResponse.json({ success: true, message: 'Migration completed', results })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed', details: error.message }, { status: 500 })
  }
}
