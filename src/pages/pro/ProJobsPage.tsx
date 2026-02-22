import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Package, ChevronRight, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProActiveJobs, useProCompletedJobs } from '@/hooks/usePro'
import { formatCents } from '@/lib/utils'

function oneWeekAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

export function ProJobsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'active' | 'completed'>('active')

  const { data: activeJobs, isLoading: activeLoading } = useProActiveJobs()
  const { data: completedJobs, isLoading: completedLoading } = useProCompletedJobs(oneWeekAgo())

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">My Jobs</h1>
        <p className="text-sm text-gray-500">Orders assigned to you</p>
      </div>

      <div className="p-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'completed')}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="active" className="flex-1">
              Active
              {(activeJobs?.length ?? 0) > 0 && (
                <span className="ml-1.5 bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5">
                  {activeJobs!.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">Completed</TabsTrigger>
          </TabsList>

          {/* Active jobs */}
          <TabsContent value="active" className="space-y-3">
            {activeLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="rounded-2xl">
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))
            ) : (activeJobs?.length ?? 0) === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-indigo-300" />
                </div>
                <h2 className="text-base font-semibold text-gray-700 mb-1">No active jobs</h2>
                <p className="text-sm text-gray-400">
                  Go online from your dashboard to receive job assignments.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/pro')}
                >
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              activeJobs!.map((job) => (
                <Card key={job.id} className="rounded-2xl border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          Order #{job.order_number}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {(job.hub as { business_name?: string } | undefined | null)?.business_name ?? 'Hub'}
                        </p>
                      </div>
                      <Badge
                        className={
                          job.status === 'with_pro'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }
                      >
                        {job.status === 'with_pro' ? 'In Progress' : 'Awaiting Pickup'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        <span>{job.bags?.length ?? 0} bag{(job.bags?.length ?? 0) !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(job.created_at!).toLocaleDateString()}</span>
                      </div>
                      {job.pro_payout_cents != null && (
                        <span className="ml-auto font-semibold text-indigo-600">
                          {formatCents(job.pro_payout_cents)}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {job.status === 'assigned_to_pro' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-xl"
                          onClick={() => navigate('/pro/scan')}
                        >
                          Scan to Receive
                        </Button>
                      )}
                      {job.status === 'with_pro' && (
                        <Button
                          size="sm"
                          className="flex-1 rounded-xl"
                          onClick={() => navigate('/pro/scan')}
                        >
                          Scan to Return
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-3 rounded-xl"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Completed jobs */}
          <TabsContent value="completed" className="space-y-3">
            {completedLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="rounded-2xl">
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </CardContent>
                </Card>
              ))
            ) : (completedJobs?.length ?? 0) === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center text-center">
                <CheckCircle className="h-12 w-12 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">No completed jobs this week</p>
              </div>
            ) : (
              completedJobs!.map((job) => (
                <Card key={job.id} className="rounded-2xl border-0 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        Order #{job.order_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(job.hub as { business_name?: string } | undefined | null)?.business_name ?? 'Hub'} ·{' '}
                        {new Date(job.updated_at!).toLocaleDateString()}
                      </p>
                    </div>
                    {job.pro_payout_cents != null && (
                      <p className="text-sm font-semibold text-indigo-600">
                        {formatCents(job.pro_payout_cents)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
