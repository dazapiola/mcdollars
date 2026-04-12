import { motion } from 'framer-motion'

type ModuleStatus = 'available' | 'coming-soon'

interface Module {
  id: string
  title: string
  analogy: string
  description: string
  tags: string[]
  status: ModuleStatus
  icon: string
  path?: string
}

const modules: Module[] = [
  {
    id: 'kubernetes',
    title: 'Kubernetes & Autoscaling',
    analogy: 'Más clientes → más cajeros automáticamente',
    description:
      'Cuando la hamburguesería se llena, el sistema levanta nuevos "cajeros" (pods) automáticamente. Cuando se vacía, los baja. Así funciona el Horizontal Pod Autoscaler.',
    tags: ['infraestructura', 'k8s', 'escalabilidad'],
    status: 'coming-soon',
    icon: '⚙️',
  },
  {
    id: 'solid',
    title: 'Principios SOLID',
    analogy: 'Cada empleado tiene un rol bien definido',
    description:
      'El cajero toma pedidos, el cocinero cocina, el repartidor entrega. Nadie hace todo. Así se diseña software mantenible.',
    tags: ['patrones', 'arquitectura', 'backend'],
    status: 'coming-soon',
    icon: '🏗️',
  },
  {
    id: 'microservices',
    title: 'Microservicios vs Monolito',
    analogy: 'Un cocinero que hace todo vs equipos especializados',
    description:
      'Monolito: un solo proceso maneja pedidos, cocina, pagos y delivery. Microservicios: cada área es un servicio independiente que puede escalar por separado.',
    tags: ['arquitectura', 'backend', 'escalabilidad'],
    status: 'coming-soon',
    icon: '🔧',
  },
  {
    id: 'message-queue',
    title: 'Cola de Mensajes',
    analogy: 'El papel del pedido que va a la cocina',
    description:
      'La caja imprime un ticket y lo manda a la cocina. La cocina lo procesa en orden. Si hay mucho trabajo, los tickets esperan sin perderse.',
    tags: ['backend', 'async', 'mensajería'],
    status: 'coming-soon',
    icon: '📋',
  },
  {
    id: 'caching',
    title: 'Caching con Redis',
    analogy: 'Hamburguesas pre-cocinadas bajo la lámpara de calor',
    description:
      'Las hamburguesas más pedidas se preparan con anticipación. No hace falta cocinarlas desde cero cada vez. Si pasan 10 minutos, hay que renovarlas (TTL).',
    tags: ['backend', 'performance', 'redis'],
    status: 'coming-soon',
    icon: '⚡',
  },
  {
    id: 'rate-limiting',
    title: 'Rate Limiting',
    analogy: 'Un pedido por persona en hora pico',
    description:
      'En hora pico, la caja acepta solo N pedidos por minuto. Si mandás demasiados, recibís un 429 Too Many Requests.',
    tags: ['backend', 'seguridad', 'performance'],
    status: 'coming-soon',
    icon: '🚦',
  },
  {
    id: 'circuit-breaker',
    title: 'Circuit Breaker',
    analogy: 'La parrilla se rompe, se sirven wraps como fallback',
    description:
      'Si la parrilla falla, el sistema automáticamente ofrece wraps en vez de dar error. Cuando se repara, vuelve gradualmente al menú normal.',
    tags: ['backend', 'resiliencia', 'patrones'],
    status: 'coming-soon',
    icon: '🔌',
  },
  {
    id: 'rest-api',
    title: 'REST API Design',
    analogy: 'El menú es la API, los métodos son las acciones',
    description:
      'GET /menu para ver qué hay. POST /orders para pedir. PATCH /orders/:id para modificar. DELETE para cancelar. Con los status codes correctos.',
    tags: ['backend', 'api', 'http'],
    status: 'available',
    icon: '🌐',
    path: '/menu',
  },
  {
    id: 'cicd',
    title: 'CI/CD Pipeline',
    analogy: 'Lanzar una nueva hamburguesa al menú con control de calidad',
    description:
      'Antes de que la nueva burger llegue a todos los locales, pasa por cocina de pruebas (dev), local piloto (staging) y luego producción. Si falla, no sale.',
    tags: ['devops', 'automatización', 'infraestructura'],
    status: 'coming-soon',
    icon: '🚀',
  },
  {
    id: 'cap-theorem',
    title: 'CAP Theorem',
    analogy: 'La franquicia sin conexión al depósito central',
    description:
      'Si se corta la red entre el local y el depósito, ¿vendemos igual aunque el stock pueda estar desactualizado (disponibilidad) o paramos todo (consistencia)?',
    tags: ['bases de datos', 'distribuidos', 'teoría'],
    status: 'coming-soon',
    icon: '📐',
  },
]

const tagColors: Record<string, string> = {
  infraestructura: 'bg-blue-900 text-blue-300',
  'k8s': 'bg-blue-900 text-blue-300',
  escalabilidad: 'bg-purple-900 text-purple-300',
  patrones: 'bg-green-900 text-green-300',
  arquitectura: 'bg-green-900 text-green-300',
  backend: 'bg-orange-900 text-orange-300',
  async: 'bg-yellow-900 text-yellow-300',
  mensajería: 'bg-yellow-900 text-yellow-300',
  performance: 'bg-red-900 text-red-300',
  redis: 'bg-red-900 text-red-300',
  seguridad: 'bg-pink-900 text-pink-300',
  resiliencia: 'bg-teal-900 text-teal-300',
  api: 'bg-indigo-900 text-indigo-300',
  http: 'bg-indigo-900 text-indigo-300',
  devops: 'bg-cyan-900 text-cyan-300',
  automatización: 'bg-cyan-900 text-cyan-300',
  'bases de datos': 'bg-violet-900 text-violet-300',
  distribuidos: 'bg-violet-900 text-violet-300',
  teoría: 'bg-gray-800 text-gray-300',
}

export function DashboardPage() {
  const available = modules.filter((m) => m.status === 'available')
  const comingSoon = modules.filter((m) => m.status === 'coming-soon')

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl font-black text-white mb-2">
          Bienvenido a <span className="text-brand-yellow">McDollars</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl">
          Una hamburguesería como excusa para aprender tecnología. Cada módulo explica un concepto
          técnico real usando analogías del mundo de las hamburguesas.
        </p>
      </div>

      {available.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs font-semibold text-brand-yellow uppercase tracking-widest mb-4">
            Disponibles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {available.map((mod, i) => (
              <ModuleCard key={mod.id} module={mod} index={i} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Próximamente
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comingSoon.map((mod, i) => (
            <ModuleCard key={mod.id} module={mod} index={i} />
          ))}
        </div>
      </section>
    </div>
  )
}

function ModuleCard({ module: mod, index }: { module: Module; index: number }) {
  const isAvailable = mod.status === 'available'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`relative rounded-xl border p-5 flex flex-col gap-3 transition-all ${
        isAvailable
          ? 'border-brand-yellow/40 bg-brand-dark hover:border-brand-yellow cursor-pointer'
          : 'border-gray-800 bg-gray-900/50 opacity-70'
      }`}
    >
      {!isAvailable && (
        <span className="absolute top-3 right-3 text-xs font-medium text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
          próximamente
        </span>
      )}

      <div className="flex items-start gap-3">
        <span className="text-2xl">{mod.icon}</span>
        <div>
          <h3 className="font-bold text-white text-sm leading-snug">{mod.title}</h3>
          <p className="text-brand-yellow text-xs mt-0.5 font-medium">{mod.analogy}</p>
        </div>
      </div>

      <p className="text-gray-400 text-sm leading-relaxed">{mod.description}</p>

      <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
        {mod.tags.map((tag) => (
          <span
            key={tag}
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              tagColors[tag] ?? 'bg-gray-800 text-gray-400'
            }`}
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  )
}
