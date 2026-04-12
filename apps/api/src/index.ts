import express from 'express'
import cors from 'cors'
import { productRouter } from './routes/products.js'
import { orderRouter } from './routes/orders.js'
import { healthRouter } from './routes/health.js'
import { metricsRouter } from './routes/metrics.js'
import { queueRouter } from './routes/queue.js'
import { cacheRouter } from './routes/cache.js'
import { rateLimitRouter } from './routes/rate-limit.js'
import { circuitBreakerRouter } from './routes/circuit-breaker.js'
import './queues/orders.queue.js'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

app.use('/health', healthRouter)
app.use('/api/products', productRouter)
app.use('/api/orders', orderRouter)
app.use('/api/metrics', metricsRouter)
app.use('/api/queue', queueRouter)
app.use('/api/cache', cacheRouter)
app.use('/api/rate-limit', rateLimitRouter)
app.use('/api/circuit-breaker', circuitBreakerRouter)

app.listen(PORT, () => {
  console.log(`McDollars API running on http://localhost:${PORT}`)
})

export default app
