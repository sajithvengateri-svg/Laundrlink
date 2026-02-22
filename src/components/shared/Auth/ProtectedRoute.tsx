import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { Role } from '@/lib/constants'

interface ProtectedRouteProps {
  allowedRoles?: Role[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, profile, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role as Role)) {
    // Redirect to their home portal if they try to access the wrong role's area
    return <Navigate to={getRoleHome(profile.role as Role)} replace />
  }

  return <Outlet />
}

function getRoleHome(role: Role): string {
  switch (role) {
    case 'customer': return '/orders'
    case 'hub': return '/hub'
    case 'pro': return '/pro'
    case 'driver': return '/driver'
    case 'admin': return '/admin'
    default: return '/'
  }
}
