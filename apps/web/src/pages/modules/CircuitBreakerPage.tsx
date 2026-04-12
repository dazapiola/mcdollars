import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

interface CircuitStatus {
  name: string
  state: CircuitState
  failures: number
  successes: number
  lastFailureAt: number | null
  nextAttemptAt: number | null
  totalCalls: number
  totalFailures: number
  totalSuccesses: number
}

interface OrderResult {
  id: number
  time: string
  source: 'grilla' | 'fallback'
  itemName: string
  itemEmoji: string
  message: string
  circuitState?: CircuitState
}

const STATE_CONFIG: Record<CircuitState, { label: string; color: string; bg: string; border: string; light: string; description: string }> = {
  CLOSED: {
    label: 'CLOSED — Funcionando',
    color: 'text-green-400',
    bg: 'bg-green-900/20',
    border: 'border-green-700',
    light: 'bg-green-500',
    description: 'La parrilla funciona. Los pedidos de hamburguesas pasan normal.',
  },
  OPEN: {
    label: 'OPEN — Parrilla rota',
    color: 'text-red-400',
    bg: 'bg-red-900/20',
    border: 'border-red-700',
    light: 'bg-red-500',
    description: 'La parrilla falló demasiadas veces. El circuito está abierto: todos los pedidos van directo al fallback (wraps) sin intentar la parrilla.',
  },
  HALF_OPEN: {
    label: 'HALF_OPEN — Probando',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-700',
    light: 'bg-yellow-500',
    description: 'Pasó el tiempo de espera. Probamos si la parrilla se recuperó. Si 2 pedidos salen bien → CLOSED. Si falla → OPEN de nuevo.',
  },
}

const CONCEPTS = [
  { emoji: '🟢', term: 'CLOSED', definition: 'Estado normal. La parrilla funciona. Todos los pedidos pasan.' },
  { emoji: '🔴', term: 'OPEN', definition: 'Demasiados fallos. El circuito se abre. Todos van al fallback inmediatamente, sin esperar.' },
  { emoji: '🟡', term: 'HALF_OPEN', definition: 'Después del timeout, se deja pasar un pedido de prueba. Si sale bien, se cierra el circuito.' },
  { emoji: '🌯', term: 'Fallback', definition: 'El plan B. En vez de dar error, servimos wraps (que no necesitan parrilla). Degradación graciosa.' },
  { emoji: '⏱️', term: 'Timeout del circuito', definition: 'Cuánto tiempo espera el circuito en OPEN antes de pasar a HALF_OPEN. Acá: 15 segundos.' },
  { emoji: '🔁', term: 'Failure Threshold', definition: 'Cuántos fallos consecutivos abren el circuito. Acá: 3. Suficiente para detectar un problema real.' },
]

let orderId = 0

export function CircuitBreakerPage() {
  const [status, setStatus] = useState<CircuitStatus | null>(null)
  const [orders, setOrders] = useState<OrderResult[]>([])
  const [ordering, setOrdering] = useState(false)
  const [retryIn, setRetryIn] = useState<number | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/circuit-breaker/events')
    esRef.current = es
    es.addEventListener('state-change', (e) => {
      const data = JSON.parse(e.data) as CircuitStatus
      setStatus(data)
    })
    return () => es.close()
  }, [])

  // Countdown para OPEN → HALF_OPEN
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (status?.state === 'OPEN' && status.nextAttemptAt) {
      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((status.nextAttemptAt! - Date.now()) / 1000))
        setRetryIn(remaining)
        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current)
          setRetryIn(null)
        }
      }, 500)
    } else {
      setRetryIn(null)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [status?.state, status?.nextAttemptAt])

  async function placeOrder() {
    setOrdering(true)
    try {
      const res = await fetch('/api/circuit-breaker/order')
      const data = await res.json() as {
        source: 'grilla' | 'fallback'
        item: { name: string; emoji: string }
        message: string
        circuitState?: CircuitState
      }
      setOrders((prev) => [
        {
          id: ++orderId,
          time: new Date().toLocaleTimeString('es-AR'),
          source: data.source,
          itemName: data.item.name,
          itemEmoji: data.item.emoji,
          message: data.message,
          circuitState: data.circuitState,
        },
        ...prev,
      ].slice(0, 20))
    } finally {
      setOrdering(false)
    }
  }

  async function triggerFailure() {
    await fetch('/api/circuit-breaker/fail', { method: 'POST' })
  }

  async function breakGrill() {
    await fetch('/api/circuit-breaker/break', { method: 'POST' })
  }

  async function fixGrill() {
    await fetch('/api/circuit-breaker/fix', { method: 'POST' })
  }

  const cfg = STATUS_CONFIG(status?.state ?? 'CLOSED')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-3xl">🔌</span>
          <h1 className="text-3xl font-black text-white">Circuit Breaker</h1>
        </div>
        <p className="text-gray-400 max-w-2xl">
          La parrilla se rompe. En vez de que todos los pedidos fallen con error, el sistema
          automáticamente ofrece{' '}
          <span className="text-brand-yellow font-semibold">wraps como fallback</span> hasta que la
          parrilla vuelva. Así funciona el patrón Circuit Breaker.
        </p>
      </div>

      {/* Semáforo */}
      <div className={`rounded-xl border p-6 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-start gap-6">
          {/* Semáforo visual */}
          <div className="flex flex-col items-center gap-2 bg-gray-950 rounded-xl p-3 shrink-0">
            {(['CLOSED', 'HALF_OPEN', 'OPEN'] as const).map((s) => (
              <motion.div
                key={s}
                animate={{
                  scale: status?.state === s ? 1.2 : 1,
                  opacity: status?.state === s ? 1 : 0.2,
                }}
                className={`w-8 h-8 rounded-full ${
                  s === 'CLOSED' ? 'bg-green-500' : s === 'HALF_OPEN' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              />
            ))}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <AnimatePresence mode="wait">
                <motion.span
                  key={status?.state}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`text-xl font-black ${cfg.color}`}
                >
                  {cfg.label}
                </motion.span>
              </AnimatePresence>
            </div>
            <p className="text-gray-400 text-sm">{cfg.description}</p>

            {status && (
              <div className="flex gap-4 mt-3 text-sm">
                <span className="text-gray-500">
                  Fallos consecutivos:{' '}
                  <span className={`font-bold ${status.failures > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                    {status.failures} / 3
                  </span>
                </span>
                {status.state === 'HALF_OPEN' && (
                  <span className="text-gray-500">
                    Éxitos para cerrar:{' '}
                    <span className="font-bold text-yellow-400">{status.successes} / 2</span>
                  </span>
                )}
                {retryIn !== null && retryIn > 0 && (
                  <span className="text-gray-500">
                    Próximo intento en: <span className="font-bold text-yellow-400">{retryIn}s</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Barra de fallos */}
        {status && (
          <div className="mt-4">
            <div className="bg-gray-800 rounded-full h-2">
              <motion.div
                animate={{ width: `${(status.failures / 3) * 100}%` }}
                transition={{ duration: 0.3 }}
                className="h-2 rounded-full bg-red-500"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>0 fallos</span>
              <span>3 fallos → circuito ABIERTO</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {status && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total llamadas', value: status.totalCalls, color: 'text-white' },
            { label: 'Exitosas', value: status.totalSuccesses, color: 'text-green-400' },
            { label: 'Fallidas', value: status.totalFailures, color: 'text-red-400' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <motion.p key={s.value} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className={`text-3xl font-black ${s.color}`}>
                {s.value}
              </motion.p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={placeOrder}
          disabled={ordering}
          className="bg-brand-yellow text-brand-dark font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-400 disabled:opacity-60 transition-colors"
        >
          🍔 Pedir hamburguesa
        </button>
        <button
          onClick={triggerFailure}
          className="bg-orange-900 hover:bg-orange-800 text-orange-300 font-bold px-5 py-2.5 rounded-xl transition-colors"
        >
          💥 Simular fallo (×1)
        </button>
        <button
          onClick={breakGrill}
          className="bg-brand-red hover:bg-red-600 text-white font-bold px-5 py-2.5 rounded-xl transition-colors"
        >
          🔥 Romper parrilla
        </button>
        <button
          onClick={fixGrill}
          className="bg-green-900 hover:bg-green-800 text-green-300 font-bold px-5 py-2.5 rounded-xl transition-colors"
        >
          🔧 Reparar parrilla
        </button>
      </div>

      {/* Log de pedidos */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Log de pedidos</h3>
        </div>
        <div className="divide-y divide-gray-800/50 max-h-64 overflow-y-auto">
          {orders.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-6">Pedí una hamburguesa para ver el circuit breaker en acción</p>
          )}
          <AnimatePresence initial={false}>
            {orders.map((order) => (
              <motion.div
                key={order.id}
                initial={{
                  opacity: 0,
                  backgroundColor: order.source === 'fallback' ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.1)',
                }}
                animate={{ opacity: 1, backgroundColor: 'transparent' }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-3 px-5 py-2.5 text-sm"
              >
                <span className="text-gray-600 font-mono w-20 shrink-0">{order.time}</span>
                <span className="text-xl shrink-0">{order.itemEmoji}</span>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-bold ${
                  order.source === 'grilla'
                    ? 'bg-green-900/50 text-green-400'
                    : 'bg-yellow-900/50 text-yellow-400'
                }`}>
                  {order.source === 'grilla' ? '🔥 parrilla' : '🌯 fallback'}
                </span>
                <span className="text-gray-400 truncate">{order.itemName}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Conceptos */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Conceptos clave
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONCEPTS.map((c) => (
            <div key={c.term} className="flex gap-3">
              <span className="text-xl shrink-0">{c.emoji}</span>
              <div>
                <p className="text-brand-yellow font-semibold text-sm">{c.term}</p>
                <p className="text-gray-400 text-sm mt-0.5">{c.definition}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function STATUS_CONFIG(state: CircuitState) {
  return STATE_CONFIG[state]
}
