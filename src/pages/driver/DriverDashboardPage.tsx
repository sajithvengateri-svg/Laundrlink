import { useNavigate } from 'react-router-dom'
import { Car, DollarSign, Star, TrendingUp, Power, ChevronRight, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useDriverProfile,
  useDriverMetrics,
  useActiveJob,
  useDriverAvailability,
} from '@/hooks/useDriver'
import { formatCents } from '@/lib/utils'


export function DriverDashboardPage() {
  const navigate = useNavigate()
  const { data: driver, isLoading: profileLoading } = useDriverProfile()
  const { data: metrics, isLoading: metricsLoading } = useDriverMetrics()
  const { data: activeJob, isLoading: jobLoading } = useActiveJob()
  const availabilityMutation = useDriverAvailability()

  const isOnline = driver?.is_available ?? false

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-4">
      {/* Online / Offline toggle */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isOnline ? 'bg-green-100' : 'bg-gray-100'
              }`}
            >
              <Power className={`h-5 w-5 ${isOnline ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {isOnline ? 'You are Online' : 'You are Offline'}
              </p>
              <p className="text-xs text-gray-500">
                {isOnline ? 'Available for delivery runs' : 'Toggle to receive jobs'}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isOnline}
            disabled={availabilityMutation.isPending}
            onClick={() => availabilityMutation.mutate(!isOnline)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
              isOnline ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isOnline ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </CardContent>
      </Card>

      {/* Active run banner */}
      {jobLoading ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : activeJob ? (
        <Card
          className="rounded-2xl border-0 shadow-sm bg-indigo-600 cursor-pointer"
          onClick={() => navigate(`/driver/active/${activeJob.order_id}`)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <Badge className="bg-white/20 text-white border-0 mb-1">Active Run</Badge>
              <p className="font-semibold text-white">
                Order{' '}
                {(activeJob.order as { order_number?: string } | null)?.order_number ?? '—'}
              </p>
              <p className="text-indigo-200 text-sm capitalize">
                {activeJob.status?.replace(/_/g, ' ')}
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-white" />
          </CardContent>
        </Card>
      ) : isOnline ? (
        <Card className="rounded-2xl border-0 shadow-sm border-dashed border-2 border-gray-200 bg-white">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <Car className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-500">Waiting for a run…</p>
            <p className="text-xs text-gray-400 mt-1">
              You'll be notified when a job is assigned
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Verification warning */}
      {driver && !driver.is_verified && (
        <Card className="rounded-2xl border-0 shadow-sm bg-amber-50 border border-amber-200">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800 text-sm">Account pending verification</p>
              <p className="text-amber-700 text-xs mt-0.5">
                Your licence and police check are being reviewed. You'll be notified when approved.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's metrics */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
          Today
        </p>
        {metricsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={<Car className="h-5 w-5 text-indigo-600" />}
              label="Runs Today"
              value={String(metrics.runsToday)}
              bg="bg-indigo-50"
            />
            <MetricCard
              icon={<DollarSign className="h-5 w-5 text-green-600" />}
              label="Earned Today"
              value={formatCents(metrics.earningsToday)}
              bg="bg-green-50"
            />
            <MetricCard
              icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
              label="This Week"
              value={formatCents(metrics.earningsThisWeek)}
              bg="bg-blue-50"
            />
            <MetricCard
              icon={<Star className="h-5 w-5 text-amber-500" />}
              label="Rating"
              value={metrics.ratingAvg > 0 ? metrics.ratingAvg.toFixed(1) : '—'}
              bg="bg-amber-50"
            />
          </div>
        ) : null}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-14 rounded-2xl flex-col gap-1"
          onClick={() => navigate('/driver/scan')}
        >
          <span className="text-lg">📷</span>
          <span className="text-xs">Manual Scan</span>
        </Button>
        <Button
          variant="outline"
          className="h-14 rounded-2xl flex-col gap-1"
          onClick={() => navigate('/driver/earnings')}
        >
          <span className="text-lg">💰</span>
          <span className="text-xs">Earnings</span>
        </Button>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode
  label: string
  value: string
  bg: string
}) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className={`p-4 ${bg} rounded-2xl`}>
        <div className="flex items-center gap-2 mb-2">{icon}</div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  )
}
