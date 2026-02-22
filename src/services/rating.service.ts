import { supabase } from '@/lib/supabase'
import type { OrderRating, SubmitRatingParams, RatedEntityType } from '@/types/rating.types'

// ─── Submit ───────────────────────────────────────────────────────────────────

export async function submitRating(params: SubmitRatingParams): Promise<OrderRating> {
  const { data, error } = await supabase
    .from('order_ratings')
    .insert({
      order_id: params.orderId,
      customer_id: params.customerId,
      rated_entity_id: params.ratedEntityId,
      rated_entity_type: params.ratedEntityType,
      stars: params.stars,
      tags: params.tags ?? [],
      review_text: params.reviewText ?? null,
    })
    .select()
    .single()

  if (error) throw error

  // Update the entity's rating_avg after submission (fire and don't block)
  void updateEntityRatingAvg(params.ratedEntityId, params.ratedEntityType)

  return data
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getOrderRatings(orderId: string): Promise<OrderRating[]> {
  const { data, error } = await supabase
    .from('order_ratings')
    .select('*')
    .eq('order_id', orderId)

  if (error) throw error
  return data ?? []
}

export async function hasRatedOrder(orderId: string, customerId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('order_ratings')
    .select('id')
    .eq('order_id', orderId)
    .eq('customer_id', customerId)
    .limit(1)

  if (error) throw error
  return (data?.length ?? 0) > 0
}

export async function getEntityRatingStats(
  entityId: string,
  entityType: RatedEntityType
): Promise<{ avg: number; count: number }> {
  const { data, error } = await supabase
    .from('order_ratings')
    .select('stars')
    .eq('rated_entity_id', entityId)
    .eq('rated_entity_type', entityType)

  if (error) throw error

  const rows = data ?? []
  if (rows.length === 0) return { avg: 0, count: 0 }

  const avg = rows.reduce((sum, r) => sum + r.stars, 0) / rows.length
  return { avg: Math.round(avg * 10) / 10, count: rows.length }
}

// ─── Side-effect: update entity rating_avg after a new rating ─────────────────

async function updateEntityRatingAvg(entityId: string, entityType: RatedEntityType) {
  try {
    const { avg, count } = await getEntityRatingStats(entityId, entityType)

    if (entityType === 'hub') {
      await supabase.from('hubs').update({ rating_avg: avg, rating_count: count }).eq('id', entityId)
    } else if (entityType === 'pro') {
      await supabase
        .from('pros')
        .update({ rating_avg: avg, rating_count: count })
        .eq('id', entityId)
    } else if (entityType === 'driver') {
      await supabase.from('drivers').update({ rating_avg: avg }).eq('id', entityId)
    }
  } catch {
    // Rating avg update is non-critical — log and continue
  }
}
