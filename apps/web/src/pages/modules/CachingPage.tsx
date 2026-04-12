import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../api/client'

interface CacheStats {
  hits: number
  misses: number
  keys: number
  hitRate: number
  total: number
}

interface RequestLog {
  id: number
  time: string
  source: 'cache' | 'database'
  category: string
  durationMs: number
  cachedAt?: string
  ttl?: number
}

const CONCEPTS = [
  {
    emoji: '🍔',
    term: 'Cache Hit',
    definition: 'La hamburguesa ya estaba lista bajo la lámpara. Respuesta instantánea, sin ir a la cocina (base de datos).',
  },
  {
    emoji: '🥩',
    term: 'Cache Miss',
    definition: 'No había pre-cocinada. Hay que ir a la cocina (DB), cocinar, y poner el resultado bajo la lámpara para la próxima.',
  },
  {
    emoji: '⏱️',
    term: 'TTL (Time To Live)',
    definition: 'Cuánto tiempo puede estar la hamburguesa bajo la lámpara antes de que haya que renovarla. En McDollars: 60 segundos.',
  },
  {
    emoji: '🗑️',
    term: 'Invalidación',
    definition: 'Tiramos todo lo que está bajo la lámpara (Redis). La próxima consulta va a la DB y reconstruye la caché.',
  },
  {
    emoji: '📝',
    term: 'Cache-Aside',
    definition: 'El patrón que usamos: la app verifica el caché, si no hay va a la DB y guarda el resultado en caché para la próxima.',
  },
  {
    emoji: '💾',
    term: 'Redis',
    definition: 'La "lámpara de calor" del sistema. Una base de datos en memoria, extremadamente rápida, ideal para caché y sesiones.',
  },
]

let reqCounter = 0

export function CachingPage() {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [logs, setLogs] = useState<RequestLog[]>([])
  const [requesting, setRequesting] = useState(false)
  const [spamming, setSpamming] = useState(false)
  const spamRef = useRef(false)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/cache/stats')
      const data = await res.json() as CacheStats
      setStats(data)
    } catch { /* Redis offline */ }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 2000)
    return () => clearInterval(interval)
  }, [fetchStats])

  async function requestProducts(category?: string) {
    const start = Date.now()
    const cat = category ?? 'all'
    try {
      const res = await fetch(`/api/products${category ? `?category=${category}` : ''}`)
      const data = await res.json() as { _source: 'cache' | 'database'; cachedAt?: string; ttl?: number }
      const duration = Date.now() - start
      const log: RequestLog = {
        id: ++reqCounter,
        time: new Date().toLocaleTimeString('es-AR'),
        source: data._source ?? 'database',
        category: cat,
        durationMs: duration,
        cachedAt: data.cachedAt,
        ttl: data.ttl,
      }
      setLogs((prev) => [log, ...prev].slice(0, 25))
      await fetchStats()
    } catch { /* ignore */ }
  }

  async function spamRequests() {
    spamRef.current = true
    setSpamming(true)
    setRequesting(true)
    for (let i = 0; i < 20 && spamRef.current; i++) {
      await requestProducts()
      await new Promise((r) => setTimeout(r, 150))
    }
    setSpamming(false)
    setRequesting(false)
  }

  function stopSpam() {
    spamRef.current = false
    setSpamming(false)
    setRequesting(false)
  }

  async function invalidateCache() {
    await fetch('/api/cache', { method: 'DELETE' })
    await fetchStats()
    setLogs((prev) => [
      {
        id: ++reqCounter,
        time: new Date().toLocaleTimeString('es-AR'),
        source: 'database',
        category: 'INVALIDATION',
        durationMs: 0,
      },
      ...prev,
    ].slice(0, 25))
  }

  async function resetStats() {
    await fetch('/api/cache/stats', { method: 'DELETE' })
    await fetchStats()
    setLogs([])
  }

  const hitRate = stats?.hitRate ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-3xl">⚡</span>
          <h1 className="text-3xl font-black text-white">Caching con Redis</h1>
        </div>
        <p className="text-gray-400 max-w-2xl">
          Las hamburguesas más pedidas se preparan con anticipación y quedan bajo la{' '}
          <span className="text-brand-yellow font-semibold">lámpara de calor (Redis)</span>. No hace
          falta ir a la cocina (base de datos) cada vez. Si pasan 60 segundos, hay que renovarlas
          (TTL).
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xl mb-1">🍔</p>
          <p className="text-3xl font-black text-green-400">{stats?.hits ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Cache hits</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xl mb-1">🥩</p>
          <p className="text-3xl font-black text-orange-400">{stats?.misses ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Cache misses</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xl mb-1">📊</p>
          <p className={`text-3xl font-black ${hitRate > 70 ? 'text-green-400' : hitRate > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {hitRate}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Hit rate</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xl mb-1">🗝️</p>
          <p className="text-3xl font-black text-blue-400">{stats?.keys ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Keys en Redis</p>
        </div>
      </div>

      {/* Hit rate bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Hit rate (eficiencia del caché)</span>
          <span className="font-bold text-white">{hitRate}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3">
          <motion.div
            className={`h-3 rounded-full transition-colors ${
              hitRate > 70 ? 'bg-green-500' : hitRate > 40 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            animate={{ width: `${hitRate}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0% (todo va a la DB)</span>
          <span>100% (todo desde caché)</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => requestProducts()}
          disabled={requesting}
          className="bg-brand-yellow text-brand-dark font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-400 disabled:opacity-60 transition-colors"
        >
          📋 Pedir el menú
        </button>
        {!spamming ? (
          <button
            onClick={spamRequests}
            className="bg-blue-700 hover:bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            ⚡ Spam ×20 requests
          </button>
        ) : (
          <button
            onClick={stopSpam}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            ⏹ Detener spam
          </button>
        )}
        <button
          onClick={invalidateCache}
          className="bg-red-900 hover:bg-red-800 text-red-300 font-bold px-5 py-2.5 rounded-xl transition-colors"
        >
          🗑️ Invalidar caché
        </button>
        <button
          onClick={resetStats}
          className="text-gray-400 hover:text-white text-sm border border-gray-700 px-4 py-2.5 rounded-xl transition-colors"
        >
          Resetear stats
        </button>
      </div>

      {/* Request log */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
            Log de requests
          </h3>
        </div>
        <div className="divide-y divide-gray-800/50 max-h-72 overflow-y-auto">
          {logs.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-6">
              Hacé una request para ver si vino de caché o de la DB
            </p>
          )}
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, backgroundColor: log.source === 'cache' ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)' }}
                animate={{ opacity: 1, backgroundColor: 'transparent' }}
                transition={{ duration: 0.8 }}
                className="flex items-center gap-3 px-5 py-2.5 text-sm"
              >
                <span className="text-gray-600 font-mono shrink-0 w-20">{log.time}</span>
                {log.category === 'INVALIDATION' ? (
                  <span className="text-red-400 font-semibold">🗑️ Caché invalidada</span>
                ) : (
                  <>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${
                        log.source === 'cache'
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-orange-900/50 text-orange-400'
                      }`}
                    >
                      {log.source === 'cache' ? '⚡ CACHE' : '🗄️ DB'}
                    </span>
                    <span className="text-gray-400">{log.category}</span>
                    <span className="ml-auto text-gray-600">{log.durationMs}ms</span>
                  </>
                )}
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
