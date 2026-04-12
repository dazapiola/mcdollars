import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { redis } from '../lib/redis.js'
import { recordCacheHit, recordCacheMiss } from './cache.js'
import { z } from 'zod'
import { Category } from '@prisma/client'

export const productRouter = Router()

const PRODUCTS_TTL = 60 // segundos — "la hamburguesa bajo la lámpara no puede estar más de 1 minuto"

productRouter.get('/', async (req, res) => {
  const { category } = req.query
  const cacheKey = `cache:products:${category ?? 'all'}`

  // Intentar leer desde caché
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      await recordCacheHit()
      return res.json({ ...JSON.parse(cached), _source: 'cache' })
    }
  } catch { /* Redis offline, continuar sin caché */ }

  await recordCacheMiss()

  const products = await prisma.product.findMany({
    where: {
      available: true,
      ...(category ? { category: category as Category } : {}),
    },
    orderBy: { category: 'asc' },
  })

  const payload = { products, cachedAt: new Date().toISOString(), ttl: PRODUCTS_TTL }

  // Guardar en caché con TTL
  try {
    await redis.setex(cacheKey, PRODUCTS_TTL, JSON.stringify(payload))
  } catch { /* Redis offline */ }

  res.json({ ...payload, _source: 'database' })
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
