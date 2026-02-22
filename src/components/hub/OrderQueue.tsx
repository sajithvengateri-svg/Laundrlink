import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { OrderQueueItem } from './OrderQueueItem'
import { useHubQueue } from '@/hooks/useHub'
import { Package } from 'lucide-react'

interface OrderQueueProps {
  hubId: string
  onOrderClick?: (orderId: string) => void
}

export function OrderQueue({ hubId, onOrderClick }: OrderQueueProps) {
  const { data: orders, isLoading, error } = useHubQueue(hubId)

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Failed to load orders. Pull to refresh.
      </Card>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <Card className="p-10 flex flex-col items-center gap-3 text-muted-foreground">
        <Package className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">No active orders</p>
        <p className="text-xs text-center">Orders will appear here in real-time as they are created.</p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden divide-y divide-gray-100">
      {orders.map((order) => (
        <OrderQueueItem
          key={order.id}
          order={order}
          onClick={onOrderClick ? () => onOrderClick(order.id) : undefined}
        />
      ))}
    </Card>
  )
}
