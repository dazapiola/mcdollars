import { Router } from 'express'
import { redis } from '../lib/redis.js'
import { demoRateLimiter } from '../middlewares/rate-limit.js'

export const rateLimitRouter = Router()

// GET /api/rate-limit/order — endpoint demo con límite estricto (10 req / 10s)
// Analogía: en hora pico solo aceptamos 10 pedidos por ventana de 10 segundos por IP
rateLimitRouter.get('/order', demoRateLimiter, (_req, res) => {
  res.json({
    success: true,
    message: '¡Pedido aceptado! La cocina lo recibió.',
    timestamp: new Date().toISOString(),
  })
})

// GET /api/rate-limit/stats — estadísticas globales
rateLimitRouter.get('/stats', async (_req, res) => {
  try {
    const [allowed, blocked] = await Promise.all([
      redis.get('rl:stats:allowed'),
      redis.get('rl:stats:blocked'),
    ])
    const a = parseInt(allowed ?? '0', 10)
    const b = parseInt(blocked ?? '0', 10)
    const total = a + b
    res.json({
      allowed: a,
      blocked: b,
      total,
      blockRate: total > 0 ? Math.round((b / total) * 100) : 0,
    })
  } catch {
    res.status(503).json({ error: 'Redis not available' })
  }
})

// DELETE /api/rate-limit/stats — resetear contadores
rateLimitRouter.delete('/stats', async (_req, res) => {
  try {
    await redis.del('rl:stats:allowed', 'rl:stats:blocked')
    res.json({ message: 'Stats reseteadas' })
  } catch {
    res.status(503).json({ error: 'Redis not available' })
  }
})

// GET /api/rate-limit/window — estado actual de la ventana para la IP del cliente
rateLimitRouter.get('/window', async (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.ip ?? 'unknown'
    const key = `rl:demo:${ip}`
    const windowMs = 10_000
    const max = 10
    const now = Date.now()
    const windowStart = now - windowMs

    await redis.zremrangebyscore(key, '-inf', windowStart)
    const entries = await redis.zrangebyscore(key, windowStart, '+inf', 'WITHSCORES')
    const current = Math.floor(entries.length / 2)
    const oldestScore = entries.length > 1 ? parseFloat(entries[1]) : now
    const resetAt = oldestScore + windowMs

    res.json({
      current,
      remaining: Math.max(0, max - current),
      limit: max,
      windowMs,
      resetAt,
      resetIn: Math.max(0, Math.ceil((resetAt - now) / 1000)),
    })
  } catch {
    res.json({ current: 0, remaining: 10, limit: 10, windowMs: 10000, resetAt: 0, resetIn: 0 })
  }
})
