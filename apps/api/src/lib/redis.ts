import { Redis } from 'ioredis'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

// Cliente para operaciones de cache
export const redis = new Redis(REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

redis.on('error', (err: Error) => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('[Redis] Connection error:', err.message)
  }
})

// Conexión separada para BullMQ (requiere maxRetriesPerRequest: null)
export const bullConnection = {
  host: new URL(REDIS_URL.startsWith('redis://') ? REDIS_URL : `redis://${REDIS_URL}`).hostname,
  port: parseInt(
    new URL(REDIS_URL.startsWith('redis://') ? REDIS_URL : `redis://${REDIS_URL}`).port || '6379',
    10
  ),
}
