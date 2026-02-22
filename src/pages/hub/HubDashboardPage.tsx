import { useNavigate } from 'react-router-dom'
import { Package, Star, QrCode, BarChart2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderQueue } from '@/components/hub/OrderQueue'
import { CapacityWidget } from '@/components/hub/CapacityWidget'
import { useHub, useHubMetrics } from '@/hooks/useHub'
import { useAuthStore } from '@/stores/authStore'

export default function HubDashboardPage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const { data: hub, isLoading: hubLoading } = useHub()
  const { data: metrics, isLoading: metricsLoading } = useHubMetrics(hub?.id ?? '')

  const isLoading = hubLoading || metricsLoading

  if (!hub && !hubLoading) {
    return (
      <div className="p-4 flex flex-col items-center gap-4 text-center py-16">
        <Package className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="font-semibold text-lg">Hub Not Set Up</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your hub profile hasn't been created yet. Complete your hub onboarding to get started.
        </p>
        <Button onClick={() => navigate('/hub/settings')}>Set Up Hub</Button>
      </div>
    )
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div>
        {isLoading ? (
          <Skeleton className="h-6 w-48" />
        ) : (
          <h1 className="text-xl font-bold">{hub?.business_name ?? 'My Hub'}</h1>
        )}
        <p className="text-sm text-muted-foreground">
          Good {greeting}, {profile?.full_name?.split(' ')[0]}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground">Today</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {metricsLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold">{metrics?.totalOrdersToday ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground">orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {metricsLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold text-brand-amber">{metrics?.pendingOrders ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground">need action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground">Rating</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {metricsLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="flex items-center gap-1">
                <p className="text-2xl font-bold">{metrics?.averageRating?.toFixed(1) ?? '—'}</p>
                <Star className="h-4 w-4 text-brand-amber fill-brand-amber mt-1" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">avg rating</p>
          </CardContent>
        </Card>
      </div>

      {hub && (
        <CapacityWidget
          used={metrics?.capacityUsed ?? 0}
          max={metrics?.capacityMax ?? 50}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button className="w-full" size="lg" onClick={() => navigate('/hub/scan')}>
          <QrCode className="h-5 w-5 mr-2" />
          Scan Bag
        </Button>
        <Button variant="outline" className="w-full" size="lg" onClick={() => navigate('/hub/analytics')}>
          <BarChart2 className="h-5 w-5 mr-2" />
          Analytics
        </Button>
      </div>

      <div>
        <h2 className="font-semibold text-base mb-2 flex items-center gap-2">
          <Package className="h-4 w-4" />
          Active Orders
        </h2>
        {hub ? (
          <OrderQueue
            hubId={hub.id}
            onOrderClick={(id) => navigate(`/hub/orders/${id}`)}
          />
        ) : (
          <Skeleton className="h-40 rounded-xl" />
        )}
      </div>
    </div>
  )
}
