import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { APP_NAME } from '@/lib/constants'
import { NotificationBell } from '@/components/shared/Notifications/NotificationBell'

const ROLE_LABELS: Record<string, string> = {
  customer: '',
  hub: 'Hub Portal',
  pro: 'Pro Portal',
  driver: 'Driver',
  admin: 'Admin',
}

export function Topbar() {
  const { profile } = useAuthStore()
  const { signOut } = useAuth()
  const roleLabel = ROLE_LABELS[profile?.role ?? 'customer']

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm safe-top">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-blue">
            <span className="text-[10px] font-black text-white">LL</span>
          </div>
          <span className="font-bold text-foreground">{APP_NAME}</span>
          {roleLabel && (
            <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-semibold text-brand-blue">
              {roleLabel}
            </span>
          )}
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => void signOut()}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
