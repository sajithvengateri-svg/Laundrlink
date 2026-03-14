import { useNavigate } from 'react-router-dom'
import { Package, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useHub, useHubQueue } from '@/hooks/useHub'
import { formatDate, formatCents } from '@/lib/utils'

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'pending' | 'destructive'> = {
  pending: 'pending',
  pickup_scheduled: 'warning',
  picked_up_by_driver: 'warning',
  at_hub: 'default',
  with_pro: 'secondary',
  returned_to_hub: 'success',
  out_for_delivery: 'warning',
  delivered: 'success',
  cancelled: 'destructive',
}

export function HubOrdersPage() {
  const navigate = useNavigate()
  const { data: hub, isLoading: hubLoading } = useHub()
  const { data: orders, isLoading: ordersLoading } = useHubQueue(hub?.id ?? '')

  const isLoading = hubLoading || ordersLoading

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!hub) {
    return (
      <div className="p-4 text-center py-16 text-muted-foreground text-sm">
        Hub not set up yet.
      </div>
    )
  }

  const orderList = orders ?? []

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">Hub Orders</h1>
        <p className="text-sm text-muted-foreground">
          {orderList.length} order{orderList.length !== 1 ? 's' : ''} assigned to {hub.business_name}
        </p>
      </div>

      {orderList.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center">
            <Package className="h-12 w-12 text-gray-300 mb-3" />
            <p className="font-medium text-gray-600">No orders yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Orders assigned to this hub will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orderList.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{order.order_number}</p>
                      <Badge variant={STATUS_BADGE[order.status ?? ''] ?? 'secondary'} className="capitalize text-[10px]">
                        {(order.status ?? 'pending').replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {order.customer?.full_name ?? 'Customer'} — {order.created_at ? formatDate(order.created_at) : ''}
                    </p>
                    {order.total_cents != null && (
                      <p className="text-xs text-muted-foreground">
                        Total: <span className="font-medium text-foreground">{formatCents(order.total_cents)}</span>
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => navigate(`/hub/orders/${order.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
