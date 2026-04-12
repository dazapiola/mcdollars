import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { OrderStatus } from '@prisma/client'
import { ordersQueue } from '../queues/orders.queue.js'
import { broadcastQueueEvent } from './queue.js'

export const orderRouter = Router()

orderRouter.get('/', async (_req, res) => {
  const orders = await prisma.order.findMany({
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(orders)
})

orderRouter.get('/:id', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: true } } },
  })
  if (!order) return res.status(404).json({ error: 'Order not found' })
  res.json(order)
})

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
})

orderRouter.post('/', async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { items } = parsed.data

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, available: true },
  })

  if (products.length !== items.length) {
    return res.status(400).json({ error: 'One or more products not found or unavailable' })
  }

  const total = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)!
    return sum + product.price * item.quantity
  }, 0)

  const order = await prisma.order.create({
    data: {
      total,
      items: {
        create: items.map((item) => {
          const product = products.find((p) => p.id === item.productId)!
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: product.price,
          }
        }),
      },
    },
    include: { items: { include: { product: true } } },
  })

  // Encolar el pedido para procesamiento en cocina
  try {
    await ordersQueue.add(
      'cook-order',
      { orderId: order.id, itemCount: items.length },
      { jobId: order.id }
    )
    broadcastQueueEvent('new-order', { orderId: order.id, itemCount: items.length })
  } catch {
    // Si Redis no está disponible, el pedido igual se crea
  }

  res.status(201).json(order)
})

const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
})

orderRouter.patch('/:id/status', async (req, res) => {
  const parsed = updateStatusSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const order = await prisma.order.findUnique({ where: { id: req.params.id } })
  if (!order) return res.status(404).json({ error: 'Order not found' })

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: parsed.data.status },
    include: { items: { include: { product: true } } },
  })
  res.json(updated)
})
