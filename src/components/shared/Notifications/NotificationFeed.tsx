import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifications'
import type { AppNotification } from '@/services/notification.service'
import { formatRelative } from '@/lib/utils'

const TYPE_ICONS: Record<string, string> = {
  ndis_invoice_ready: '📄',
  order_status_update: '📦',
  order_delivered: '✅',
  order_pickup_scheduled: '🚐',
  pro_job_assigned: '🧺',
  payment_received: '💳',
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: AppNotification
  onRead: (id: string) => void
}) {
  const navigate = useNavigate()

  function handleClick() {
    if (!notification.is_read) onRead(notification.id)
    if (notification.order_id) navigate(`/orders/${notification.order_id}`)
  }

  return (
    <button
      onClick={handleClick}
      className={[
        'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-muted/60',
        !notification.is_read ? 'bg-brand-blue/5' : '',
      ].join(' ')}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-base">
        {TYPE_ICONS[notification.type] ?? '🔔'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={['text-sm leading-snug', !notification.is_read ? 'font-semibold' : 'font-medium'].join(' ')}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="mt-1 shrink-0 w-2 h-2 rounded-full bg-brand-blue" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.body}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {formatRelative(notification.created_at)}
        </p>
      </div>
    </button>
  )
}

interface NotificationFeedProps {
  onClose?: () => void
}

export function NotificationFeed({ onClose: _onClose }: NotificationFeedProps) {
  const { data: notifications, isLoading } = useNotifications(30)
  const { mutate: markRead } = useMarkAsRead()
  const { mutate: markAll, isPending: markingAll } = useMarkAllAsRead()

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Notifications</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-brand-blue text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={() => markAll()}
            disabled={markingAll}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <Package className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground/60">
              Order updates, invoice alerts and more will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={(id) => markRead(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
