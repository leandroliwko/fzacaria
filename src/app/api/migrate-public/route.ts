import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'

// PUBLIC endpoint (no auth) to push schema changes to the database
// This is needed because the new Prisma client expects columns that don't exist yet,
// which breaks the auth flow. So we need a public endpoint to bootstrap.
// After running this once, you can delete this file or it will just be a no-op.

export async function POST() {
  try {
    const results: string[] = []

    // Helper: check if column exists
    async function columnExists(table: string, column: string): Promise<boolean> {
      const res = await prisma.$queryRawUnsafe(
        `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2)`,
        table, column
      )
      return (res as any)[0]?.exists || false
    }

    async function indexExists(name: string): Promise<boolean> {
      const res = await prisma.$queryRawUnsafe(
        `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1)`,
        name
      )
      return (res as any)[0]?.exists || false
    }

    // ─── Admin table schema upgrade ───
    const adminColumns = [
      { name: 'role', sql: `ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'editor'` },
      { name: 'active', sql: `ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true` },
      { name: 'phone', sql: `ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "phone" TEXT` },
      { name: 'lastLoginAt', sql: `ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)` },
      { name: 'updatedAt', sql: `ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP` },
    ]

    for (const col of adminColumns) {
      try {
        await prisma.$executeRawUnsafe(col.sql)
        results.push(`Ensured column Admin.${col.name}`)
      } catch (e: any) {
        if (!e.message.includes('already exists')) {
          results.push(`Admin.${col.name}: ${e.message}`)
        }
      }
    }

    // Promote existing admin to superadmin
    const adminCount = await prisma.admin.count()
    if (adminCount >= 1) {
      const existingAdmins = await prisma.admin.findMany()
      for (const admin of existingAdmins) {
        if (admin.role !== 'superadmin') {
          // Only promote the first one to superadmin
          if (admin === existingAdmins[0]) {
            await prisma.$executeRawUnsafe(
              `UPDATE "Admin" SET "role" = 'superadmin' WHERE "id" = $1`,
              admin.id
            )
            results.push(`Promoted ${admin.email} to superadmin`)
          }
        }
      }
    }

    // ─── Property table: add createdById column ───
    if (!(await columnExists('Property', 'createdById'))) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN "createdById" TEXT`)
        results.push('Added column Property.createdById')
      } catch (e: any) {
        if (!e.message.includes('already exists')) {
          results.push(`Property.createdById: ${e.message}`)
        }
      }
    }

    // Add foreign key constraint
    const fkExists = await prisma.$queryRawUnsafe(
      `SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND constraint_name = 'Property_createdById_fkey')`
    )
    if (!(fkExists as any)[0]?.exists) {
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Property" ADD CONSTRAINT "Property_createdById_fkey"
          FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE
        `)
        results.push('Added FK Property.createdById → Admin.id')
      } catch (e: any) {
        if (!e.message.includes('already exists')) {
          results.push(`FK: ${e.message}`)
        }
      }
    }

    // Add index
    if (!(await indexExists('Property_createdById_idx'))) {
      try {
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Property_createdById_idx" ON "Property"("createdById")`)
        results.push('Added index Property.createdById')
      } catch {
        // ignore
      }
    }

    // ─── Seed: ensure at least one superadmin exists ───
    const superadminCount = await prisma.admin.count({ where: { role: 'superadmin' } })
    if (superadminCount === 0) {
      const anyAdmin = await prisma.admin.findFirst()
      if (anyAdmin) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Admin" SET "role" = 'superadmin' WHERE "id" = $1`,
          anyAdmin.id
        )
        results.push(`Promoted ${anyAdmin.email} to superadmin (none existed)`)
      } else {
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
      results.push('All schema changes already applied - no migration needed')
    }

    return NextResponse.json({ success: true, message: 'Migration completed', results })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed', details: error.message }, { status: 500 })
  }
}
