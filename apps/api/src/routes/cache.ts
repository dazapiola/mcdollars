import { Router } from 'express'
import { redis } from '../lib/redis.js'

export const cacheRouter = Router()

const CACHE_PREFIX = 'cache:'
const STATS_KEY = 'cache:stats'

export async function getCacheStats(): Promise<{ hits: number; misses: number; keys: number }> {
  try {
    const raw = await redis.hgetall(STATS_KEY)
    const keys = await redis.keys(`${CACHE_PREFIX}*`)
    return {
      hits: parseInt(raw.hits ?? '0', 10),
      misses: parseInt(raw.misses ?? '0', 10),
      keys: keys.filter((k) => k !== STATS_KEY).length,
    }
  } catch {
    return { hits: 0, misses: 0, keys: 0 }
  }
}

export async function recordCacheHit() {
  try {
    await redis.hincrby(STATS_KEY, 'hits', 1)
  } catch { /* Redis offline */ }
}

export async function recordCacheMiss() {
  try {
    await redis.hincrby(STATS_KEY, 'misses', 1)
  } catch { /* Redis offline */ }
}

// GET /api/cache/stats
cacheRouter.get('/stats', async (_req, res) => {
  const stats = await getCacheStats()
  const total = stats.hits + stats.misses
  const hitRate = total > 0 ? Math.round((stats.hits / total) * 100) : 0
  res.json({ ...stats, hitRate, total })
})

// DELETE /api/cache — invalida toda la caché de productos
cacheRouter.delete('/', async (_req, res) => {
  try {
    const keys = await redis.keys(`${CACHE_PREFIX}products*`)
    if (keys.length > 0) await redis.del(...keys)
    res.json({ invalidated: keys.length, message: 'Caché invalidada. La próxima consulta irá a la DB.' })
  } catch {
    res.status(503).json({ error: 'Redis not available' })
  }
})

// DELETE /api/cache/stats — resetea contadores
cacheRouter.delete('/stats', async (_req, res) => {
  try {
    await redis.del(STATS_KEY)
    res.json({ message: 'Estadísticas reseteadas' })
  } catch {
    res.status(503).json({ error: 'Redis not available' })
  }
})
