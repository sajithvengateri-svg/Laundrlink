# LaundrLink — Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  React 19 + TypeScript + Vite + Tailwind CSS    │
│  Zustand (auth) + TanStack Query (server state) │
│  Framer Motion + Radix/shadcn UI               │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS (REST + Realtime WebSocket)
┌──────────────────▼──────────────────────────────┐
│                  Supabase                        │
│  ┌─────────┐  ┌─────────┐  ┌──────────────┐    │
│  │ PostgREST│  │  Auth   │  │  Realtime    │    │
│  │  (REST)  │  │ (GoTrue)│  │ (WebSocket)  │    │
│  └────┬─────┘  └────┬────┘  └──────┬───────┘    │
│       └──────────────┼──────────────┘            │
│              ┌───────▼───────┐                   │
│              │  PostgreSQL   │                   │
│              │  (Database)   │                   │
│              └───────────────┘                   │
│  ┌──────────┐  ┌──────────────┐                 │
│  │ Storage  │  │Edge Functions│                 │
│  │ (Photos) │  │(Stripe, NDIS)│                 │
│  └──────────┘  └──────────────┘                 │
└─────────────────────────────────────────────────┘
```

## Data Flow: Complete Order Lifecycle

```
Customer places order
  ↓
OrderWizard → createOrder() → orders table (status: pending)
  ↓ (dev mode: auto-assign hub, bag, generate OTPs, mark paid)
Order → status: pickup_scheduled
  ↓
Driver scans bag → createHandoff(customer_to_driver)
  → orders.status = picked_up_by_driver
  → bags.current_status = in_transit_to_hub
  ↓
Driver drops at hub → createHandoff(driver_to_hub)
  → orders.status = at_hub
  → bags.current_status = at_hub
  ↓
Hub assigns to pro → createHandoff(hub_to_pro)
  → orders.status = with_pro
  → bags.current_status = with_pro
  ↓
Pro returns clean → createHandoff(pro_to_hub)
  → orders.status = returned_to_hub
  → bags.current_status = at_hub
  ↓
Hub dispatches → createHandoff(hub_to_driver)
  → orders.status = out_for_delivery
  → bags.current_status = in_transit_to_customer
  ↓
Driver delivers → createHandoff(driver_to_customer)
  → orders.status = delivered
  → bags.current_order_id = null (freed)
  → bags.current_status = available
```

## Database Tables

### Core Tables

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `profiles` | id, role, full_name, phone, avatar_url, stripe_customer_id, loyalty_points | User profiles for all roles |
| `orders` | id, order_number, customer_id, hub_id, status, pickup_otp, delivery_otp, total_cents | Laundry orders |
| `order_items` | id, order_id, item_type, quantity, unit_price_cents | Line items per order |
| `bags` | id, qr_code, current_order_id, current_status, current_holder_id | Physical bags with QR tracking |
| `handoffs` | id, order_id, bag_id, step, from_user_id, to_user_id, scanned_by_id, photo_urls | Chain-of-custody records |

### Entity Tables

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `hubs` | id, owner_id, business_name, address, capacity, verification_methods | Laundromat businesses |
| `hub_team` | id, hub_id, user_id, role | Hub team members |
| `drivers` | id, user_id, is_available, vehicle_type, current_lat, current_lng | Driver profiles |
| `pros` | id, user_id, specialties, tier, is_available | Washing professionals |

### Support Tables

| Table | Description |
|-------|-------------|
| `dispatch_jobs` | Driver dispatch assignments with status tracking |
| `pricing_config` | Platform pricing, default_verification_methods |
| `order_ratings` | Customer ratings for hub/driver/pro |
| `notifications` | In-app notification system |
| `payment_ledger` | Payment records and platform fees |
| `loyalty_transactions` | Loyalty points ledger |
| `referrals` | Referral code tracking |
| `ndis_invoices` | NDIS-compliant invoice generation |
| `disputes` | Order dispute handling |
| `verification_queue` | Entity verification/approval workflow |
| `system_events` | System-wide audit log |

## Auth Flow

```
User signs up (email + password)
  ↓
Supabase Auth creates auth.users record
  ↓
Database trigger: handle_new_user()
  → Creates profiles row with role = 'customer'
  ↓
Frontend: AuthProvider listens to onAuthStateChange
  → Fetches profile from profiles table
  → Stores in Zustand authStore
  → Redirects to role-appropriate home page
```

## Handoff State Machine

```
     pending
        ↓
  pickup_scheduled
        ↓  ← customer_to_driver handoff
  picked_up_by_driver
        ↓  ← driver_to_hub handoff
     at_hub
        ↓  ← hub_to_pro handoff
    with_pro
        ↓  ← pro_to_hub handoff
  returned_to_hub
        ↓  ← hub_to_driver handoff
  out_for_delivery
        ↓  ← driver_to_customer handoff
    delivered

  (cancelled — can occur from any state)
```

Each handoff creates a record in the `handoffs` table with:
- `step`: The handoff type (enum)
- `from_user_id` / `to_user_id`: Who handed to whom
- `scanned_by_id`: Who performed the verification
- `photo_urls`: Evidence photos (optional in dev mode)
- `created_at`: Timestamp

## Verification Methods Architecture

Three methods are supported for bag verification at each handoff:

1. **QR Code** — Camera scans QR on bag tag → `getBagByQR(qrCode)` → bag lookup
2. **OTP** — 4-digit code → `findOrderByOTP(otp)` → find order → find bag for order
3. **Manual** — Type bag code → `getBagByQR(bagCode)` → bag lookup

Configuration hierarchy:
- Platform defaults: `pricing_config.default_verification_methods` (array of strings)
- Hub override: `hubs.verification_methods` (null = use platform default, array = override)
- Retrieved via `getVerificationMethods(hubId?)` in `otp.service.ts`

## Query Pattern (Critical)

**All Supabase queries must use plain `.eq()` on single tables — NO PostgREST FK joins.**

```typescript
// WRONG — will 400 error
const { data } = await supabase
  .from('bags')
  .select('*, orders!current_order_id(*)')

// CORRECT — separate queries, manual assembly
const { data: bag } = await supabase
  .from('bags')
  .select('*')
  .eq('qr_code', code)
  .maybeSingle()

const { data: order } = await supabase
  .from('orders')
  .select('id, order_number, status')
  .eq('id', bag.current_order_id)
  .maybeSingle()

return { ...bag, order }
```

## Realtime Subscriptions

- **Hub Queue:** Listens to `orders` table changes filtered by `hub_id`
- **Driver Jobs:** Listens to `dispatch_jobs` table changes filtered by `driver_id`
- **Order Detail:** Listens to individual order changes by `id`

All subscriptions use Supabase Realtime channels with automatic cleanup on unmount.

## Edge Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| `stripe-webhook` | Stripe webhook POST | Processes payment events, updates order payment_status |
| `create-payment-intent` | Frontend call | Creates PaymentIntent for order total |
| `generate-ndis-invoice` | Frontend call | Generates NDIS-compliant PDF invoice |

## RLS (Row Level Security)

Current approach: Simplified for field testing. Profiles table allows users to read/update their own profile. Orders are readable by the customer, assigned hub, and admin. Full RLS hardening planned for production.

## Frontend State Management

- **Zustand `authStore`:** Current user, profile, role. Persists across page reloads.
- **TanStack Query:** All server data (orders, hubs, drivers, bags). Provides caching, background refetching, and optimistic updates.
- **React Hook Form + Zod:** Form state and validation (OrderWizard).

## Dev Mode Features

When `VITE_DEV_MODE=true`:
- Stripe payment bypassed (orders auto-paid)
- Photos optional for handoffs
- Dev Role Switcher component appears (floating pill)
- Manual bag code entry as primary verification
- Auto-assigns hub and bag on order creation
- OTP codes auto-generated
