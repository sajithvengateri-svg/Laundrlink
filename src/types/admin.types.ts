import type { Database } from './database.types'

export type PricingConfig = Database['public']['Tables']['pricing_config']['Row']
export type PricingConfigUpdate = Database['public']['Tables']['pricing_config']['Update']
export type SystemEvent = Database['public']['Tables']['system_events']['Row']

export interface AdminKpis {
  totalCustomers: number
  totalHubs: number
  totalPros: number
  totalDrivers: number
  ordersToday: number
  gmvToday: number           // cents
  gmvThisMonth: number       // cents
  platformRevenueThisMonth: number  // cents
}

export interface AdminUser {
  id: string
  full_name: string | null
  phone: string | null
  role: string
  is_active: boolean | null
  created_at: string | null
  stripe_customer_id: string | null
  // entity-specific extras (joined via hub/pro/driver tables)
  entity_is_verified?: boolean | null  // hubs / drivers
  police_check_status?: string | null  // pros / drivers
}

export interface PendingVerification {
  type: 'hub' | 'pro' | 'driver'
  entityId: string
  profileId: string
  name: string          // business_name for hub, full_name for pro/driver
  phone: string | null
  createdAt: string | null
  policeCheckStatus?: string | null  // pros / drivers
  reason: string        // human-readable reason it needs review
}

export interface DailyMetric {
  date: string   // YYYY-MM-DD
  value: number  // cents for GMV, count for orders
}

export interface AdminAnalytics {
  gmvByDay: DailyMetric[]       // last 30 days
  ordersByDay: DailyMetric[]    // last 30 days
  revenueByDay: DailyMetric[]   // platform fees, last 30 days
}

export interface AdminOrderRow {
  id: string
  order_number: string
  status: string | null
  created_at: string | null
  total_cents: number | null
  platform_fee_cents: number | null
  customer_name: string | null
  hub_name: string | null
  is_ndis: boolean | null
}
