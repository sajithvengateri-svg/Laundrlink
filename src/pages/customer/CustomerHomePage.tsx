import { useNavigate } from 'react-router-dom'
import { Plus, Package, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCustomerOrders } from '@/hooks/useOrder'
import { useAuthStore } from '@/stores/authStore'
import { formatCents, formatRelative } from '@/lib/utils'
import { LoyaltyWidget } from '@/components/customer/LoyaltyWidget'
import { ReferralWidget } from '@/components/customer/ReferralWidget'

const STATUS_BADGE: Record<string, { label: string; variant: 'pending' | 'default' | 'success' | 'warning' | 'secondary' }> = {
  pending: { label: 'Pending', variant: 'pending' },
  pickup_scheduled: { label: 'Pickup Scheduled', variant: 'warning' },
  picked_up_by_driver: { label: 'Picked Up', variant: 'warning' },
  at_hub: { label: 'At Hub', variant: 'default' },
  assigned_to_pro: { label: 'Being Washed', variant: 'secondary' },
  with_pro: { label: 'Being Washed', variant: 'secondary' },
  returned_to_hub: { label: 'Ready for Delivery', variant: 'warning' },
  out_for_delivery: { label: 'Out for Delivery', variant: 'warning' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
}

export function CustomerHomePage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const { data: orders, isLoading } = useCustomerOrders()

  const activeOrders = orders?.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  ) ?? []
  const pastOrders = orders?.filter(
    (o) => o.status === 'delivered' || o.status === 'cancelled'
  ) ?? []

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Hi {profile?.full_name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-muted-foreground">Fresh laundry, delivered.</p>
        </div>
        <Button onClick={() => navigate('/orders/new')} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Order
        </Button>
      </div>

      {/* Loyalty + Referral widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LoyaltyWidget />
        <ReferralWidget />
      </div>

      {/* Active orders */}
      <div>
        <h2 className="font-semibold mb-2 flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          Active Orders
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : activeOrders.length === 0 ? (
          <Card className="p-8 flex flex-col items-center gap-3 text-center">
            <Package className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No active orders</p>
            <Button onClick={() => navigate('/orders/new')}>Place your first order</Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {activeOrders.map((order) => {
              const badge = STATUS_BADGE[order.status ?? 'pending'] ?? { label: order.status ?? '', variant: 'secondary' as const }
              return (
                <Card
                  key={order.id}
                  className="cursor-pointer hover:border-brand-blue transition-colors"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <CardContent className="py-3 px-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{order.order_number}</span>
                        <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.hub?.business_name ?? 'Hub TBC'} · {formatCents(order.total_cents ?? 0)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {order.created_at ? formatRelative(order.created_at) : ''}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Past orders (compact) */}
      {pastOrders.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2 flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4" />
            Recent History
          </h2>
          <div className="space-y-2">
            {pastOrders.slice(0, 3).map((order) => (
              <Card
                key={order.id}
                className="cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <CardContent className="py-2.5 px-4 flex items-center justify-between">
                  <span className="text-sm font-medium">{order.order_number}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatCents(order.total_cents ?? 0)}</span>
                    <Badge variant={order.status === 'delivered' ? 'success' : 'secondary'} className="text-xs">
                      {order.status === 'delivered' ? 'Delivered' : 'Cancelled'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {pastOrders.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => navigate('/orders/history')}
              >
                View all {pastOrders.length} past orders
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
