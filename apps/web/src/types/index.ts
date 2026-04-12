export type Category = 'BURGER' | 'SIDE' | 'DRINK' | 'DESSERT'

export type OrderStatus = 'PENDING' | 'COOKING' | 'READY' | 'DELIVERED' | 'CANCELLED'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: Category
  imageUrl: string | null
  available: boolean
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  productId: string
  product: Product
}

export interface Order {
  id: string
  status: OrderStatus
  total: number
  createdAt: string
  updatedAt: string
  items: OrderItem[]
}

export interface CartItem {
  product: Product
  quantity: number
}
