import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/shared/Layout/AppLayout'
import { ProtectedRoute } from '@/components/shared/Auth/ProtectedRoute'
import { ROLES } from '@/lib/constants'

// ── Suspense fallback ─────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function Lazy({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  )
}

// ── Lazy page imports ─────────────────────────────────────────────────────────

// Landing / Marketing
const LandingPage    = lazy(() => import('@/pages/landing/LandingPage').then((m) => ({ default: m.LandingPage })))
const BecomeProPage  = lazy(() => import('@/pages/landing/BecomeProPage').then((m) => ({ default: m.BecomeProPage })))
const PartnerHubPage = lazy(() => import('@/pages/landing/PartnerHubPage').then((m) => ({ default: m.PartnerHubPage })))
const FindHubsPage   = lazy(() => import('@/pages/landing/FindHubsPage').then((m) => ({ default: m.FindHubsPage })))

// Auth
const LoginPage    = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const CallbackPage = lazy(() => import('@/pages/auth/CallbackPage').then((m) => ({ default: m.CallbackPage })))

// Customer
const CustomerHomePage = lazy(() => import('@/pages/customer/CustomerHomePage').then((m) => ({ default: m.CustomerHomePage })))
const NewOrderPage     = lazy(() => import('@/pages/customer/NewOrderPage').then((m) => ({ default: m.NewOrderPage })))
const OrderDetailPage  = lazy(() => import('@/pages/customer/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })))
const OrderHistoryPage = lazy(() => import('@/pages/customer/OrderHistoryPage').then((m) => ({ default: m.OrderHistoryPage })))
const ProfilePage      = lazy(() => import('@/pages/customer/ProfilePage').then((m) => ({ default: m.ProfilePage })))

// Hub
const HubDashboardPage = lazy(() => import('@/pages/hub/HubDashboardPage'))
const HubOrdersPage    = lazy(() => import('@/pages/hub/HubOrdersPage').then((m) => ({ default: m.HubOrdersPage })))
const HubScanPage      = lazy(() => import('@/pages/hub/HubScanPage'))
const HubEarningsPage  = lazy(() => import('@/pages/hub/HubEarningsPage').then((m) => ({ default: m.HubEarningsPage })))
const HubSettingsPage  = lazy(() => import('@/pages/hub/HubSettingsPage').then((m) => ({ default: m.HubSettingsPage })))
const HubAnalyticsPage = lazy(() => import('@/pages/hub/HubAnalyticsPage').then((m) => ({ default: m.HubAnalyticsPage })))

// Pro
const ProDashboardPage  = lazy(() => import('@/pages/pro/ProDashboardPage').then((m) => ({ default: m.ProDashboardPage })))
const ProJobsPage       = lazy(() => import('@/pages/pro/ProJobsPage').then((m) => ({ default: m.ProJobsPage })))
const ProScanPage       = lazy(() => import('@/pages/pro/ProScanPage').then((m) => ({ default: m.ProScanPage })))
const ProEarningsPage   = lazy(() => import('@/pages/pro/ProEarningsPage').then((m) => ({ default: m.ProEarningsPage })))
const ProOnboardingPage = lazy(() => import('@/pages/pro/ProOnboardingPage').then((m) => ({ default: m.ProOnboardingPage })))
const ProAnalyticsPage  = lazy(() => import('@/pages/pro/ProAnalyticsPage').then((m) => ({ default: m.ProAnalyticsPage })))

// Driver
const DriverDashboardPage = lazy(() => import('@/pages/driver/DriverDashboardPage').then((m) => ({ default: m.DriverDashboardPage })))
const DriverDeliveryPage  = lazy(() => import('@/pages/driver/DriverDeliveryPage').then((m) => ({ default: m.DriverDeliveryPage })))
const DriverScanPage      = lazy(() => import('@/pages/driver/DriverScanPage').then((m) => ({ default: m.DriverScanPage })))
const DriverEarningsPage  = lazy(() => import('@/pages/driver/DriverEarningsPage').then((m) => ({ default: m.DriverEarningsPage })))

// Public scan
const WebScanPage = lazy(() => import('@/pages/scan/WebScanPage').then((m) => ({ default: m.WebScanPage })))

// Help
const HelpPage = lazy(() => import('@/pages/shared/HelpPage'))

// Admin
const AdminDashboardPage     = lazy(() => import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })))
const AdminUsersPage         = lazy(() => import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))
const AdminOrdersPage        = lazy(() => import('@/pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })))
const AdminNotificationsPage = lazy(() => import('@/pages/admin/AdminNotificationsPage').then((m) => ({ default: m.AdminNotificationsPage })))
const AdminVerificationPage  = lazy(() => import('@/pages/admin/AdminVerificationPage').then((m) => ({ default: m.AdminVerificationPage })))
const AdminSettingsPage      = lazy(() => import('@/pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })))
const AdminAnalyticsPage     = lazy(() => import('@/pages/admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })))
const QRCodesPage            = lazy(() => import('@/pages/admin/QRCodesPage'))

// ── Router ────────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // ─── Public marketing routes ─────────────────────────────────────────────────
  { path: '/',           element: <Lazy component={LandingPage} /> },
  { path: '/become-pro', element: <Lazy component={BecomeProPage} /> },
  { path: '/partner',    element: <Lazy component={PartnerHubPage} /> },
  { path: '/find-hubs',  element: <Lazy component={FindHubsPage} /> },

  // ─── Public auth routes ──────────────────────────────────────────────────────
  { path: '/login',          element: <Lazy component={LoginPage} /> },
  { path: '/register',       element: <Lazy component={RegisterPage} /> },
  { path: '/auth/callback',  element: <Lazy component={CallbackPage} /> },

  // ─── Protected routes with AppLayout ────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // ── Customer ──────────────────────────────────────────────────────────
          {
            element: <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} />,
            children: [
              { path: '/orders',         element: <Lazy component={CustomerHomePage} /> },
              { path: '/orders/new',     element: <Lazy component={NewOrderPage} /> },
              { path: '/orders/history', element: <Lazy component={OrderHistoryPage} /> },
              { path: '/orders/:id',     element: <Lazy component={OrderDetailPage} /> },
              { path: '/profile',        element: <Lazy component={ProfilePage} /> },
            ],
          },

          // ── Hub ───────────────────────────────────────────────────────────────
          {
            element: <ProtectedRoute allowedRoles={[ROLES.HUB]} />,
            children: [
              { path: '/hub',              element: <Lazy component={HubDashboardPage} /> },
              { path: '/hub/orders',       element: <Lazy component={HubOrdersPage} /> },
              { path: '/hub/orders/:id',   element: <Lazy component={HubOrdersPage} /> },
              { path: '/hub/scan',         element: <Lazy component={HubScanPage} /> },
              { path: '/hub/earnings',     element: <Lazy component={HubEarningsPage} /> },
              { path: '/hub/analytics',    element: <Lazy component={HubAnalyticsPage} /> },
              { path: '/hub/settings',     element: <Lazy component={HubSettingsPage} /> },
            ],
          },

          // ── Pro ───────────────────────────────────────────────────────────────
          {
            element: <ProtectedRoute allowedRoles={[ROLES.PRO]} />,
            children: [
              { path: '/pro',             element: <Lazy component={ProDashboardPage} /> },
              { path: '/pro/jobs',        element: <Lazy component={ProJobsPage} /> },
              { path: '/pro/scan',        element: <Lazy component={ProScanPage} /> },
              { path: '/pro/earnings',    element: <Lazy component={ProEarningsPage} /> },
              { path: '/pro/analytics',   element: <Lazy component={ProAnalyticsPage} /> },
              { path: '/pro/onboarding',  element: <Lazy component={ProOnboardingPage} /> },
            ],
          },

          // ── Driver ────────────────────────────────────────────────────────────
          {
            element: <ProtectedRoute allowedRoles={[ROLES.DRIVER]} />,
            children: [
              { path: '/driver',                  element: <Lazy component={DriverDashboardPage} /> },
              { path: '/driver/active',            element: <Lazy component={DriverDeliveryPage} /> },
              { path: '/driver/active/:orderId',   element: <Lazy component={DriverDeliveryPage} /> },
              { path: '/driver/scan',              element: <Lazy component={DriverScanPage} /> },
              { path: '/driver/earnings',          element: <Lazy component={DriverEarningsPage} /> },
            ],
          },

          // ── Admin ─────────────────────────────────────────────────────────────
          {
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]} />,
            children: [
              { path: '/admin',                  element: <Lazy component={AdminDashboardPage} /> },
              { path: '/admin/users',            element: <Lazy component={AdminUsersPage} /> },
              { path: '/admin/orders',           element: <Lazy component={AdminOrdersPage} /> },
              { path: '/admin/verification',     element: <Lazy component={AdminVerificationPage} /> },
              { path: '/admin/notifications',    element: <Lazy component={AdminNotificationsPage} /> },
              { path: '/admin/analytics',        element: <Lazy component={AdminAnalyticsPage} /> },
              { path: '/admin/settings',         element: <Lazy component={AdminSettingsPage} /> },
              { path: '/admin/qr-codes',        element: <Lazy component={QRCodesPage} /> },
            ],
          },
        ],
      },
    ],
  },

  // ─── Public pages ──────────────────────────────────────────────────────────
  { path: '/help', element: <Lazy component={HelpPage} /> },
  { path: '/scan', element: <Lazy component={WebScanPage} /> },

  // 404
  { path: '*', element: <Navigate to="/" replace /> },
])
