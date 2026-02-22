import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminAnalytics } from '@/hooks/useAdmin'
import { formatCents } from '@/lib/utils'

function shortDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function GmvTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-indigo-600">{formatCents(payload[0].value)}</p>
    </div>
  )
}

function OrdersTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-amber-600">{payload[0].value} orders</p>
    </div>
  )
}

export function AdminAnalyticsPage() {
  const { data: analytics, isLoading } = useAdminAnalytics()

  // Merge all three series into one array for charts
  const gmvData = (analytics?.gmvByDay ?? []).map((d) => ({
    date: shortDate(d.date),
    gmv: d.value,
  }))
  const ordersData = (analytics?.ordersByDay ?? []).map((d) => ({
    date: shortDate(d.date),
    orders: d.value,
  }))
  const revenueData = (analytics?.revenueByDay ?? []).map((d) => ({
    date: shortDate(d.date),
    revenue: d.value,
  }))

  const totalGmv = analytics?.gmvByDay.reduce((s, d) => s + d.value, 0) ?? 0
  const totalOrders = analytics?.ordersByDay.reduce((s, d) => s + d.value, 0) ?? 0
  const totalRevenue = analytics?.revenueByDay.reduce((s, d) => s + d.value, 0) ?? 0

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Last 30 days</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <Skeleton className="h-7 w-24 mb-1" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xl font-bold text-indigo-600">{formatCents(totalGmv)}</p>
                <p className="text-xs text-gray-500">Total GMV</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xl font-bold text-amber-600">{totalOrders}</p>
                <p className="text-xs text-gray-500">Total Orders</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xl font-bold text-green-600">{formatCents(totalRevenue)}</p>
                <p className="text-xs text-gray-500">Platform Revenue</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* GMV chart */}
      <Card className="border-0 shadow-sm mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">GMV (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={gmvData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  interval={4}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip content={<GmvTooltip />} />
                <Line
                  type="monotone"
                  dataKey="gmv"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Orders chart */}
      <Card className="border-0 shadow-sm mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Orders Per Day (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ordersData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  interval={4}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip content={<OrdersTooltip />} />
                <Bar dataKey="orders" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Platform revenue chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Platform Revenue (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenueData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  interval={4}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip content={<GmvTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
