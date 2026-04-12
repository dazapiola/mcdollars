import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PodInfo {
  name: string
  status: 'Running' | 'Pending' | 'Terminating'
  ready: boolean
  restarts: number
  age: string
  cpu?: string
}

interface MetricsData {
  source: 'kubernetes' | 'simulated'
  pods: PodInfo[]
  hpa: {
    minReplicas: number
    maxReplicas: number
    currentReplicas: number
    desiredReplicas: number
    cpuUtilization: number | null
  }
  system: {
    cpuCount: number
    loadAvg: number[]
    freeMemMb: number
    totalMemMb: number
  }
}

const CONCEPTS = [
  {
    term: 'Pod',
    emoji: '👨‍🍳',
    definition: 'La unidad mínima de Kubernetes. Como un cajero/cocinero en el local. Puede haber muchos de la misma "receta" (imagen Docker).',
  },
  {
    term: 'Deployment',
    emoji: '📋',
    definition: 'La receta que describe cuántos pods tener y cómo actualizarlos. "Quiero siempre tener N cajeros disponibles."',
  },
  {
    term: 'HPA',
    emoji: '📈',
    definition: 'Horizontal Pod Autoscaler. El gerente que decide abrir más cajas cuando la cola crece, y cerrarlas cuando se vacía.',
  },
  {
    term: 'Service',
    emoji: '🔀',
    definition: 'El distribuidor de clientes. No importa cuántos cajeros hay: el cliente siempre va al mismo lugar y el Service reparte la carga.',
  },
  {
    term: 'Namespace',
    emoji: '🏪',
    definition: 'Como una sucursal separada dentro de la cadena. Los recursos de "mcdollars" no interfieren con otros proyectos en el mismo cluster.',
  },
]

export function KubernetesPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [rps, setRps] = useState(0)
  const [loading, setLoading] = useState(false)
  const [stressActive, setStressActive] = useState(false)
  const stressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics')
      const data = await res.json() as MetricsData
      setMetrics(data)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    pollRef.current = setInterval(fetchMetrics, 2000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchMetrics])

  async function setLoad(value: number) {
    setRps(value)
    await fetch('/api/metrics/simulate-load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rps: value }),
    })
  }

  async function resetLoad() {
    setRps(0)
    await fetch('/api/metrics/simulate-reset', { method: 'POST' })
  }

  function startStressTest() {
    setStressActive(true)
    setLoading(true)
    let current = 0
    const target = 180

    stressRef.current = setInterval(async () => {
      current = Math.min(current + 10, target)
      await setLoad(current)
      if (current >= target) {
        if (stressRef.current) clearInterval(stressRef.current)
        setLoading(false)
      }
    }, 500)
  }

  async function stopStressTest() {
    if (stressRef.current) clearInterval(stressRef.current)
    setStressActive(false)
    setLoading(false)
    await resetLoad()
  }

  useEffect(() => {
    return () => {
      if (stressRef.current) clearInterval(stressRef.current)
    }
  }, [])

  const podCount = metrics?.pods.length ?? 1
  const cpuUtil = metrics?.hpa.cpuUtilization ?? 0
  const isK8s = metrics?.source === 'kubernetes'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">⚙️</span>
            <h1 className="text-3xl font-black text-white">Kubernetes & Autoscaling</h1>
          </div>
          <p className="text-gray-400 max-w-2xl">
            Cuando la hamburguesería se llena, el sistema levanta nuevos cajeros (pods)
            automáticamente. Cuando la cola baja, los cierra. Eso es el{' '}
            <span className="text-brand-yellow font-semibold">Horizontal Pod Autoscaler</span>.
          </p>
        </div>
        <span
          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full ${
            isK8s
              ? 'bg-green-900/40 text-green-400'
              : 'bg-yellow-900/40 text-yellow-400'
          }`}
        >
          {isK8s ? '🟢 Kubernetes real' : '🟡 Simulación local'}
        </span>
      </div>

      {/* Analogía visual */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
          El local en este momento
        </h2>

        {/* Clientes (RPS) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              Clientes por minuto (RPS simulados):{' '}
              <span className="text-white font-bold">{rps}</span>
            </span>
            <span className="text-sm text-gray-500">
              CPU promedio: <span className={`font-bold ${cpuUtil > 70 ? 'text-red-400' : cpuUtil > 40 ? 'text-yellow-400' : 'text-green-400'}`}>{cpuUtil}%</span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={200}
            step={10}
            value={rps}
            onChange={(e) => setLoad(Number(e.target.value))}
            disabled={stressActive}
            className="w-full accent-brand-yellow cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>0 clientes</span>
            <span>100</span>
            <span>200 clientes (lleno)</span>
          </div>
        </div>

        {/* Pods grid */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-3">
            Cajeros activos (pods): <span className="text-white font-bold">{podCount}</span> /{' '}
            {metrics?.hpa.maxReplicas ?? 10} máximo
          </p>
          <div className="flex flex-wrap gap-3">
            <AnimatePresence mode="popLayout">
              {metrics?.pods.map((pod) => (
                <motion.div
                  key={pod.name}
                  layout
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border w-20 ${
                    pod.status === 'Running' && pod.ready
                      ? 'border-green-700 bg-green-900/20'
                      : pod.status === 'Pending'
                        ? 'border-yellow-700 bg-yellow-900/20'
                        : 'border-red-700 bg-red-900/20 opacity-60'
                  }`}
                  title={pod.name}
                >
                  <span className="text-2xl">👨‍🍳</span>
                  <span className={`text-xs font-semibold ${
                    pod.status === 'Running' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {pod.status === 'Pending' ? 'Iniciando' : 'Activo'}
                  </span>
                  {pod.cpu && (
                    <span className="text-xs text-gray-500">{pod.cpu}</span>
                  )}
                </motion.div>
              ))}

              {/* Slots vacíos */}
              {Array.from({ length: Math.max(0, (metrics?.hpa.maxReplicas ?? 10) - podCount) }).map(
                (_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl border border-dashed border-gray-800 w-20 opacity-30"
                  >
                    <span className="text-2xl grayscale">👨‍🍳</span>
                    <span className="text-xs text-gray-600">Libre</span>
                  </div>
                )
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Stress test */}
        <div className="flex gap-3 mt-4">
          {!stressActive ? (
            <button
              onClick={startStressTest}
              className="bg-brand-red hover:bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
            >
              🔥 Stress test (llenar el local)
            </button>
          ) : (
            <button
              onClick={stopStressTest}
              disabled={loading}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
            >
              ⏹ Detener y vaciar
            </button>
          )}
          {rps > 0 && !stressActive && (
            <button
              onClick={resetLoad}
              className="text-gray-400 hover:text-white text-sm border border-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              Resetear
            </button>
          )}
        </div>
      </div>

      {/* HPA stats */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Pods actuales', value: metrics.hpa.currentReplicas, icon: '👨‍🍳' },
            { label: 'CPU promedio', value: `${metrics.hpa.cpuUtilization ?? 0}%`, icon: '⚡' },
            { label: 'Mínimo pods', value: metrics.hpa.minReplicas, icon: '📉' },
            { label: 'Máximo pods', value: metrics.hpa.maxReplicas, icon: '📈' },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl mb-1">{stat.icon}</p>
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Glosario */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Conceptos clave
        </h2>
        <div className="space-y-3">
          {CONCEPTS.map((c) => (
            <div key={c.term} className="flex gap-3">
              <span className="text-xl shrink-0 mt-0.5">{c.emoji}</span>
              <div>
                <span className="font-bold text-brand-yellow text-sm">{c.term}</span>
                <p className="text-gray-400 text-sm mt-0.5">{c.definition}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comandos Minikube */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Probarlo en Minikube
        </h2>
        <div className="space-y-3 font-mono text-sm">
          {[
            { comment: '# Iniciar el cluster local', cmd: 'minikube start' },
            { comment: '# Habilitar el metrics-server (necesario para el HPA)', cmd: 'minikube addons enable metrics-server' },
            { comment: '# Cargar las imágenes locales', cmd: 'minikube image load mcdollars-api:latest\nminikube image load mcdollars-web:latest' },
            { comment: '# Aplicar todos los manifiestos', cmd: 'kubectl apply -f k8s/' },
            { comment: '# Ver pods en tiempo real', cmd: 'kubectl get pods -n mcdollars -w' },
            { comment: '# Ver el HPA escalando', cmd: 'kubectl get hpa -n mcdollars -w' },
          ].map((item, i) => (
            <div key={i} className="bg-gray-950 rounded-lg p-3">
              <p className="text-gray-600 mb-1">{item.comment}</p>
              <pre className="text-green-400 whitespace-pre-wrap">{item.cmd}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
