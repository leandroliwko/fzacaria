import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

async function main() {
  // Create admin user
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: 'admin@florencia.com' },
  })

  if (!existingAdmin) {
    const hashedPassword = hashPassword('admin123')
    await prisma.admin.create({
      data: {
        email: 'admin@florencia.com',
        password: hashedPassword,
        name: 'Admin',
      },
    })
    console.log('Admin user created: admin@florencia.com / admin123')
  } else {
    console.log('Admin user already exists')
  }

  // Create sample properties
  const propCount = await prisma.property.count()
  if (propCount === 0) {
    await prisma.property.createMany({
      data: [
        {
          title: 'Casa Premium en Pinamar Norte',
          type: 'casa',
          operation: 'venta',
          price: 'USD 320.000',
          location: 'Pinamar Norte',
          bedrooms: 3,
          bathrooms: 2,
          area: 450,
          image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
          description: 'Excelente casa en Pinamar Norte con amplios espacios y jardín.',
          extras: 'Cochera,Parque,Parrilla',
          features: 'Escritura al día,Servicios conectados',
          featured: true,
          active: true,
        },
        {
          title: 'Departamento con Vista al Mar',
          type: 'departamento',
          operation: 'alquiler',
          price: '$ 250.000/mes',
          location: 'Cariló',
          bedrooms: 2,
          bathrooms: 1,
          area: 85,
          image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
          description: 'Hermoso departamento con vista al mar en Cariló.',
          extras: 'Balcón,Pileta,Amoblado',
          features: 'Escritura al día,Servicios conectados',
          featured: true,
          active: true,
        },
        {
          title: 'Chalet en Valeria del Mar',
          type: 'chalet',
          operation: 'venta',
          price: 'USD 275.000',
          location: 'Valeria del Mar',
          bedrooms: 4,
          bathrooms: 3,
          area: 380,
          image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
          description: 'Chalet con estilo en Valeria del Mar, ideal familia.',
          extras: 'Jardín,Parrilla,Cochera',
          features: 'Escritura al día,Apto crédito',
          featured: true,
          active: true,
        },
        {
          title: 'Lote en Barrio Privado',
          type: 'lote',
          operation: 'venta',
          price: 'USD 65.000',
          location: 'Tandil',
          bedrooms: 0,
          bathrooms: 0,
          area: 800,
          image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
          description: 'Lote en barrio privado con seguridad 24hs.',
          extras: 'Barrio Cerrado,Seguridad,Árboles',
          featured: false,
          active: true,
        },
        {
          title: 'Local Comercial Céntrico',
          type: 'local',
          operation: 'alquiler',
          price: '$ 180.000/mes',
          location: 'San Bernardo',
          bedrooms: 0,
          bathrooms: 1,
          area: 120,
          image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
          description: 'Local comercial en zona céntrica de alto tránsito.',
          extras: 'Céntrico,Vitrina,Baño',
          featured: false,
          active: true,
        },
      ],
    })
    console.log('Sample properties created')
  }

  // Create sample articles
  const artCount = await prisma.article.count()
  if (artCount === 0) {
    await prisma.article.createMany({
      data: [
        {
          title: 'Cómo vender una propiedad rápido en 2024',
          excerpt: 'Consejos prácticos y estrategias probadas para acelerar la venta de tu propiedad.',
          content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
          category: 'Ventas',
          image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80',
          readTime: '5 min',
          active: true,
        },
        {
          title: 'Qué impuestos paga el comprador',
          excerpt: 'Guía completa sobre los impuestos y gastos del comprador.',
          category: 'Legal',
          image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80',
          readTime: '7 min',
          active: true,
        },
        {
          title: 'Mejores zonas para invertir en la Costa Atlántica',
          excerpt: 'Análisis de las zonas con mayor potencial de valorización.',
          category: 'Inversiones',
          image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600&q=80',
          readTime: '6 min',
          active: true,
        },
      ],
    })
    console.log('Sample articles created')
  }

  console.log('Seed completed!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
