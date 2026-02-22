import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useHub } from '@/hooks/useHub'
import { useHubDailyOrders, useHubWeeklyRevenue } from '@/hooks/useAnalytics'
import { usePayoutSummary } from '@/hooks/usePayout'
import { formatCents } from '@/lib/utils'

function centsLabel(value: number) {
  return `$${(value / 100).toFixed(0)}`
}

export function HubAnalyticsPage() {
  const { data: hub, isLoading: hubLoading } = useHub()
  const { data: dailyOrders, isLoading: dailyLoading } = useHubDailyOrders(hub?.id, 14)
  const { data: weeklyRevenue, isLoading: revenueLoading } = useHubWeeklyRevenue(8)
  const { data: summary, isLoading: summaryLoading } = usePayoutSummary('hub')

  const peakDay = dailyOrders
    ? [...dailyOrders].sort((a, b) => b.count - a.count)[0]
    : null
  const avgDaily =
    dailyOrders && dailyOrders.length > 0
      ? (dailyOrders.reduce((s, d) => s + d.count, 0) / dailyOrders.length).toFixed(1)
      : '—'

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        {hubLoading ? (
          <Skeleton className="h-6 w-40" />
        ) : (
          <h1 className="text-xl font-bold text-gray-900">{hub?.business_name ?? 'Hub'} Analytics</h1>
        )}
        <p className="text-sm text-gray-500">Order volume and revenue trends</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {summaryLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-3"><Skeleton className="h-7 w-14 mb-1" /><Skeleton className="h-3 w-16" /></CardContent></Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-3">
                  <p className="text-lg font-bold text-brand-blue">
                    {formatCents(summary?.thisMonthEarned ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">This Month</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-lg font-bold">{avgDaily}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Avg/Day (14d)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-lg font-bold">{peakDay?.count ?? '—'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Peak Day</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Daily order volume */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Daily Orders — Last 14 Days</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {dailyLoading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={192}>
                <BarChart data={dailyOrders} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#888' }}
                    axisLine={false}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#888' }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                  />
                  <Tooltip
                    formatter={(v: number | undefined) => [v ?? 0, 'Orders']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="count" fill="#007AFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Weekly revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Weekly Revenue — Last 8 Weeks</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {revenueLoading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={192}>
                <LineChart data={weeklyRevenue} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 10, fill: '#888' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={centsLabel}
                    tick={{ fontSize: 10, fill: '#888' }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    formatter={(v: number | undefined) => [formatCents(v ?? 0), 'Revenue']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#00C7BE"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#00C7BE' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Capacity note */}
        {hub && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Capacity</p>
                <p className="text-xs text-muted-foreground">
                  {hub.current_load ?? 0} / {hub.capacity ?? 50} bags currently
                </p>
              </div>
              <div className="w-24">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-brand-blue h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.round(((hub.current_load ?? 0) / (hub.capacity ?? 50)) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right mt-1">
                  {Math.round(((hub.current_load ?? 0) / (hub.capacity ?? 50)) * 100)}%
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
