import { useQuery } from '@tanstack/react-query'
import { Bell, MessageSquare, Mail, Smartphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getAdminNotifications,
  getAdminNotificationStats,
} from '@/services/notification.service'
import { formatDate } from '@/lib/utils'

const CHANNEL_CONFIG: Record<string, { label: string; icon: typeof Bell; color: string }> = {
  in_app: { label: 'In-App', icon: Bell, color: 'text-brand-blue bg-blue-50' },
  sms: { label: 'SMS', icon: Smartphone, color: 'text-green-600 bg-green-50' },
  email: { label: 'Email', icon: Mail, color: 'text-purple-600 bg-purple-50' },
}

const EMAIL_TEMPLATES = [
  {
    id: 'order-confirmation',
    subject: 'Your LaundrLink order is confirmed!',
    trigger: 'Order placed successfully',
    vars: ['customer_name', 'order_number', 'hub_name', 'pickup_date', 'total'],
  },
  {
    id: 'order-delivered',
    subject: 'Your laundry has been delivered!',
    trigger: 'Order status → delivered',
    vars: ['customer_name', 'order_number', 'rating_url'],
  },
  {
    id: 'pro-job-assigned',
    subject: 'New job assigned to you',
    trigger: 'Order assigned to Laundry Pro',
    vars: ['pro_name', 'order_number', 'hub_name', 'item_count'],
  },
  {
    id: 'ndis-invoice-ready',
    subject: 'Your NDIS invoice is ready',
    trigger: 'NDIS invoice PDF generated',
    vars: ['participant_name', 'invoice_number', 'invoice_url', 'amount'],
  },
  {
    id: 'welcome',
    subject: 'Welcome to LaundrLink!',
    trigger: 'New user registration',
    vars: ['user_name', 'role', 'dashboard_url'],
  },
]

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string
  value: number
  icon: typeof Bell
  color: string
  loading: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-6 w-10 mb-0.5" />
          ) : (
            <p className="text-xl font-bold">{value}</p>
          )}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminNotificationsPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminNotifStats'],
    queryFn: getAdminNotificationStats,
    refetchInterval: 60_000,
  })
  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ['adminNotifications'],
    queryFn: () => getAdminNotifications(50),
    refetchInterval: 30_000,
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform-wide notification activity and email templates</p>
      </div>

      {/* Today stats */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Today's Activity</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Sent" value={stats?.totalToday ?? 0} icon={Bell} color="text-gray-600 bg-gray-100" loading={statsLoading} />
          <StatCard label="In-App" value={stats?.inAppToday ?? 0} icon={Bell} color="text-brand-blue bg-blue-50" loading={statsLoading} />
          <StatCard label="SMS" value={stats?.smsToday ?? 0} icon={Smartphone} color="text-green-600 bg-green-50" loading={statsLoading} />
          <StatCard label="Email" value={stats?.emailToday ?? 0} icon={Mail} color="text-purple-600 bg-purple-50" loading={statsLoading} />
        </div>
      </div>

      {/* Recent notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {recentLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
            </div>
          ) : !recent || recent.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No notifications sent yet</p>
          ) : (
            <div className="divide-y text-sm">
              <div className="grid grid-cols-[1fr_120px_100px_130px] gap-3 pb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span>Title</span>
                <span>Type</span>
                <span>Channel</span>
                <span>Sent</span>
              </div>
              {recent.map((n) => {
                const ch = CHANNEL_CONFIG[n.channel] ?? CHANNEL_CONFIG['in_app']
                const ChIcon = ch.icon
                return (
                  <div key={n.id} className="grid grid-cols-[1fr_120px_100px_130px] gap-3 py-2.5 items-center">
                    <div className="min-w-0">
                      <p className="font-medium truncate text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-400 truncate">{n.body}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs w-fit capitalize">
                      {n.type.replace(/_/g, ' ')}
                    </Badge>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${ch.color}`}>
                      <ChIcon className="h-3 w-3" />
                      {ch.label}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(n.created_at)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email template reference */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          <MessageSquare className="inline h-4 w-4 mr-1" />
          Email Templates
        </h2>
        <div className="space-y-3">
          {EMAIL_TEMPLATES.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono text-xs text-brand-blue bg-blue-50 px-2 py-0.5 rounded">
                        {t.id}
                      </p>
                      <p className="text-xs text-gray-500">Trigger: {t.trigger}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">{t.subject}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.vars.map((v) => (
                        <span key={v} className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">Resend</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
