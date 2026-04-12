import { Router, type Response } from 'express'
import { ordersQueue } from '../queues/orders.queue.js'

export const queueRouter = Router()

// SSE clients registry
const clients = new Set<Response>()

export function broadcastQueueEvent(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  clients.forEach((res) => {
    try {
      res.write(payload)
    } catch {
      clients.delete(res)
    }
  })
}

// GET /api/queue/events — Server-Sent Events stream
queueRouter.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  clients.add(res)

  // Enviar estado inicial
  sendQueueStats(res)

  const interval = setInterval(() => sendQueueStats(res), 2000)

  req.on('close', () => {
    clearInterval(interval)
    clients.delete(res)
  })
})

async function sendQueueStats(res: Response) {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      ordersQueue.getWaitingCount(),
      ordersQueue.getActiveCount(),
      ordersQueue.getCompletedCount(),
      ordersQueue.getFailedCount(),
      ordersQueue.getDelayedCount(),
    ])

    const activeJobs = await ordersQueue.getActive()
    const waitingJobs = await ordersQueue.getWaiting(0, 9)

    const stats = {
      waiting,
      active,
      completed,
      failed,
      delayed,
      activeJobs: activeJobs.map((j) => ({
        id: j.id,
        orderId: j.data.orderId,
        progress: j.progress,
        attemptsMade: j.attemptsMade,
      })),
      waitingJobs: waitingJobs.map((j) => ({
        id: j.id,
        orderId: j.data.orderId,
        itemCount: j.data.itemCount,
      })),
      timestamp: Date.now(),
    }

    res.write(`event: stats\ndata: ${JSON.stringify(stats)}\n\n`)
  } catch {
    // Redis no disponible
  }
}

// GET /api/queue/stats — Snapshot puntual
queueRouter.get('/stats', async (_req, res) => {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      ordersQueue.getWaitingCount(),
      ordersQueue.getActiveCount(),
      ordersQueue.getCompletedCount(),
      ordersQueue.getFailedCount(),
    ])
    res.json({ waiting, active, completed, failed })
  } catch {
    res.status(503).json({ error: 'Redis not available' })
  }
})
