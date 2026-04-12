import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../api/client'

interface QueueJob {
  id?: string
  orderId: string
  progress?: number
  itemCount?: number
  attemptsMade?: number
}

interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  activeJobs: QueueJob[]
  waitingJobs: QueueJob[]
  timestamp: number
}

const CONCEPTS = [
  {
    term: 'Productor',
    emoji: '🧑‍💼',
    definition: 'La caja registradora. Crea el ticket de pedido y lo pone en la cola. No cocina, solo encola.',
  },
  {
    term: 'Cola (Queue)',
    emoji: '📋',
    definition: 'La bandeja de pedidos pendientes. FIFO: el primero que llegó es el primero que se cocina.',
  },
  {
    term: 'Worker / Consumidor',
    emoji: '👨‍🍳',
    definition: 'El cocinero. Toma un ticket de la cola, cocina, y cuando termina toma el siguiente.',
  },
  {
    term: 'Concurrencia',
    emoji: '🍳🍳',
    definition: 'Tener 2 parrillas: 2 pedidos se cocinan al mismo tiempo. En BullMQ se llama concurrency.',
  },
  {
    term: 'Dead Letter Queue',
    emoji: '💀',
    definition: 'Si un pedido falla 3 veces (se quemó), va a la DLQ para revisión. No se pierde, se investiga.',
  },
  {
    term: 'Retry / Backoff',
    emoji: '🔄',
    definition: 'Si falla, se reintenta. Con backoff exponencial: espera 1s, 2s, 4s... para no saturar el sistema.',
  },
]

export function QueuePage() {
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [connected, setConnected] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [history, setHistory] = useState<{ time: string; event: string }[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)
  const historyRef = useRef<{ time: string; event: string }[]>([])

  function addHistory(event: string) {
    const entry = { time: new Date().toLocaleTimeString('es-AR'), event }
    historyRef.current = [entry, ...historyRef.current].slice(0, 20)
    setHistory([...historyRef.current])
  }

  useEffect(() => {
    const es = new EventSource('/api/queue/events')
    eventSourceRef.current = es

    es.addEventListener('stats', (e) => {
      const data = JSON.parse(e.data) as QueueStats
      setStats(data)
      setConnected(true)
    })

    es.onerror = () => setConnected(false)

    return () => es.close()
  }, [])

  async function placeDemoOrder() {
    setPlacingOrder(true)
    try {
      // Obtener productos para hacer un pedido de ejemplo
      const products = await api.products.list()
      if (products.length === 0) return
      const randomItems = products
        .slice(0, Math.floor(Math.random() * 3) + 1)
        .map((p) => ({ productId: p.id, quantity: 1 }))

      await api.orders.create(randomItems)
      addHistory(`Nuevo pedido encolado (${randomItems.length} item${randomItems.length > 1 ? 's' : ''})`)
    } catch (e) {
      addHistory(`Error: ${(e as Error).message}`)
    } finally {
      setPlacingOrder(false)
    }
  }

  async function placeMultipleOrders() {
    for (let i = 0; i < 5; i++) {
      await placeDemoOrder()
      await new Promise((r) => setTimeout(r, 300))
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">📋</span>
          <h1 className="text-3xl font-black text-white">Cola de Mensajes</h1>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              connected
                ? 'bg-green-900/40 text-green-400'
                : 'bg-red-900/40 text-red-400'
            }`}
          >
            {connected ? '● En vivo' : '○ Desconectado'}
          </span>
        </div>
        <p className="text-gray-400 max-w-2xl">
          Cuando hacés un pedido en la caja, se imprime un{' '}
          <span className="text-brand-yellow font-semibold">ticket</span> que va a la cocina. La
          cocina los procesa en orden. Si hay mucho trabajo, los tickets esperan en la cola sin
          perderse. Eso es <span className="text-brand-yellow font-semibold">BullMQ</span>.
        </p>
      </div>

      {/* Stats en vivo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Esperando', value: stats?.waiting ?? 0, color: 'text-yellow-400', emoji: '⏳' },
          { label: 'En cocina', value: stats?.active ?? 0, color: 'text-orange-400', emoji: '🔥' },
          { label: 'Completados', value: stats?.completed ?? 0, color: 'text-green-400', emoji: '✅' },
          { label: 'Fallidos', value: stats?.failed ?? 0, color: 'text-red-400', emoji: '❌' },
          { label: 'Demorados', value: stats?.delayed ?? 0, color: 'text-blue-400', emoji: '💤' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-xl mb-1">{s.emoji}</p>
            <motion.p
              key={s.value}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className={`text-3xl font-black ${s.color}`}
            >
              {s.value}
            </motion.p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Visualización de la cocina */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cola de espera */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
            🧾 Tickets esperando
          </h3>
          <div className="space-y-2 min-h-[80px]">
            <AnimatePresence>
              {stats?.waitingJobs.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-4">Cola vacía — el local está tranquilo</p>
              )}
              {stats?.waitingJobs.map((job, i) => (
                <motion.div
                  key={job.id ?? i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-800/40 rounded-lg px-3 py-2"
                >
                  <span className="text-yellow-400">🧾</span>
                  <span className="text-sm text-yellow-300 font-mono">
                    #{job.orderId.slice(-6).toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">{job.itemCount} items</span>
                  <span className="text-xs text-gray-600 ml-auto">pos. {i + 1}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Workers cocinando */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
            👨‍🍳 En cocina ahora (2 parrillas)
          </h3>
          <div className="space-y-3 min-h-[80px]">
            <AnimatePresence>
              {stats?.activeJobs.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-4">Cocina libre</p>
              )}
              {stats?.activeJobs.map((job, i) => {
                const progress = typeof job.progress === 'number' ? job.progress : 0
                return (
                  <motion.div
                    key={job.id ?? i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-orange-900/20 border border-orange-800/40 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-orange-400">🔥</span>
                      <span className="text-sm text-orange-300 font-mono">
                        #{job.orderId.slice(-6).toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 ml-auto">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <motion.div
                        className="bg-orange-400 h-1.5 rounded-full"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={placeDemoOrder}
          disabled={placingOrder}
          className="bg-brand-yellow text-brand-dark font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-400 disabled:opacity-60 transition-colors"
        >
          🧾 Un pedido a la cocina
        </button>
        <button
          onClick={placeMultipleOrders}
          disabled={placingOrder}
          className="bg-brand-red hover:bg-red-600 text-white font-bold px-5 py-2.5 rounded-xl disabled:opacity-60 transition-colors"
        >
          🔥 Llenar la cocina (×5)
        </button>
      </div>

      {/* Log de eventos */}
      {history.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Log de eventos</h3>
          <div className="space-y-1">
            {history.map((h, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="text-gray-600 font-mono shrink-0">{h.time}</span>
                <span className="text-gray-300">{h.event}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
