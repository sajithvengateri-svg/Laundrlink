import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { MobileNav } from './MobileNav'
import { Topbar } from './Topbar'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { DevRoleSwitcher } from '@/components/shared/DevRoleSwitcher'

// Admin uses full desktop layout — no mobile nav
const ADMIN_PATH_PREFIX = '/admin'

export function AppLayout() {
  const { profile } = useAuthStore()
  const location = useLocation()

  const isAdmin = profile?.role === 'admin' || location.pathname.startsWith(ADMIN_PATH_PREFIX)

  if (isAdmin) {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 overflow-auto bg-gray-50">
          <Outlet />
        </main>
        <DevRoleSwitcher />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Topbar />

      <main className="flex-1 pb-20">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <MobileNav />
      <DevRoleSwitcher />
    </div>
  )
}
