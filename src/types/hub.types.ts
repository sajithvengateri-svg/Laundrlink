import type { Database } from './database.types'

export type Hub = Database['public']['Tables']['hubs']['Row']
export type HubInsert = Database['public']['Tables']['hubs']['Insert']
export type HubUpdate = Database['public']['Tables']['hubs']['Update']

export type Order = Database['public']['Tables']['orders']['Row']
export type Handoff = Database['public']['Tables']['handoffs']['Row']
export type HandoffInsert = Database['public']['Tables']['handoffs']['Insert']

export type HandoffStep = Database['public']['Enums']['handoff_step']
export type OrderStatus = Database['public']['Enums']['order_status']

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
  } | null
  bags?: Array<{
    id: string
    qr_code: string
    current_status: string
  }>
  handoffs?: Handoff[]
}

export interface HubMetrics {
  totalOrdersToday: number
  pendingOrders: number
  completedToday: number
  capacityUsed: number
  capacityMax: number
  averageRating: number
}

export interface CreateHandoffParams {
  orderId: string
  bagId: string
  step: HandoffStep
  fromUserId: string
  toUserId: string
  scannedById: string
  photoUrls?: string[]
  signatureUrl?: string
  locationLat?: number
  locationLng?: number
}
