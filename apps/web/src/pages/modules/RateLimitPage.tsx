import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface RateLimitStats {
  allowed: number
  blocked: number
  total: number
  blockRate: number
}

interface WindowState {
  current: number
  remaining: number
  limit: number
  windowMs: number
  resetAt: number
  resetIn: number
}

interface RequestResult {
  id: number
  time: string
  status: 200 | 429
  durationMs: number
  message?: string
  retryAfter?: number
}

const CONCEPTS = [
  {
    emoji: '🎟️',
    term: 'Token Bucket',
    definition: 'Cada cliente tiene un balde de tokens. Cada request consume uno. Los tokens se recargan a una tasa fija. Si el balde está vacío: 429.',
  },
  {
    emoji: '🪟',
    term: 'Sliding Window',
    definition: 'Lo que usamos acá. Contamos cuántos requests llegaron en los últimos N segundos. La ventana "desliza" con el tiempo.',
  },
  {
    emoji: '429',
    term: 'HTTP 429',
    definition: '"Too Many Requests". El servidor te dice: tranqui, esperá antes de volver a pedir. Incluye el header Retry-After.',
  },
  {
    emoji: '🔑',
    term: 'Key por IP',
    definition: 'El límite aplica por IP (en producción sería por usuario autenticado). Cada caja registradora tiene su propio contador.',
  },
  {
    emoji: '🛡️',
    term: '¿Para qué sirve?',
    definition: 'Proteger la infraestructura de abusos, bots y ataques DDoS. También para garantizar equidad entre usuarios.',
  },
  {
    emoji: '🔓',
    term: 'Fail-Open',
    definition: 'Si Redis no está disponible, dejamos pasar igual (no cortamos el servicio). Es una decisión de diseño: disponibilidad > protección.',
  },
]

let reqId = 0

export function RateLimitPage() {
  const [stats, setStats] = useState<RateLimitStats | null>(null)
  const [window_, setWindow] = useState<WindowState | null>(null)
  const [logs, setLogs] = useState<RequestResult[]>([])
  const [spamming, setSpamming] = useState(false)
  const spamRef = useRef(false)
  const windowPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const [s, w] = await Promise.all([
        fetch('/api/rate-limit/stats').then((r) => r.json()) as Promise<RateLimitStats>,
        fetch('/api/rate-limit/window').then((r) => r.json()) as Promise<WindowState>,
      ])
      setStats(s)
      setWindow(w)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchStats()
    windowPollRef.current = setInterval(fetchStats, 1000)
    return () => { if (windowPollRef.current) clearInterval(windowPollRef.current) }
  }, [fetchStats])

  async function sendRequest(): Promise<RequestResult> {
    const start = Date.now()
    const res = await fetch('/api/rate-limit/order')
    const data = await res.json() as { message?: string; retryAfter?: number }
    const duration = Date.now() - start
    const result: RequestResult = {
      id: ++reqId,
      time: new Date().toLocaleTimeString('es-AR'),
      status: res.status as 200 | 429,
      durationMs: duration,
      message: data.message,
      retryAfter: data.retryAfter,
    }
    setLogs((prev) => [result, ...prev].slice(0, 30))
    return result
  }

  async function handleSingleRequest() {
    await sendRequest()
    await fetchStats()
  }

  async function startSpam() {
    spamRef.current = true
    setSpamming(true)
    while (spamRef.current) {
      await sendRequest()
      await fetchStats()
      await new Promise((r) => setTimeout(r, 100))
    }
    setSpamming(false)
  }

  function stopSpam() {
    spamRef.current = false
    setSpamming(false)
  }

  async function resetStats() {
    await fetch('/api/rate-limit/stats', { method: 'DELETE' })
    setLogs([])
    await fetchStats()
  }

  const remaining = window_?.remaining ?? 10
  const limit = window_?.limit ?? 10
  const fillPct = Math.round((remaining / limit) * 100)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-3xl">🚦</span>
          <h1 className="text-3xl font-black text-white">Rate Limiting</h1>
        </div>
        <p className="text-gray-400 max-w-2xl">
          En hora pico, la caja acepta solo{' '}
          <span className="text-brand-yellow font-semibold">10 pedidos por ventana de 10 segundos</span>{' '}
          por cliente. Si mandás más, recibís un{' '}
          <span className="text-red-400 font-semibold">429 Too Many Requests</span> y tenés que
          esperar.
        </p>
      </div>

      {/* Ventana deslizante visual */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Tu ventana actual (10 segundos)
        </h2>
        <div className="flex items-end gap-2 mb-3 h-16">
          {Array.from({ length: limit }).map((_, i) => {
            const used = limit - remaining
            const isUsed = i < used
            return (
              <motion.div
                key={i}
                animate={{ height: isUsed ? '100%' : '30%' }}
                className={`flex-1 rounded-t transition-colors ${
                  isUsed ? 'bg-brand-red' : 'bg-green-600'
                }`}
              />
            )
          })}
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-red-400 font-semibold">{limit - remaining} usados</span>
          <span className="text-green-400 font-semibold">{remaining} disponibles</span>
        </div>
        <div className="mt-3 bg-gray-800 rounded-full h-2">
          <motion.div
            animate={{ width: `${fillPct}%` }}
            transition={{ duration: 0.3 }}
            className={`h-2 rounded-full ${fillPct > 50 ? 'bg-green-500' : fillPct > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0 requests</span>
          {window_ && window_.resetIn > 0 && (
            <span>ventana se renueva en {window_.resetIn}s</span>
          )}
          <span>{limit} requests</span>
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Aceptados', value: stats?.allowed ?? 0, color: 'text-green-400', emoji: '✅' },
          { label: 'Bloqueados', value: stats?.blocked ?? 0, color: 'text-red-400', emoji: '🚫' },
          { label: 'Total', value: stats?.total ?? 0, color: 'text-white', emoji: '📊' },
          { label: 'Block rate', value: `${stats?.blockRate ?? 0}%`, color: stats?.blockRate && stats.blockRate > 50 ? 'text-red-400' : 'text-yellow-400', emoji: '📈' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-xl mb-1">{s.emoji}</p>
            <motion.p key={String(s.value)} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className={`text-3xl font-black ${s.color}`}>
              {s.value}
            </motion.p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSingleRequest}
          disabled={spamming}
          className="bg-brand-yellow text-brand-dark font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition-colors"
        >
          🍔 Un pedido
        </button>
        {!spamming ? (
          <button
            onClick={startSpam}
            className="bg-brand-red hover:bg-red-600 text-white font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            🔥 Spam continuo
          </button>
        ) : (
          <button
            onClick={stopSpam}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            ⏹ Detener
          </button>
        )}
        <button
          onClick={resetStats}
          disabled={spamming}
          className="text-gray-400 hover:text-white text-sm border border-gray-700 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          Resetear stats
        </button>
      </div>

      {/* Log de requests */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
            Log de requests
          </h3>
        </div>
        <div className="divide-y divide-gray-800/50 max-h-64 overflow-y-auto">
          {logs.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-6">
              Hacé click en "Un pedido" o "Spam" para ver el rate limiter en acción
            </p>
          )}
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{
                  opacity: 0,
                  backgroundColor: log.status === 429 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)',
                }}
                animate={{ opacity: 1, backgroundColor: 'transparent' }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-3 px-5 py-2 text-sm"
              >
                <span className="text-gray-600 font-mono w-20 shrink-0">{log.time}</span>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded font-bold text-xs ${
                    log.status === 429
                      ? 'bg-red-900/60 text-red-400'
                      : 'bg-green-900/60 text-green-400'
                  }`}
                >
                  {log.status}
                </span>
                <span className="text-gray-400 truncate">
                  {log.status === 429
                    ? `Bloqueado — reintentá en ${log.retryAfter}s`
                    : log.message ?? 'Pedido aceptado'}
                </span>
                <span className="ml-auto text-gray-600 shrink-0">{log.durationMs}ms</span>
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
              <span className="text-xl shrink-0 mt-0.5">{c.emoji}</span>
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
