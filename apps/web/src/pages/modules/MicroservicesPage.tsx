import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Architecture = 'monolith' | 'microservices'
type ServiceName = 'orders' | 'kitchen' | 'payments' | 'delivery'

interface Service {
  id: ServiceName
  label: string
  emoji: string
  description: string
  color: string
}

const SERVICES: Service[] = [
  { id: 'orders', label: 'Pedidos', emoji: '🧾', description: 'Toma y gestiona los pedidos', color: 'bg-blue-900/40 border-blue-700' },
  { id: 'kitchen', label: 'Cocina', emoji: '👨‍🍳', description: 'Prepara los pedidos', color: 'bg-orange-900/40 border-orange-700' },
  { id: 'payments', label: 'Pagos', emoji: '💳', description: 'Procesa los cobros', color: 'bg-green-900/40 border-green-700' },
  { id: 'delivery', label: 'Delivery', emoji: '🛵', description: 'Gestiona las entregas', color: 'bg-purple-900/40 border-purple-700' },
]

const COMPARISON = [
  {
    aspect: 'Despliegue',
    monolith: 'Todo junto. Si tocás pagos, tenés que redesplegar todo el sistema.',
    micro: 'Cada servicio se despliega por separado. Sólo actualizás lo que cambió.',
    winner: 'micro',
  },
  {
    aspect: 'Escalabilidad',
    monolith: 'Escala todo o nada. Si la cocina está saturada, escala todo el monolito.',
    micro: 'Escala sólo lo que necesitás. Si la cocina está saturada, sólo la cocina escala.',
    winner: 'micro',
  },
  {
    aspect: 'Simplicidad',
    monolith: 'Un solo proyecto, una sola base de código. Fácil de arrancar y entender.',
    micro: 'Múltiples repos, redes, contratos de API. Mayor complejidad operacional.',
    winner: 'monolith',
  },
  {
    aspect: 'Fallo de un componente',
    monolith: 'Si pagos falla, puede tumbar todo el sistema.',
    micro: 'Si pagos falla, pedidos y cocina siguen funcionando.',
    winner: 'micro',
  },
  {
    aspect: 'Testing',
    monolith: 'Tests de integración simples. Todo en el mismo proceso.',
    micro: 'Requiere mocks de servicios, contract testing. Más complejo.',
    winner: 'monolith',
  },
  {
    aspect: 'Latencia',
    monolith: 'Llamadas en memoria. Ultrarápidas.',
    micro: 'Llamadas de red entre servicios. Latencia adicional.',
    winner: 'monolith',
  },
  {
    aspect: 'Equipos',
    monolith: 'Un equipo gestiona todo. Riesgo de cuellos de botella.',
    micro: 'Cada equipo es dueño de su servicio. Autonomía y velocidad.',
    winner: 'micro',
  },
  {
    aspect: '¿Cuándo usar?',
    monolith: 'Al principio, equipos chicos, producto no validado.',
    micro: 'Cuando escalás, múltiples equipos, dominio bien definido.',
    winner: 'both',
  },
]

export function MicroservicesPage() {
  const [arch, setArch] = useState<Architecture>('monolith')
  const [brokenService, setBrokenService] = useState<ServiceName | null>(null)
  const [requestFlow, setRequestFlow] = useState<ServiceName[]>([])
  const [simulating, setSimulating] = useState(false)

  async function simulateOrder() {
    if (simulating) return
    setSimulating(true)
    setRequestFlow([])

    const flow: ServiceName[] = ['orders', 'kitchen', 'payments', 'delivery']

    for (const service of flow) {
      await new Promise((r) => setTimeout(r, 600))
      if (brokenService === service) {
        setRequestFlow((prev) => [...prev, service])
        await new Promise((r) => setTimeout(r, 400))
        break
      }
      setRequestFlow((prev) => [...prev, service])
    }

    await new Promise((r) => setTimeout(r, 1500))
    setRequestFlow([])
    setSimulating(false)
  }

  function getServiceState(serviceId: ServiceName): 'idle' | 'active' | 'broken' | 'offline' {
    if (brokenService === serviceId) return 'broken'
    if (arch === 'monolith' && brokenService !== null) return 'offline'
    if (requestFlow.includes(serviceId)) return 'active'
    return 'idle'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-3xl">🔧</span>
          <h1 className="text-3xl font-black text-white">Microservicios vs Monolito</h1>
        </div>
        <p className="text-gray-400 max-w-2xl">
          ¿Un cocinero que hace todo, o equipos especializados? Ambas arquitecturas tienen su lugar.
          Simulá una falla en un servicio y mirá cómo reacciona cada arquitectura.
        </p>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setArch('monolith'); setBrokenService(null); setRequestFlow([]) }}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            arch === 'monolith'
              ? 'bg-brand-yellow text-brand-dark'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          🏠 Monolito
        </button>
        <button
          onClick={() => { setArch('microservices'); setBrokenService(null); setRequestFlow([]) }}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            arch === 'microservices'
              ? 'bg-brand-yellow text-brand-dark'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          🔀 Microservicios
        </button>
      </div>

      {/* Diagrama */}
      <AnimatePresence mode="wait">
        <motion.div
          key={arch}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="bg-gray-900 border border-gray-800 rounded-xl p-6"
        >
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">
            {arch === 'monolith' ? '🏠 Arquitectura Monolítica' : '🔀 Arquitectura de Microservicios'}
          </h2>

          {arch === 'monolith' ? (
            <MonolithDiagram
              brokenService={brokenService}
              requestFlow={requestFlow}
              getServiceState={getServiceState}
            />
          ) : (
            <MicroservicesDiagram
              brokenService={brokenService}
              requestFlow={requestFlow}
              getServiceState={getServiceState}
            />
          )}

          {/* Controles */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={simulateOrder}
              disabled={simulating}
              className="bg-brand-yellow text-brand-dark font-bold px-5 py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-60 transition-colors text-sm"
            >
              ▶ Simular pedido
            </button>
            {SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => setBrokenService(brokenService === s.id ? null : s.id)}
                className={`text-sm font-semibold px-3 py-2 rounded-lg border transition-all ${
                  brokenService === s.id
                    ? 'bg-red-900/40 border-red-700 text-red-400'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {brokenService === s.id ? '✓' : ''} Romper {s.label}
              </button>
            ))}
          </div>

          {/* Consecuencia */}
          {brokenService !== null && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl border text-sm ${
                arch === 'monolith'
                  ? 'bg-red-900/20 border-red-800 text-red-300'
                  : 'bg-yellow-900/20 border-yellow-800 text-yellow-300'
              }`}
            >
              {arch === 'monolith' ? (
                <>
                  <span className="font-bold">💥 Monolito:</span> El servicio de{' '}
                  <strong>{SERVICES.find((s) => s.id === brokenService)?.label}</strong> falló y{' '}
                  <strong>toda la aplicación está caída</strong>. Los clientes no pueden hacer nada.
                </>
              ) : (
                <>
                  <span className="font-bold">⚠️ Microservicios:</span> El servicio de{' '}
                  <strong>{SERVICES.find((s) => s.id === brokenService)?.label}</strong> falló pero{' '}
                  <strong>los demás servicios siguen funcionando</strong>. El impacto está contenido.
                </>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tabla comparativa */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
            Comparación
          </h2>
        </div>
        <div className="divide-y divide-gray-800">
          <div className="grid grid-cols-3 gap-4 px-6 py-2 text-xs font-bold text-gray-500 uppercase">
            <span>Aspecto</span>
            <span>🏠 Monolito</span>
            <span>🔀 Microservicios</span>
          </div>
          {COMPARISON.map((row) => (
            <div key={row.aspect} className="grid grid-cols-3 gap-4 px-6 py-3 text-sm">
              <span className="text-gray-300 font-semibold">{row.aspect}</span>
              <span className={`text-gray-400 ${row.winner === 'monolith' ? 'text-green-400 font-medium' : ''}`}>
                {row.winner === 'monolith' && <span className="mr-1">★</span>}
                {row.monolith}
              </span>
              <span className={`text-gray-400 ${row.winner === 'micro' ? 'text-green-400 font-medium' : ''}`}>
                {row.winner === 'micro' && <span className="mr-1">★</span>}
                {row.micro}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Conclusión */}
      <div className="bg-brand-yellow/10 border border-brand-yellow/30 rounded-xl p-5">
        <p className="text-brand-yellow font-bold mb-1">💡 La regla de oro</p>
        <p className="text-gray-300 text-sm leading-relaxed">
          Empezá con un monolito bien estructurado (con límites claros entre módulos).
          Cuando tengas múltiples equipos, escala diferente en cada área, o el despliegue se vuelva un
          cuello de botella: <strong>ese es el momento de extraer microservicios</strong>. No antes.
          Muchas startups fracasaron por adoptar microservicios antes de entender su dominio.
        </p>
      </div>
    </div>
  )
}

function ServiceBox({
  service,
  state,
}: {
  service: Service
  state: 'idle' | 'active' | 'broken' | 'offline'
}) {
  return (
    <motion.div
      animate={{
        scale: state === 'active' ? 1.05 : 1,
        opacity: state === 'offline' ? 0.3 : 1,
      }}
      className={`rounded-xl border p-3 text-center transition-colors ${
        state === 'broken'
          ? 'border-red-700 bg-red-900/30'
          : state === 'active'
            ? 'border-brand-yellow bg-brand-yellow/10'
            : service.color
      }`}
    >
      <p className="text-2xl">{state === 'broken' ? '💥' : service.emoji}</p>
      <p className="text-xs font-bold text-white mt-1">{service.label}</p>
      <p className={`text-xs mt-0.5 ${
        state === 'broken' ? 'text-red-400' :
        state === 'active' ? 'text-brand-yellow' :
        state === 'offline' ? 'text-gray-600' :
        'text-gray-500'
      }`}>
        {state === 'broken' ? 'ROTO' : state === 'active' ? 'Procesando' : state === 'offline' ? 'OFFLINE' : 'En espera'}
      </p>
    </motion.div>
  )
}

function MonolithDiagram({
  getServiceState,
}: {
  brokenService: ServiceName | null
  requestFlow: ServiceName[]
  getServiceState: (s: ServiceName) => 'idle' | 'active' | 'broken' | 'offline'
}) {
  return (
    <div className="border-2 border-dashed border-gray-700 rounded-xl p-6">
      <p className="text-xs text-gray-600 font-bold uppercase text-center mb-4">
        Un solo proceso — todo dentro del mismo servidor
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SERVICES.map((s) => (
          <ServiceBox key={s.id} service={s} state={getServiceState(s.id)} />
        ))}
      </div>
    </div>
  )
}

function MicroservicesDiagram({
  getServiceState,
}: {
  brokenService: ServiceName | null
  requestFlow: ServiceName[]
  getServiceState: (s: ServiceName) => 'idle' | 'active' | 'broken' | 'offline'
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {SERVICES.map((s) => (
        <div key={s.id} className="border border-dashed border-gray-700 rounded-xl p-3">
          <p className="text-xs text-gray-600 font-bold uppercase text-center mb-2">
            Servicio independiente
          </p>
          <ServiceBox service={s} state={getServiceState(s.id)} />
        </div>
      ))}
    </div>
  )
}
