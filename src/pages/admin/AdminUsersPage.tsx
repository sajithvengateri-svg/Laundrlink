import { useState } from 'react'
import { Search, CheckCircle, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useAdminUsers, useSetUserActive } from '@/hooks/useAdmin'

const ROLE_TABS = [
  { key: 'customer', label: 'Customers' },
  { key: 'hub', label: 'Hubs' },
  { key: 'pro', label: 'Pros' },
  { key: 'driver', label: 'Drivers' },
]

export function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState('customer')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const { data: users, isLoading } = useAdminUsers(activeTab, debouncedSearch)
  const setActive = useSetUserActive()

  function handleSearch(value: string) {
    setSearch(value)
    clearTimeout((handleSearch as { t?: ReturnType<typeof setTimeout> }).t)
    ;(handleSearch as { t?: ReturnType<typeof setTimeout> }).t = setTimeout(
      () => setDebouncedSearch(value),
      350
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage all platform users</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {ROLE_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key)
              setSearch('')
              setDebouncedSearch('')
            }}
            className={[
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search name or phone…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              ) : (users?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">
                    No {activeTab}s found
                  </td>
                </tr>
              ) : (
                users!.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {user.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{user.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={user.is_active !== false ? 'default' : 'secondary'}
                        className={
                          user.is_active !== false
                            ? 'bg-green-100 text-green-700 border-0'
                            : 'bg-gray-100 text-gray-500 border-0'
                        }
                      >
                        {user.is_active !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.is_active !== false ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 text-xs"
                          disabled={setActive.isPending}
                          onClick={() => setActive.mutate({ userId: user.id, isActive: false })}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 h-7 text-xs"
                          disabled={setActive.isPending}
                          onClick={() => setActive.mutate({ userId: user.id, isActive: true })}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Activate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {users && users.length > 0 && (
        <p className="text-xs text-gray-400 mt-2">{users.length} user{users.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  )
}
