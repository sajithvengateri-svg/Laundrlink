import type { Database } from './database.types'

export type Pro = Database['public']['Tables']['pros']['Row']
export type ProInsert = Database['public']['Tables']['pros']['Insert']
export type ProUpdate = Database['public']['Tables']['pros']['Update']

export type Fit2WorkStatus = Database['public']['Enums']['fit2work_status']
export type ProTier = Database['public']['Enums']['pro_tier']

export interface ProMetrics {
  jobsToday: number
  earningsToday: number
  earningsThisWeek: number
  ratingAvg: number
  totalOrders: number
}

export interface OnboardingData {
  // Step 1 — Personal
  abn?: string
  bio?: string
  // Step 2 — Identity (id_verified set by admin after review)
  id_verified?: boolean
  // Step 3 — Services & Pricing
  services?: string[]
  price_per_bag?: number
  express_price_per_bag?: number
  max_bags_per_day?: number
  handles_own_delivery?: boolean
  // Step 4 — Equipment
  machine_type?: string
  machine_capacity_kg?: number
  has_dryer?: boolean
  has_iron?: boolean
  detergent_type?: string
  setup_photo_url?: string
  // Step 5 — Hygiene Quiz
  quiz_passed?: boolean
  // Step 6 — Quality Pledge + Fit2Work
  pledge_signed?: boolean
}
