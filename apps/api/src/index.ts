import express from 'express'
import cors from 'cors'
import { productRouter } from './routes/products.js'
import { orderRouter } from './routes/orders.js'
import { healthRouter } from './routes/health.js'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

app.use('/health', healthRouter)
app.use('/api/products', productRouter)
app.use('/api/orders', orderRouter)

app.listen(PORT, () => {
  console.log(`McDollars API running on http://localhost:${PORT}`)
})

export default app
