import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client'
import type { Product, CartItem, Category } from '../types'

const CATEGORIES: { value: Category | 'ALL'; label: string; emoji: string }[] = [
  { value: 'ALL', label: 'Todo', emoji: '🍔' },
  { value: 'BURGER', label: 'Burgers', emoji: '🍔' },
  { value: 'SIDE', label: 'Sides', emoji: '🍟' },
  { value: 'DRINK', label: 'Bebidas', emoji: '🥤' },
  { value: 'DESSERT', label: 'Postres', emoji: '🍦' },
]

const CATEGORY_EMOJI: Record<Category, string> = {
  BURGER: '🍔',
  SIDE: '🍟',
  DRINK: '🥤',
  DESSERT: '🍦',
}

export function MenuPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<Category | 'ALL'>('ALL')
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)

  useEffect(() => {
    api.products
      .list()
      .then(setProducts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered =
    activeCategory === 'ALL' ? products : products.filter((p) => p.category === activeCategory)

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  function removeFromCart(productId: string) {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  async function placeOrder() {
    if (cart.length === 0) return
    setPlacingOrder(true)
    try {
      await api.orders.create(cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })))
      setCart([])
      setOrderPlaced(true)
      setTimeout(() => setOrderPlaced(false), 4000)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setPlacingOrder(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Cargando menú...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        Error: {error}. ¿Está corriendo el backend?
      </div>
    )
  }

  return (
    <div className="flex gap-8">
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl font-black text-white mb-6">Nuestro Menú</h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeCategory === cat.value
                  ? 'bg-brand-yellow text-brand-dark'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="text-4xl text-center py-2">
                  {CATEGORY_EMOJI[product.category]}
                </div>
                <div>
                  <h3 className="font-bold text-white">{product.name}</h3>
                  <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                    {product.description}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-brand-yellow font-bold text-lg">
                    ${product.price.toLocaleString()}
                  </span>
                  <button
                    onClick={() => addToCart(product)}
                    className="bg-brand-yellow text-brand-dark text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-yellow-400 transition-colors"
                  >
                    + Agregar
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <aside className="w-72 shrink-0">
        <div className="sticky top-24 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-bold text-white mb-4 flex items-center justify-between">
            Tu pedido
            {cartCount > 0 && (
              <span className="bg-brand-yellow text-brand-dark text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </h2>

          {cart.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Tu carrito está vacío</p>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-500">
                        ${item.product.price.toLocaleString()} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="w-6 h-6 rounded bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => addToCart(item.product)}
                        className="w-6 h-6 rounded bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-800 pt-3 mb-4">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-400">Total</span>
                  <span className="text-brand-yellow">${cartTotal.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={placeOrder}
                disabled={placingOrder}
                className="w-full bg-brand-red hover:bg-red-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {placingOrder ? 'Procesando...' : 'Confirmar pedido'}
              </button>
            </>
          )}

          <AnimatePresence>
            {orderPlaced && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 text-center text-green-400 text-sm font-medium"
              >
                ¡Pedido enviado a la cocina!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>
    </div>
  )
}
