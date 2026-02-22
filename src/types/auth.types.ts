import type { Role } from '@/lib/constants'

export interface Profile {
  id: string
  role: Role
  full_name: string | null
  phone: string | null
  phone_verified: boolean
  avatar_url: string | null
  address: Address | null
  stripe_customer_id: string | null
  loyalty_points: number
  loyalty_tier: 'bronze' | 'silver' | 'gold'
  referral_code: string | null
  referred_by: string | null
  ndis_number: string | null
  ndis_plan_manager: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Address {
  street: string
  suburb: string
  state: string
  postcode: string
  lat?: number
  lng?: number
}

export interface SignUpData {
  email: string
  password: string
  full_name: string
  phone: string
  role: Role
  referral_code?: string
}

export interface SignInData {
  email: string
  password: string
}

// What gets stored in Supabase auth.users raw_user_meta_data
export interface UserMetadata {
  full_name?: string
  phone?: string
  role?: Role
  avatar_url?: string
}
