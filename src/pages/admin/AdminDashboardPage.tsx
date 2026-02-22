import { TrendingUp, Users, Package, ShoppingBag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminKpis } from '@/hooks/useAdmin'
import { formatCents } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
  bg: string
}

function KpiCard({ label, value, sub, icon: Icon, color, bg }: KpiCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminDashboardPage() {
  const { data: kpis, isLoading } = useAdminKpis()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform overview</p>
      </div>

      {/* User counts */}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Users
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <KpiCard
              label="Customers"
              value={String(kpis?.totalCustomers ?? 0)}
              icon={Users}
              color="text-indigo-600"
              bg="bg-indigo-50"
            />
            <KpiCard
              label="Hubs"
              value={String(kpis?.totalHubs ?? 0)}
              icon={Package}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <KpiCard
              label="Laundry Pros"
              value={String(kpis?.totalPros ?? 0)}
              icon={Users}
              color="text-violet-600"
              bg="bg-violet-50"
            />
            <KpiCard
              label="Drivers"
              value={String(kpis?.totalDrivers ?? 0)}
              icon={Users}
              color="text-sky-600"
              bg="bg-sky-50"
            />
          </>
        )}
      </div>

      {/* Revenue */}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Revenue
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <KpiCard
              label="Orders Today"
              value={String(kpis?.ordersToday ?? 0)}
              icon={ShoppingBag}
              color="text-amber-600"
              bg="bg-amber-50"
            />
            <KpiCard
              label="GMV Today"
              value={formatCents(kpis?.gmvToday ?? 0)}
              icon={TrendingUp}
              color="text-green-600"
              bg="bg-green-50"
            />
            <KpiCard
              label="GMV This Month"
              value={formatCents(kpis?.gmvThisMonth ?? 0)}
              icon={TrendingUp}
              color="text-green-600"
              bg="bg-green-50"
            />
            <KpiCard
              label="Platform Revenue"
              value={formatCents(kpis?.platformRevenueThisMonth ?? 0)}
              sub="This month"
              icon={TrendingUp}
              color="text-indigo-600"
              bg="bg-indigo-50"
            />
          </>
        )}
      </div>
    </div>
  )
}
