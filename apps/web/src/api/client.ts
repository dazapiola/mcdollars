import type { Product, Order } from '../types'

const BASE_URL = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(error.error ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

interface ProductsResponse {
  products: Product[]
  cachedAt: string
  ttl: number
  _source: 'cache' | 'database'
}

export const api = {
  products: {
    list: async (category?: string): Promise<Product[]> => {
      const res = await request<ProductsResponse | Product[]>(
        `/products${category ? `?category=${category}` : ''}`
      )
      // Compatibilidad: si es array (sin cache) o wrapper con cache
      return Array.isArray(res) ? res : res.products
    },
    listWithMeta: (category?: string) =>
      request<ProductsResponse>(`/products${category ? `?category=${category}` : ''}`),
    get: (id: string) => request<Product>(`/products/${id}`),
  },
  orders: {
    list: () => request<Order[]>('/orders'),
    get: (id: string) => request<Order>(`/orders/${id}`),
    create: (items: { productId: string; quantity: number }[]) =>
      request<Order>('/orders', { method: 'POST', body: JSON.stringify({ items }) }),
    updateStatus: (id: string, status: string) =>
      request<Order>(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },
}
