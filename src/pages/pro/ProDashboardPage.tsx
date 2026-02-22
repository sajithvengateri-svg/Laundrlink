import { useNavigate } from 'react-router-dom'
import { AlertCircle, Briefcase, ScanLine, DollarSign, Star, BarChart2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useProProfile, useProMetrics, useProAvailability, useProActiveJobs } from '@/hooks/usePro'
import { useAuthStore } from '@/stores/authStore'
import { formatCents } from '@/lib/utils'

export function ProDashboardPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { data: pro, isLoading: proLoading } = useProProfile()
  const { data: metrics, isLoading: metricsLoading } = useProMetrics()
  const { data: activeJobs } = useProActiveJobs()
  const { isAvailable, toggle, isPending } = useProAvailability()

  const isOnboarded =
    pro?.quiz_passed &&
    pro?.pledge_signed &&
    pro?.police_check_status !== 'not_submitted' &&
    pro?.police_check_status != null

  const firstActiveJob = activeJobs?.[0]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Hey, {profile?.full_name?.split(' ')[0] ?? 'Pro'} 👋
            </h1>
            <p className="text-sm text-gray-500">Laundry Pro Dashboard</p>
          </div>

          {/* Online / Offline toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{isAvailable ? 'Online' : 'Offline'}</span>
            <button
              role="switch"
              aria-checked={isAvailable}
              onClick={() => toggle(!isAvailable)}
              disabled={isPending}
              className={[
                'relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none',
                isAvailable ? 'bg-green-500' : 'bg-gray-300',
                isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                  isAvailable ? 'translate-x-6' : 'translate-x-1',
                ].join(' ')}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Onboarding incomplete warning */}
        {!proLoading && !isOnboarded && (
          <Card className="rounded-2xl border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">Onboarding incomplete</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Complete setup to start receiving jobs.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => navigate('/pro/onboarding')}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Police check pending */}
        {pro?.police_check_status === 'pending' && (
          <Card className="rounded-2xl border-indigo-200 bg-indigo-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-indigo-500 flex-shrink-0" />
              <p className="text-sm text-indigo-700">
                Background check in progress — typically 1–3 business days.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Active job banner */}
        {firstActiveJob && (
          <Card className="rounded-2xl bg-indigo-600 text-white border-0 shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-indigo-200 text-xs font-medium uppercase tracking-wide">
                  Active Job
                </p>
                <p className="text-white font-bold text-lg mt-0.5">
                  Order #{firstActiveJob.order_number}
                </p>
                <p className="text-indigo-200 text-sm mt-0.5">
                  {firstActiveJob.status === 'assigned_to_pro'
                    ? 'Awaiting bag pickup from hub'
                    : 'In progress — washing'}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-xl"
                onClick={() => navigate('/pro/jobs')}
              >
                View
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          {metricsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-4">
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-indigo-600">{metrics?.jobsToday ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Jobs Today</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-indigo-600">
                    {formatCents(metrics?.earningsToday ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Earned Today</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-indigo-600">
                    {metrics?.ratingAvg ? metrics.ratingAvg.toFixed(1) : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Avg Rating</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-indigo-600">
                    {metrics?.totalOrders ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Total Orders</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Tier badge */}
        {pro?.tier && (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Star className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-gray-800 capitalize">{pro.tier} Pro</p>
                <p className="text-xs text-gray-500">
                  {pro.tier === 'rookie'
                    ? `${Math.max(0, 50 - (metrics?.totalOrders ?? 0))} orders to Elite`
                    : pro.tier === 'elite'
                    ? `${Math.max(0, 200 - (metrics?.totalOrders ?? 0))} orders to Legendary`
                    : 'Top tier — Legendary!'}
                </p>
              </div>
              <Badge
                className={[
                  'ml-auto capitalize',
                  pro.tier === 'legendary'
                    ? 'bg-purple-100 text-purple-700'
                    : pro.tier === 'elite'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600',
                ].join(' ')}
              >
                {pro.tier}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Jobs', icon: Briefcase, path: '/pro/jobs' },
            { label: 'Scan', icon: ScanLine, path: '/pro/scan' },
            { label: 'Earnings', icon: DollarSign, path: '/pro/earnings' },
            { label: 'Analytics', icon: BarChart2, path: '/pro/analytics' },
          ].map(({ label, icon: Icon, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Icon className="h-5 w-5 text-indigo-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
