import type { Database } from './database.types'

export type OrderRating = Database['public']['Tables']['order_ratings']['Row']
export type OrderRatingInsert = Database['public']['Tables']['order_ratings']['Insert']

export type RatedEntityType = 'hub' | 'pro' | 'driver'

export interface SubmitRatingParams {
  orderId: string
  customerId: string
  ratedEntityId: string
  ratedEntityType: RatedEntityType
  stars: number
  tags?: string[]
  reviewText?: string
}

export interface RateEntity {
  type: RatedEntityType
  id: string
  name: string
}

export const RATING_TAGS: Record<RatedEntityType, string[]> = {
  hub: [
    'Fast processing',
    'Clean bags returned',
    'Professional',
    'Good communication',
    'Great location',
  ],
  pro: [
    'Excellent cleaning',
    'Careful handling',
    'Followed instructions',
    'Fast turnaround',
    'Highly recommend',
  ],
  driver: [
    'On time',
    'Friendly',
    'Careful with bags',
    'Professional',
    'Fast delivery',
  ],
}

export const ENTITY_LABELS: Record<RatedEntityType, string> = {
  hub: 'Hub',
  pro: 'Laundry Pro',
  driver: 'Driver',
}
