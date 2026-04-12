import { type Request, type Response, type NextFunction } from 'express'
import { redis } from '../lib/redis.js'

export interface RateLimitOptions {
  windowMs: number   // ventana de tiempo en ms
  max: number        // máximo de requests en la ventana
  keyPrefix?: string // prefijo en Redis
}

interface RateLimitInfo {
  limit: number
  current: number
  remaining: number
  resetAt: number
  blocked: boolean
}

// Sliding window counter usando Redis
export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix = 'rl' } = options
  const windowSec = Math.ceil(windowMs / 1000)

  return async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.ip ?? 'unknown'
    const key = `${keyPrefix}:${ip}`
    const now = Date.now()
    const windowStart = now - windowMs

    let current = 0
    let blocked = false

    try {
      // Pipeline: borrar entradas antiguas + agregar la nueva + contar
      const pipeline = redis.pipeline()
      pipeline.zremrangebyscore(key, '-inf', windowStart)
      pipeline.zadd(key, now, `${now}-${Math.random()}`)
      pipeline.zcard(key)
      pipeline.expire(key, windowSec)
      const results = await pipeline.exec()
      current = (results?.[2]?.[1] as number) ?? 1
      blocked = current > max
    } catch {
      // Redis offline: dejar pasar (fail-open)
      return next()
    }

    const resetAt = now + windowMs
    const info: RateLimitInfo = {
      limit: max,
      current,
      remaining: Math.max(0, max - current),
      resetAt,
      blocked,
    }

    // Exponer headers estándar
    res.setHeader('X-RateLimit-Limit', max)
    res.setHeader('X-RateLimit-Remaining', info.remaining)
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000))

    // Registrar stats globales en Redis para el dashboard
    try {
      if (blocked) {
        await redis.incr('rl:stats:blocked')
      } else {
        await redis.incr('rl:stats:allowed')
      }
    } catch { /* ignore */ }

    if (blocked) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000))
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Límite de ${max} requests por ${windowSec}s superado. Esperá antes de volver a pedir.`,
        retryAfter: Math.ceil(windowMs / 1000),
        ...info,
      })
    }

    next()
  }
}

// Instancia global para la ruta demo (10 req / 10s)
export const demoRateLimiter = createRateLimiter({
  windowMs: 10_000,
  max: 10,
  keyPrefix: 'rl:demo',
})

// Rate limit más permisivo para rutas de producción (100 req / 60s)
export const apiRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 100,
  keyPrefix: 'rl:api',
})
