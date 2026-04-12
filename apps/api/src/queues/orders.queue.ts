import { Queue, Worker, QueueEvents } from 'bullmq'
import { bullConnection } from '../lib/redis.js'
import { prisma } from '../lib/prisma.js'

export const QUEUE_NAME = 'orders'

export const ordersQueue = new Queue(QUEUE_NAME, {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  },
})

// Worker: simula el tiempo de cocina según la cantidad de items
export const ordersWorker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { orderId, itemCount } = job.data as { orderId: string; itemCount: number }

    // Avanzar a COOKING
    await prisma.order.update({ where: { id: orderId }, data: { status: 'COOKING' } })
    await job.updateProgress(33)

    // Simular tiempo de cocina: 2s por item, máximo 10s
    const cookTime = Math.min(itemCount * 2000, 10000)
    await new Promise((r) => setTimeout(r, cookTime))

    // Marcar como READY
    await prisma.order.update({ where: { id: orderId }, data: { status: 'READY' } })
    await job.updateProgress(100)

    return { orderId, cookedAt: new Date().toISOString() }
  },
  {
    connection: bullConnection,
    concurrency: 2, // Máximo 2 pedidos cocinándose a la vez (como 2 parrillas)
  }
)

export const ordersQueueEvents = new QueueEvents(QUEUE_NAME, {
  connection: bullConnection,
})

ordersWorker.on('completed', (job) => {
  console.log(`[Queue] Order ${job.data.orderId} completed`)
})

ordersWorker.on('failed', (job, err) => {
  console.error(`[Queue] Order ${job?.data.orderId} failed:`, err.message)
})
