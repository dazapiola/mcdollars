import { Router, type Response } from 'express'
import { grillaCircuit, CircuitOpenError } from '../lib/circuit-breaker.js'

export const circuitBreakerRouter = Router()

// SSE clients
const clients = new Set<Response>()

function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  clients.forEach((res) => {
    try { res.write(payload) } catch { clients.delete(res) }
  })
}

// Notificar cambios de estado a todos los clientes SSE
grillaCircuit.onStateChange((status) => {
  broadcast('state-change', status)
})

// Menú principal (hamburguesas a la parrilla)
const MAIN_MENU = [
  { id: 'mc-classic', name: 'McClassic', price: 1200, emoji: '🍔' },
  { id: 'mc-double', name: 'McDouble', price: 1800, emoji: '🍔' },
  { id: 'mc-bacon', name: 'McBacon', price: 1600, emoji: '🥓' },
]

// Menú fallback (wraps, no necesitan parrilla)
const FALLBACK_MENU = [
  { id: 'wrap-veggie', name: 'Wrap Veggie', price: 1100, emoji: '🌯' },
  { id: 'wrap-pollo', name: 'Wrap Pollo', price: 1300, emoji: '🌯' },
  { id: 'ensalada', name: 'Ensalada César', price: 900, emoji: '🥗' },
]

// GET /api/circuit-breaker/events — SSE
circuitBreakerRouter.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  clients.add(res)
  // Estado inicial
  res.write(`event: state-change\ndata: ${JSON.stringify(grillaCircuit.getStatus())}\n\n`)

  req.on('close', () => clients.delete(res))
})

// GET /api/circuit-breaker/status
circuitBreakerRouter.get('/status', (_req, res) => {
  res.json(grillaCircuit.getStatus())
})

// GET /api/circuit-breaker/order — hacer un pedido de hamburguesa (pasa por la parrilla)
circuitBreakerRouter.get('/order', async (_req, res) => {
  try {
    const burger = await grillaCircuit.execute(async () => {
      // Simular tiempo de cocina
      await new Promise((r) => setTimeout(r, 300))
      return MAIN_MENU[Math.floor(Math.random() * MAIN_MENU.length)]
    })
    res.json({
      success: true,
      source: 'grilla',
      item: burger,
      message: `${burger.emoji} ${burger.name} recién salida de la parrilla!`,
    })
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      // Fallback: servir algo que no necesita parrilla
      const fallback = FALLBACK_MENU[Math.floor(Math.random() * FALLBACK_MENU.length)]
      return res.json({
        success: true,
        source: 'fallback',
        item: fallback,
        message: `⚠️ La parrilla está fuera de servicio. Te ofrecemos: ${fallback.emoji} ${fallback.name}`,
        circuitState: 'OPEN',
        retryAfterMs: err.retryAfterMs,
      })
    }
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// POST /api/circuit-breaker/break — simular rotura de la parrilla
circuitBreakerRouter.post('/break', (_req, res) => {
  grillaCircuit.forceOpen()
  res.json({ message: 'La parrilla se rompió 💥', status: grillaCircuit.getStatus() })
})

// POST /api/circuit-breaker/fix — reparar la parrilla
circuitBreakerRouter.post('/fix', (_req, res) => {
  grillaCircuit.forceClose()
  res.json({ message: 'La parrilla fue reparada 🔧', status: grillaCircuit.getStatus() })
})

// POST /api/circuit-breaker/fail — forzar un fallo (para demostrar el conteo)
circuitBreakerRouter.post('/fail', async (_req, res) => {
  try {
    await grillaCircuit.execute(async () => {
      throw new Error('La parrilla falló inesperadamente')
    })
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      return res.json({ triggered: false, message: 'Circuito ya abierto', status: grillaCircuit.getStatus() })
    }
    return res.json({ triggered: true, message: 'Fallo registrado', status: grillaCircuit.getStatus() })
  }
})
