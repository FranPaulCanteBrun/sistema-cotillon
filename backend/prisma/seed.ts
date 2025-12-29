import { PrismaClient, UserRole, PaymentMethodType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de base de datos...')

  // Crear usuario administrador
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cotillon.local' },
    update: {},
    create: {
      email: 'admin@cotillon.local',
      passwordHash: adminPassword,
      name: 'Administrador',
      role: UserRole.ADMIN,
      isActive: true
    }
  })
  console.log('✅ Usuario admin creado:', admin.email)

  // Crear métodos de pago
  const paymentMethods = [
    { name: 'Efectivo', type: PaymentMethodType.CASH },
    { name: 'Tarjeta de Débito', type: PaymentMethodType.DEBIT },
    { name: 'Tarjeta de Crédito', type: PaymentMethodType.CREDIT },
    { name: 'Transferencia', type: PaymentMethodType.TRANSFER },
    { name: 'Mercado Pago', type: PaymentMethodType.QR }
  ]

  for (const pm of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { name: pm.name },
      update: {},
      create: pm
    })
  }
  console.log('✅ Métodos de pago creados')

  // Crear categorías
  const categories = [
    { name: 'Globos', description: 'Globos de látex, metalizados y especiales' },
    { name: 'Cotillón', description: 'Artículos de cotillón para fiestas' },
    { name: 'Velas', description: 'Velas de cumpleaños y decorativas' },
    { name: 'Decoración', description: 'Guirnaldas, banderines y decoración general' },
    { name: 'Descartables', description: 'Vasos, platos, servilletas descartables' }
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat
    })
  }
  console.log('✅ Categorías creadas')

  // Obtener categoría de Globos para productos de ejemplo
  const globosCategory = await prisma.category.findUnique({
    where: { name: 'Globos' }
  })

  if (globosCategory) {
    // Crear producto de ejemplo con variantes
    const product = await prisma.product.upsert({
      where: { code: 'GLO-001' },
      update: {},
      create: {
        code: 'GLO-001',
        name: 'Globos Perlados 12"',
        description: 'Pack de globos perlados de 12 pulgadas, ideales para decoración',
        categoryId: globosCategory.id,
        basePrice: 150.00,
        minStock: 50
      }
    })

    // Crear variantes
    const colors = ['Rojo', 'Azul', 'Verde', 'Dorado', 'Plateado']
    for (const color of colors) {
      await prisma.productVariant.upsert({
        where: { sku: `GLO-001-${color.substring(0, 3).toUpperCase()}` },
        update: {},
        create: {
          productId: product.id,
          sku: `GLO-001-${color.substring(0, 3).toUpperCase()}`,
          color,
          currentStock: Math.floor(Math.random() * 100) + 10
        }
      })
    }
    console.log('✅ Producto de ejemplo creado con variantes')
  }

  console.log('🎉 Seed completado exitosamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

