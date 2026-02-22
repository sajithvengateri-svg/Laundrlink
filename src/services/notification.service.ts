import { supabase } from '@/lib/supabase'

export interface AppNotification {
  id: string
  profile_id: string
  type: string
  title: string
  body: string
  channel: string
  order_id: string | null
  is_read: boolean
  created_at: string
}

export async function getNotifications(
  profileId: string,
  limit = 30
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as AppNotification[]
}

export async function getUnreadCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('is_read', false)

  if (error) throw error
  return count ?? 0
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) throw error
}

export async function markAllAsRead(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('profile_id', profileId)
    .eq('is_read', false)

  if (error) throw error
}

/** Admin: fetch notifications across all profiles (requires admin RLS bypass). */
export async function getAdminNotifications(limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as AppNotification[]
}

export async function getAdminNotificationStats(): Promise<{
  totalToday: number
  inAppToday: number
  smsToday: number
  emailToday: number
}> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('notifications')
    .select('channel')
    .gte('created_at', startOfDay.toISOString())

  if (error) throw error

  const rows = data ?? []
  return {
    totalToday: rows.length,
    inAppToday: rows.filter((r) => r.channel === 'in_app').length,
    smsToday: rows.filter((r) => r.channel === 'sms').length,
    emailToday: rows.filter((r) => r.channel === 'email').length,
  }
}
