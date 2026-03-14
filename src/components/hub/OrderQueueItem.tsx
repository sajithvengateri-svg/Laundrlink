import { formatDistanceToNow } from 'date-fns'
import { Package, ChevronRight, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { OrderWithDetails } from '@/types/hub.types'
import { cn } from '@/lib/utils'

const STATUS_BADGE: Record<string, { label: string; variant: 'pending' | 'default' | 'success' | 'warning' | 'secondary' }> = {
  pending: { label: 'Pending', variant: 'pending' },
  pickup_scheduled: { label: 'Pickup Scheduled', variant: 'warning' },
  picked_up_by_driver: { label: 'In Transit', variant: 'warning' },
  at_hub: { label: 'At Hub', variant: 'default' },
  assigned_to_pro: { label: 'Assigned to Pro', variant: 'secondary' },
  with_pro: { label: 'With Pro', variant: 'secondary' },
  returned_to_hub: { label: 'Returned', variant: 'warning' },
  out_for_delivery: { label: 'Out for Delivery', variant: 'warning' },
  delivered: { label: 'Delivered', variant: 'success' },
}

interface OrderQueueItemProps {
  order: OrderWithDetails
  onClick?: () => void
}

export function OrderQueueItem({ order, onClick }: OrderQueueItemProps) {
  const badge = STATUS_BADGE[order.status ?? 'pending'] ?? { label: order.status ?? '', variant: 'secondary' as const }
  const customerName = order.customer?.full_name ?? 'Customer'
  const initials = customerName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const timeAgo = order.created_at
    ? formatDistanceToNow(new Date(order.created_at), { addSuffix: true })
    : ''

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors',
        !onClick && 'cursor-default'
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="bg-brand-blue/10 text-brand-blue text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm truncate">{order.order_number}</span>
          <Badge variant={badge.variant} className="text-xs shrink-0">
            {badge.label}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span className="truncate">{customerName}</span>
          {order.bags && order.bags.length > 0 && (
            <>
              <span>·</span>
              <Package className="h-3 w-3" />
              <span className="font-mono">{order.bags[0].qr_code}</span>
            </>
          )}
          {timeAgo && (
            <>
              <span>·</span>
              <span>{timeAgo}</span>
            </>
          )}
        </div>
      </div>

      {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </button>
  )
}
