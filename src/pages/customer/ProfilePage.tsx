import { useNavigate } from 'react-router-dom'
import { LogOut, Gift, Users, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { useLoyaltyProfile, useLoyaltyTransactions, useReferralStats } from '@/hooks/useLoyalty'
import { TIER_CONFIG } from '@/types/loyalty.types'

function PointsBadge({ points }: { points: number }) {
  if (points > 0) return <span className="text-green-600">+{points}</span>
  return <span className="text-red-500">{points}</span>
}

export function ProfilePage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const { signOut } = useAuth()
  const { data: loyalty, isLoading: loyaltyLoading } = useLoyaltyProfile()
  const { data: transactions, isLoading: txLoading } = useLoyaltyTransactions()
  const { data: referralStats } = useReferralStats()

  const tier = loyalty?.tier ?? 'bronze'
  const tierConf = TIER_CONFIG[tier]

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-24">
      {/* Profile header */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-xl font-bold text-indigo-600 shrink-0">
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {profile?.full_name ?? 'Customer'}
            </p>
            <p className="text-xs text-gray-400">{profile?.phone ?? '—'}</p>
            {!loyaltyLoading && (
              <span
                className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${tierConf.bg} ${tierConf.color}`}
              >
                {tierConf.label} Member
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loyalty summary */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Gift className="h-4 w-4 text-indigo-500" />
            Loyalty Points
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loyaltyLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold text-indigo-600">
                {(loyalty?.points ?? 0).toLocaleString()}
                <span className="text-sm font-normal text-gray-400 ml-1">pts</span>
              </p>
              <p className="text-xs text-gray-400 mb-1">
                ≈ ${Math.floor((loyalty?.points ?? 0) / 100).toFixed(0)} redemption value
              </p>
            </div>
          )}

          {/* Tier progress */}
          {!loyaltyLoading && tierConf.nextTier && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{tierConf.label}</span>
                <span>{TIER_CONFIG[tierConf.nextTier].label}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-indigo-500"
                  style={{
                    width: `${Math.min(100, Math.round((((loyalty?.points ?? 0) - tierConf.minPoints) / (tierConf.nextMinPoints! - tierConf.minPoints)) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {(tierConf.nextMinPoints! - (loyalty?.points ?? 0)).toLocaleString()} pts to{' '}
                {TIER_CONFIG[tierConf.nextTier].label}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral stats */}
      {referralStats && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Users className="h-4 w-4 text-indigo-500" />
              Referrals
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loyalty?.referralCode ? (
              <>
                <div className="bg-indigo-50 rounded-xl px-4 py-2 text-center mb-3">
                  <p className="text-lg font-bold tracking-widest text-indigo-700">
                    {loyalty.referralCode}
                  </p>
                  <p className="text-xs text-indigo-400">Your referral code</p>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold text-gray-900">{referralStats.total}</p>
                    <p className="text-xs text-gray-400">Referred</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-600">{referralStats.rewarded}</p>
                    <p className="text-xs text-gray-400">Rewarded</p>
                  </div>
                  {referralStats.pendingPoints > 0 && (
                    <div>
                      <p className="text-xl font-bold text-amber-600">
                        {referralStats.pendingPoints.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">Pending pts</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-400">
                Complete your first order to get a referral code.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Points history */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Points History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {txLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">
              No transactions yet — place an order to start earning points!
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">
                      {tx.description ?? tx.type ?? 'Transaction'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '—'} ·{' '}
                      {tx.balance_after.toLocaleString()} pts balance
                    </p>
                  </div>
                  <p className="text-sm font-semibold ml-3 shrink-0">
                    <PointsBadge points={tx.points} />
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button
        variant="ghost"
        className="w-full text-red-500 hover:bg-red-50 hover:text-red-600 rounded-2xl"
        onClick={() => void handleSignOut()}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  )
}
