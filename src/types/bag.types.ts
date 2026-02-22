import type { Database } from './database.types'

export type Bag = Database['public']['Tables']['bags']['Row']
export type BagInsert = Database['public']['Tables']['bags']['Insert']
export type BagUpdate = Database['public']['Tables']['bags']['Update']

export type BagStatus = Database['public']['Enums']['bag_status']

export interface BagWithOrder extends Bag {
  order?: {
    id: string
    order_number: string
    status: string
    customer?: {
      full_name: string
      phone: string
    }
  } | null
}

export interface AssignBagParams {
  qrCode: string
  orderId: string
  holderId: string
}
