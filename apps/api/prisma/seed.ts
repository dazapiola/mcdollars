import { PrismaClient, Category } from '@prisma/client'

const prisma = new PrismaClient()

const products = [
  {
    name: 'McClassic',
    description: 'Carne 180g, lechuga, tomate, cebolla, salsa especial',
    price: 1200,
    category: Category.BURGER,
    imageUrl: '/images/mcclassic.png',
  },
  {
    name: 'McDouble',
    description: 'Doble carne 360g, queso cheddar doble, pepinillos, mostaza',
    price: 1800,
    category: Category.BURGER,
    imageUrl: '/images/mcdouble.png',
  },
  {
    name: 'McVeggie',
    description: 'Medallón de lentejas y garbanzos, rúcula, tomate asado, mayonesa de albahaca',
    price: 1400,
    category: Category.BURGER,
    imageUrl: '/images/mcveggie.png',
  },
  {
    name: 'McBacon',
    description: 'Carne 180g, bacon crocante, queso provolone, cebolla caramelizada',
    price: 1600,
    category: Category.BURGER,
    imageUrl: '/images/mcbacon.png',
  },
  {
    name: 'Papas McFritas',
    description: 'Papas fritas crocantes, sal marina',
    price: 600,
    category: Category.SIDE,
    imageUrl: '/images/fries.png',
  },
  {
    name: 'Aros de Cebolla',
    description: 'Aros de cebolla rebozados, salsa barbacoa',
    price: 700,
    category: Category.SIDE,
    imageUrl: '/images/onion-rings.png',
  },
  {
    name: 'Coca-Cola',
    description: '400ml, con hielo',
    price: 400,
    category: Category.DRINK,
    imageUrl: '/images/coke.png',
  },
  {
    name: 'McShake Chocolate',
    description: 'Milkshake cremoso de chocolate, 350ml',
    price: 800,
    category: Category.DRINK,
    imageUrl: '/images/shake.png',
  },
  {
    name: 'McSundae',
    description: 'Helado de vainilla con topping de caramelo o chocolate',
    price: 500,
    category: Category.DESSERT,
    imageUrl: '/images/sundae.png',
  },
]

async function main() {
  console.log('Seeding database...')

  await prisma.product.deleteMany()

  for (const product of products) {
    await prisma.product.create({ data: product })
  }

  console.log(`Created ${products.length} products.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
