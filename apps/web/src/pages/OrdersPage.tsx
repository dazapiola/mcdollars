import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api/client'
import type { Order, OrderStatus } from '../types'

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; emoji: string }> = {
  PENDING: { label: 'Pendiente', color: 'text-yellow-400 bg-yellow-900/40', emoji: '⏳' },
  COOKING: { label: 'En cocina', color: 'text-orange-400 bg-orange-900/40', emoji: '👨‍🍳' },
  READY: { label: 'Listo', color: 'text-green-400 bg-green-900/40', emoji: '✅' },
  DELIVERED: { label: 'Entregado', color: 'text-gray-400 bg-gray-800', emoji: '🎉' },
  CANCELLED: { label: 'Cancelado', color: 'text-red-400 bg-red-900/40', emoji: '❌' },
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'COOKING',
  COOKING: 'READY',
  READY: 'DELIVERED',
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    try {
      const data = await api.orders.list()
      setOrders(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function advanceStatus(order: Order) {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setUpdatingId(order.id)
    try {
      const updated = await api.orders.updateStatus(order.id, next)
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Cargando pedidos...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-400">Error: {error}</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black text-white">Pedidos</h1>
        <button
          onClick={fetchOrders}
          className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          Actualizar
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center text-gray-500 py-20">
          <p className="text-4xl mb-3">🍔</p>
          <p>No hay pedidos todavía. ¡Ordená algo del menú!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, i) => {
            const config = STATUS_CONFIG[order.status]
            const next = NEXT_STATUS[order.status]
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-gray-500">
                        #{order.id.slice(-6).toUpperCase()}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.color}`}
                      >
                        {config.emoji} {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleString('es-AR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-brand-yellow font-bold">
                      ${order.total.toLocaleString()}
                    </p>
                    {next && (
                      <button
                        onClick={() => advanceStatus(order)}
                        disabled={updatingId === order.id}
                        className="mt-1 text-xs text-gray-400 hover:text-white border border-gray-700 px-2 py-1 rounded transition-colors disabled:opacity-50"
                      >
                        {updatingId === order.id ? '...' : `→ ${STATUS_CONFIG[next].label}`}
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-300">
                        {item.quantity}x {item.product.name}
                      </span>
                      <span className="text-gray-500">
                        ${(item.unitPrice * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
