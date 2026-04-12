import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Principle {
  letter: string
  name: string
  fullName: string
  emoji: string
  analogy: string
  explanation: string
  bad: { title: string; code: string; problem: string }
  good: { title: string; code: string; benefit: string }
}

const PRINCIPLES: Principle[] = [
  {
    letter: 'S',
    name: 'Single Responsibility',
    fullName: 'Principio de Responsabilidad Única',
    emoji: '👨‍🍳',
    analogy: 'El cajero solo toma pedidos. El cocinero solo cocina. Nadie hace todo.',
    explanation:
      'Una clase o función debe tener una sola razón para cambiar. Si el cajero también cocinara y entregara, cualquier cambio en la cocina rompería la caja.',
    bad: {
      title: 'El cajero que hace todo',
      problem: 'Si cambia la forma de cobrar, hay que tocar la misma clase que también cocina y entrega. Un cambio puede romper todo.',
      code: `class Cajero {
  tomarPedido(items: string[]) { ... }

  // ❌ Responsabilidad de la cocina
  cocinarHamburguesa(tipo: string) {
    console.log(\`Cocinando \${tipo}...\`)
    // lógica de cocina aquí
  }

  // ❌ Responsabilidad de pagos
  cobrar(total: number): boolean {
    return procesarTarjeta(total)
  }

  // ❌ Responsabilidad de delivery
  entregarPedido(pedidoId: string) {
    moverseALaMesa(pedidoId)
  }
}`,
    },
    good: {
      title: 'Cada uno en su rol',
      benefit: 'Puedo cambiar cómo se cobra sin tocar la cocina. Puedo cambiar el proceso de entrega sin afectar los pedidos.',
      code: `class Cajero {
  tomarPedido(items: string[]): Pedido { ... }
}

class Cocina {
  cocinar(pedido: Pedido): void { ... }
}

class Cobrador {
  cobrar(total: number): boolean { ... }
}

class Repartidor {
  entregar(pedido: Pedido): void { ... }
}`,
    },
  },
  {
    letter: 'O',
    name: 'Open/Closed',
    fullName: 'Principio Abierto/Cerrado',
    emoji: '🍔',
    analogy: 'El menú puede crecer con nuevas hamburguesas sin cambiar la caja registradora.',
    explanation:
      'Las clases deben estar abiertas para extensión pero cerradas para modificación. Agregar una hamburguesa vegana no debería obligar a reescribir la lógica de pedidos.',
    bad: {
      title: 'Modificar para extender',
      problem: 'Cada vez que se agrega un tipo de hamburguesa, hay que modificar el método calcularPrecio. Riesgo de romper los tipos existentes.',
      code: `class Pedido {
  calcularPrecio(tipo: string): number {
    // ❌ Hay que modificar esto cada vez que
    // se agrega una hamburguesa nueva
    if (tipo === 'classic') return 1200
    if (tipo === 'double') return 1800
    if (tipo === 'bacon') return 1600
    // próximo dev agrega aquí... y puede romper
    if (tipo === 'veggie') return 1400
    throw new Error('Tipo desconocido')
  }
}`,
    },
    good: {
      title: 'Extender sin modificar',
      benefit: 'Para agregar McVeggie, creo una nueva clase. No toco Pedido ni los tipos existentes. Imposible romper lo que ya funciona.',
      code: `interface Hamburguesa {
  readonly nombre: string
  calcularPrecio(): number
}

class McClassic implements Hamburguesa {
  nombre = 'McClassic'
  calcularPrecio() { return 1200 }
}

class McVeggie implements Hamburguesa {
  nombre = 'McVeggie'
  calcularPrecio() { return 1400 }
}

class Pedido {
  // ✅ No cambia nunca, sin importar las burgers nuevas
  calcularTotal(items: Hamburguesa[]): number {
    return items.reduce((s, i) => s + i.calcularPrecio(), 0)
  }
}`,
    },
  },
  {
    letter: 'L',
    name: 'Liskov Substitution',
    fullName: 'Principio de Sustitución de Liskov',
    emoji: '🔄',
    analogy: 'Un cocinero nuevo puede reemplazar al anterior sin cambiar el proceso del local.',
    explanation:
      'Si reemplazás una clase por una subclase, el programa debe seguir funcionando igual. Un cocinero especializado en veggie debe poder hacer todo lo que hace un cocinero estándar (y más).',
    bad: {
      title: 'La subclase que rompe el contrato',
      problem: 'CocinaVeggie hereda de Cocina pero lanza error en cocinarCarne. Usarla donde se espera Cocina rompe el programa.',
      code: `class Cocina {
  cocinarCarne(g: number): void { ... }
  cocinarVeggies(g: number): void { ... }
}

class CocinaVeggie extends Cocina {
  // ❌ Rompe el contrato de la clase base
  cocinarCarne(_g: number): void {
    throw new Error('¡No cocinamos carne aquí!')
  }
}

// Esto falla en runtime con CocinaVeggie:
function prepararPedido(cocina: Cocina) {
  cocina.cocinarCarne(180) // 💥 explota
}`,
    },
    good: {
      title: 'Jerarquía que respeta el contrato',
      benefit: 'Cualquier cocina puede usarse donde se espera PrepararIngredientes. No hay sorpresas en runtime.',
      code: `interface PrepararIngredientes {
  prepararBase(g: number): void
}

class CocinaEstandar implements PrepararIngredientes {
  prepararBase(g: number) {
    // Carne a la parrilla
  }
}

class CocinaVeggie implements PrepararIngredientes {
  prepararBase(g: number) {
    // Medallón de lentejas, mismo contrato
  }
}

// ✅ Funciona con cualquier implementación
function prepararPedido(cocina: PrepararIngredientes) {
  cocina.prepararBase(180)
}`,
    },
  },
  {
    letter: 'I',
    name: 'Interface Segregation',
    fullName: 'Principio de Segregación de Interfaces',
    emoji: '✂️',
    analogy: 'El cocinero no necesita saber el precio. Solo recibe la orden de cocina.',
    explanation:
      'No forzar a las clases a implementar métodos que no necesitan. Una interfaz grande y genérica es peor que varias pequeñas y específicas.',
    bad: {
      title: 'La interfaz que sabe demasiado',
      problem: 'CocinaBot implementa Empleado pero no cobra ni toma pedidos. Se ve obligado a escribir métodos vacíos que no tienen sentido para él.',
      code: `interface Empleado {
  tomarPedido(): void
  cocinar(): void
  cobrar(): void      // ❌ el cocinero no cobra
  entregar(): void    // ❌ el cocinero no entrega
}

class CocinaBot implements Empleado {
  tomarPedido() {} // ❌ no tiene sentido
  cocinar() { /* lógica real */ }
  cobrar() {}      // ❌ no tiene sentido
  entregar() {}    // ❌ no tiene sentido
}`,
    },
    good: {
      title: 'Interfaces específicas por rol',
      benefit: 'Cada clase implementa solo lo que le corresponde. Si cambia la lógica de cobro, CocinaBot no se ve afectado.',
      code: `interface PuedeCocinar {
  cocinar(pedido: Pedido): void
}

interface PuedeCobrar {
  cobrar(total: number): boolean
}

interface PuedeTomarPedidos {
  tomarPedido(): Pedido
}

// ✅ Solo implementa lo que le corresponde
class CocinaBot implements PuedeCocinar {
  cocinar(pedido: Pedido) { /* lógica real */ }
}

class Cajero implements PuedeCobrar, PuedeTomarPedidos {
  tomarPedido(): Pedido { ... }
  cobrar(total: number): boolean { ... }
}`,
    },
  },
  {
    letter: 'D',
    name: 'Dependency Inversion',
    fullName: 'Principio de Inversión de Dependencias',
    emoji: '🔌',
    analogy: 'El sistema de pedidos no depende de si la cocina es a gas o eléctrica. Depende de la abstracción "cocina".',
    explanation:
      'Los módulos de alto nivel no deben depender de módulos de bajo nivel. Ambos deben depender de abstracciones. El gerente no le da órdenes directamente a una persona; habla con "el rol".',
    bad: {
      title: 'Acoplado a la implementación concreta',
      problem: 'Pedido depende directamente de CocinaAGas. Si mañana instalamos cocina eléctrica, hay que modificar Pedido, que no tiene nada que ver con el tipo de cocina.',
      code: `class CocinaAGas {
  encender() { console.log('Gas encendido') }
  cocinar(item: string) { ... }
}

class Pedido {
  // ❌ Depende de la implementación concreta
  private cocina = new CocinaAGas()

  procesar(items: string[]) {
    this.cocina.encender()
    items.forEach(i => this.cocina.cocinar(i))
  }
}
// Cambiar a CocinaElectrica obliga a modificar Pedido`,
    },
    good: {
      title: 'Depender de abstracciones',
      benefit: 'Pedido no sabe ni le importa si es gas, eléctrica o microondas. Solo habla con la interfaz Cocina. El tipo de cocina se inyecta desde afuera.',
      code: `interface Cocina {
  cocinar(item: string): void
}

class CocinaAGas implements Cocina {
  cocinar(item: string) { ... }
}

class CocinaElectrica implements Cocina {
  cocinar(item: string) { ... }
}

class Pedido {
  // ✅ Depende de la abstracción, no del detalle
  constructor(private cocina: Cocina) {}

  procesar(items: string[]) {
    items.forEach(i => this.cocina.cocinar(i))
  }
}

// Inyección de dependencia:
const pedido = new Pedido(new CocinaElectrica())`,
    },
  },
]

export function SolidPage() {
  const [active, setActive] = useState(0)
  const [showGood, setShowGood] = useState(false)

  const principle = PRINCIPLES[active]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-3xl">🏗️</span>
          <h1 className="text-3xl font-black text-white">Principios SOLID</h1>
        </div>
        <p className="text-gray-400 max-w-2xl">
          Cinco principios de diseño orientado a objetos que hacen el software más mantenible y
          extensible. Acá los explicamos con el día a día de una hamburguesería.
        </p>
      </div>

      {/* Selector de principio */}
      <div className="flex gap-2 flex-wrap">
        {PRINCIPLES.map((p, i) => (
          <button
            key={p.letter}
            onClick={() => { setActive(i); setShowGood(false) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              active === i
                ? 'bg-brand-yellow text-brand-dark'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="text-lg font-black">{p.letter}</span>
            <span className="hidden sm:inline">{p.name}</span>
          </button>
        ))}
      </div>

      {/* Contenido del principio */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {/* Título y analogía */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-brand-yellow flex items-center justify-center shrink-0">
                <span className="text-3xl font-black text-brand-dark">{principle.letter}</span>
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{principle.fullName}</h2>
                <p className="text-brand-yellow text-sm font-medium mt-1">
                  {principle.emoji} {principle.analogy}
                </p>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">{principle.explanation}</p>
              </div>
            </div>
          </div>

          {/* Toggle código */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowGood(false)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                !showGood ? 'bg-red-900 text-red-300 border border-red-700' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              ❌ Código con problema
            </button>
            <button
              onClick={() => setShowGood(true)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                showGood ? 'bg-green-900 text-green-300 border border-green-700' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              ✅ Aplicando {principle.letter}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!showGood ? (
              <motion.div
                key="bad"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="bg-gray-900 border border-red-900/50 rounded-xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 bg-red-900/20 border-b border-red-900/30">
                  <span className="text-sm font-semibold text-red-400">
                    ❌ {principle.bad.title}
                  </span>
                </div>
                <pre className="p-4 text-sm text-gray-300 overflow-x-auto leading-relaxed font-mono">
                  {principle.bad.code}
                </pre>
                <div className="px-4 py-3 bg-red-900/10 border-t border-red-900/30">
                  <p className="text-red-400 text-sm">
                    <span className="font-semibold">Problema:</span> {principle.bad.problem}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="good"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-gray-900 border border-green-900/50 rounded-xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 bg-green-900/20 border-b border-green-900/30">
                  <span className="text-sm font-semibold text-green-400">
                    ✅ {principle.good.title}
                  </span>
                </div>
                <pre className="p-4 text-sm text-gray-300 overflow-x-auto leading-relaxed font-mono">
                  {principle.good.code}
                </pre>
                <div className="px-4 py-3 bg-green-900/10 border-t border-green-900/30">
                  <p className="text-green-400 text-sm">
                    <span className="font-semibold">Beneficio:</span> {principle.good.benefit}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Resumen */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Resumen del local bien organizado
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {PRINCIPLES.map((p) => (
            <div
              key={p.letter}
              className="text-center p-3 bg-gray-950 rounded-xl cursor-pointer hover:bg-gray-800 transition-colors"
              onClick={() => { setActive(PRINCIPLES.indexOf(p)); setShowGood(false) }}
            >
              <p className="text-2xl font-black text-brand-yellow">{p.letter}</p>
              <p className="text-xs text-gray-400 mt-1">{p.name}</p>
              <p className="text-lg mt-1">{p.emoji}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
