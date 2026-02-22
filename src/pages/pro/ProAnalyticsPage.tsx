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
import { useProProfile, useProMetrics } from '@/hooks/usePro'
import { useProWeeklyJobs, useProWeeklyEarnings } from '@/hooks/useAnalytics'
import { formatCents } from '@/lib/utils'

function centsLabel(value: number) {
  return `$${(value / 100).toFixed(0)}`
}

export function ProAnalyticsPage() {
  const { data: pro, isLoading: proLoading } = useProProfile()
  const { data: metrics, isLoading: metricsLoading } = useProMetrics()
  const { data: weeklyJobs, isLoading: jobsLoading } = useProWeeklyJobs(pro?.id, 8)
  const { data: weeklyEarnings, isLoading: earningsLoading } = useProWeeklyEarnings(8)

  const totalJobsLast8Weeks = weeklyJobs?.reduce((s, w) => s + w.value, 0) ?? 0
  const avgJobsPerWeek =
    weeklyJobs && weeklyJobs.length > 0
      ? (totalJobsLast8Weeks / weeklyJobs.length).toFixed(1)
      : '—'

  const ratingDisplay = metrics?.ratingAvg
    ? `${metrics.ratingAvg.toFixed(1)} ★`
    : '—'

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">My Analytics</h1>
        <p className="text-sm text-gray-500">Job trends and earnings over time</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {metricsLoading || proLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-3"><Skeleton className="h-7 w-14 mb-1" /><Skeleton className="h-3 w-16" /></CardContent></Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-3">
                  <p className="text-lg font-bold text-indigo-600">{metrics?.totalOrders ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total Jobs</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-lg font-bold text-indigo-600">{avgJobsPerWeek}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Jobs/Week (8w)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-lg font-bold text-indigo-600">{ratingDisplay}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Avg Rating</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Weekly jobs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Jobs Completed — Last 8 Weeks</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {jobsLoading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={192}>
                <BarChart data={weeklyJobs} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 10, fill: '#888' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#888' }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                  />
                  <Tooltip
                    formatter={(v: number | undefined) => [v ?? 0, 'Jobs']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Weekly earnings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Weekly Earnings — Last 8 Weeks</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {earningsLoading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={192}>
                <LineChart data={weeklyEarnings} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
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
                    formatter={(v: number | undefined) => [formatCents(v ?? 0), 'Earned']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#6366f1' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tier summary */}
        {!proLoading && pro?.tier && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium capitalize">{pro.tier} Pro</p>
                <p className="text-xs text-muted-foreground">
                  {metrics?.ratingAvg ? `${metrics.ratingAvg.toFixed(1)} ★ avg rating` : 'No ratings yet'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-indigo-600">
                  {formatCents(metrics?.earningsThisWeek ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">this week</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
