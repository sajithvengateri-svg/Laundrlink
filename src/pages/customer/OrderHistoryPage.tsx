import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, Search, Package, TrendingUp } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCustomerOrders } from '@/hooks/useOrder'
import { useCustomerStats, useCustomerMonthlySpending } from '@/hooks/useAnalytics'
import { formatCents, formatRelative } from '@/lib/utils'

const SERVICE_LABELS: Record<string, string> = {
  wash_fold: 'Wash & Fold',
  dry_clean: 'Dry Clean',
  iron: 'Ironing',
  specialist: 'Specialist',
}

function centsLabel(value: number) {
  return `$${(value / 100).toFixed(0)}`
}

export function OrderHistoryPage() {
  const navigate = useNavigate()
  const { data: orders, isLoading } = useCustomerOrders()
  const { data: stats, isLoading: statsLoading } = useCustomerStats()
  const { data: spending, isLoading: spendingLoading } = useCustomerMonthlySpending(6)
  const [search, setSearch] = useState('')

  const pastOrders = orders?.filter(
    (o) => o.status === 'delivered' || o.status === 'cancelled'
  ) ?? []

  const filtered = pastOrders.filter((o) =>
    search === '' ||
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.hub?.business_name?.toLowerCase().includes(search.toLowerCase())
  )

  const hasSpendingData = spending?.some((m) => m.total > 0)

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Order History</h1>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {statsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-3"><Skeleton className="h-8 w-16 mb-1" /><Skeleton className="h-3 w-14" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-3">
                <p className="text-xl font-bold text-brand-blue">{formatCents(stats?.totalSpent ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total Spent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xl font-bold">{stats?.deliveredOrders ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xl font-bold">{formatCents(stats?.avgOrderValue ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Avg Order</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Favourite hub */}
      {stats?.favouriteHub && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5" />
          Favourite hub: <span className="font-medium text-foreground">{stats.favouriteHub}</span>
        </p>
      )}

      {/* Monthly spending chart */}
      {(spendingLoading || hasSpendingData) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Spending</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {spendingLoading ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={spending} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#888' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={centsLabel}
                    tick={{ fontSize: 10, fill: '#888' }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [formatCents(value ?? 0), 'Spent']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#007AFF"
                    strokeWidth={2}
                    fill="url(#spendGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      {!isLoading && pastOrders.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number or hub…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Order list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 flex flex-col items-center gap-3 text-center">
          <Package className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {search ? 'No orders match your search.' : 'No past orders yet.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:border-brand-blue transition-colors"
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <CardContent className="py-3 px-4 flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {order.status === 'delivered' ? (
                    <CheckCircle className="h-5 w-5 text-brand-teal" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{order.order_number}</span>
                    <Badge
                      variant={order.status === 'delivered' ? 'success' : 'secondary'}
                      className="text-xs"
                    >
                      {order.status === 'delivered' ? 'Delivered' : 'Cancelled'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.hub?.business_name ?? 'Hub TBC'}
                    {order.service_type
                      ? ` · ${SERVICE_LABELS[order.service_type] ?? order.service_type}`
                      : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium">{formatCents(order.total_cents ?? 0)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.created_at ? formatRelative(order.created_at) : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && pastOrders.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          {filtered.length} of {pastOrders.length} order{pastOrders.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
