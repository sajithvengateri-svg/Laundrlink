import type { Database } from './database.types'

export type Order = Database['public']['Tables']['orders']['Row']
export type OrderInsert = Database['public']['Tables']['orders']['Insert']
export type OrderUpdate = Database['public']['Tables']['orders']['Update']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']
export type Notification = Database['public']['Tables']['notifications']['Row']

export type OrderStatus = Database['public']['Enums']['order_status']
export type ServiceType = Database['public']['Enums']['service_type']

export interface Address {
  street: string
  suburb: string
  state: string
  postcode: string
  country: string
  lat?: number
  lng?: number
  formatted?: string
}

export interface OrderWithDetails extends Order {
  customer?: {
    id: string
    full_name: string
    phone: string
    avatar_url: string | null
  } | null
  hub?: {
    id: string
    business_name: string
    address: Record<string, unknown>
  } | null
  items?: OrderItem[]
  handoffs?: Array<{
    id: string
    step: string
    photo_urls: string[]
    created_at: string
    scanned_by: string
  }>
}

export interface CreateOrderParams {
  customerId: string
  pickupAddress: Address
  deliveryAddress: Address
  serviceType: ServiceType
  items: Array<{ description: string; quantity: number; price_cents: number }>
  pickupDate: string // ISO string
  deliveryDate: string
  specialInstructions?: string
  isNdis?: boolean
  ndisNumber?: string
  ndisPlanManager?: string
}

export interface NearbyHub {
  id: string
  business_name: string
  address: Record<string, unknown>
  distance_km: number
  rating: number | null
  capacity: number | null
  current_load: number | null
  available_capacity_pct: number
  lat?: number
  lng?: number
}

export interface PaymentIntentResponse {
  client_secret: string
  payment_intent_id: string
  amount: number
  hub_amount: number
  platform_fee: number
}
