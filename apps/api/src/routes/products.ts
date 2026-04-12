import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { Category } from '@prisma/client'

export const productRouter = Router()

productRouter.get('/', async (req, res) => {
  const { category } = req.query
  const products = await prisma.product.findMany({
    where: {
      available: true,
      ...(category ? { category: category as Category } : {}),
    },
    orderBy: { category: 'asc' },
  })
  res.json(products)
})

productRouter.get('/:id', async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } })
  if (!product) return res.status(404).json({ error: 'Product not found' })
  res.json(product)
})

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  category: z.nativeEnum(Category),
  imageUrl: z.string().optional(),
})

productRouter.post('/', async (req, res) => {
  const parsed = createProductSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const product = await prisma.product.create({ data: parsed.data })
  res.status(201).json(product)
})

productRouter.patch('/:id', async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } })
  if (!product) return res.status(404).json({ error: 'Product not found' })
  const updated = await prisma.product.update({
    where: { id: req.params.id },
    data: req.body,
  })
  res.json(updated)
})
