# LaundrLink — The Logistics Protocol for Clean

## Overview

QR + OTP tracked laundry marketplace with chain-of-custody verification at every handoff. 5 role-based portals (Customer, Hub, Pro, Driver, Admin). Built as a SaaS platform where Admin is the platform provider and Hubs are paying customers.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
- **Payments:** Stripe Connect (dev mode bypass available)
- **QR:** html5-qrcode library + manual entry
- **State:** Zustand (auth) + TanStack Query (server)
- **UI:** Radix/shadcn + Framer Motion + Lucide icons

## Getting Started

```bash
npm install
cp .env.example .env.local  # Edit with your Supabase keys
npm run dev                  # http://localhost:5173
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_GOOGLE_MAPS_KEY` | Google Maps API key (placeholder OK for dev) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (placeholder OK for dev) |
| `VITE_DEV_MODE` | Set to `'true'` for dev bypasses (Stripe, photos, role switcher) |

## Project Structure

```
src/
├── components/       # React components
│   ├── admin/        # Admin portal components
│   ├── customer/     # Customer components (OrderWizard, PaymentForm)
│   ├── hub/          # Hub components (BagScanner, OrderQueue)
│   ├── shared/       # Shared (Auth, Layout, QRScanner, OTPInput, DevRoleSwitcher)
│   └── ui/           # shadcn/ui base components
├── hooks/            # Custom React hooks (useOrder, useHub, useDriver, etc.)
├── lib/              # Utilities, Supabase client, constants
├── pages/            # Page components organized by role
│   ├── admin/        # Admin pages (Dashboard, Users, Orders, Settings, QR Codes)
│   ├── customer/     # Customer pages (Home, NewOrder, OrderDetail, History)
│   ├── driver/       # Driver pages (Dashboard, Scan, Earnings)
│   ├── hub/          # Hub pages (Dashboard, Orders, Scan, Settings)
│   ├── pro/          # Pro pages (Dashboard, Jobs, Scan)
│   └── shared/       # Shared pages (Help)
├── router/           # React Router config
├── services/         # Supabase query functions (NO FK joins — all plain queries)
├── stores/           # Zustand stores (authStore)
└── types/            # TypeScript types (database.types.ts auto-generated)
```

## Roles & Portals

| Role | Portal Route | Description |
|------|-------------|-------------|
| Customer | `/orders` | Place orders, track laundry, rate service |
| Hub | `/hub` | Receive bags, manage washing, dispatch |
| Pro | `/pro` | Washing professional, receives jobs from hub |
| Driver | `/driver` | Pickup and delivery between customers and hubs |
| Admin | `/admin` | Platform management, pricing, user management |

## Chain of Custody — 6 Handoff Steps

Every bag is tracked through 6 verified handoffs:

1. **Customer → Driver** (Pickup) — Driver collects bag from customer's door
2. **Driver → Hub** (Drop-off) — Driver brings bag to the laundromat
3. **Hub → Pro** (Processing) — Hub assigns bag for washing
4. **Pro → Hub** (Return) — Clean bag returned to hub
5. **Hub → Driver** (Dispatch) — Hub sends bag out for delivery
6. **Driver → Customer** (Delivery) — Driver delivers clean bag to customer

## Verification Methods

Three ways to verify a bag at each handoff:

- **QR Code** — Scan the QR code on the bag tag
- **OTP** — 4-digit code (pickup + delivery codes shown to customer)
- **Manual Bag Code** — Type the bag code (e.g., LL-BAG-001)

Admin sets platform defaults in Settings. Hubs can override in their own Settings.

## Database Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (all roles) |
| `orders` | Laundry orders with status, addresses, OTP codes |
| `order_items` | Line items per order |
| `bags` | Physical bags with QR codes, assigned to orders |
| `hubs` | Laundromat businesses |
| `hub_team` | Hub team member associations |
| `drivers` | Driver profiles and availability |
| `pros` | Washing pro profiles |
| `handoffs` | Chain-of-custody handoff records |
| `dispatch_jobs` | Driver dispatch assignments |
| `order_ratings` | Customer ratings for hub/driver/pro |
| `pricing_config` | Platform pricing + verification defaults |
| `notifications` | In-app notifications |
| `loyalty_transactions` | Loyalty points ledger |
| `referrals` | Referral tracking |
| `payment_ledger` | Payment records |
| `ndis_invoices` | NDIS invoice generation |
| `disputes` | Order disputes |
| `verification_queue` | Entity verification requests |
| `system_events` | System-wide event log |

## Edge Functions

| Function | Description |
|----------|-------------|
| `stripe-webhook` | Handles Stripe payment webhooks |
| `create-payment-intent` | Creates Stripe PaymentIntent for orders |
| `generate-ndis-invoice` | Generates NDIS-compliant invoices |

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@laundrlink.test | Test1234! | Admin |
| hub@laundrlink.test | Test1234! | Hub |
| customer@laundrlink.test | Test1234! | Customer |

## Dev Mode

When `VITE_DEV_MODE=true`:
- Stripe payments bypassed (orders auto-marked as paid)
- Photos optional for handoffs (placeholder used)
- Dev role switcher available (floating pill, bottom-right)
- Manual entry as primary verification method
- Hub and bag auto-assigned on order creation
- OTP codes auto-generated for pickup and delivery

## Database Migrations

Run the OTP migration in the Supabase SQL Editor:

```sql
-- supabase/migrations/0014_otp_verification.sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_otp TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_otp TEXT;
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS verification_methods TEXT[] DEFAULT NULL;
```

## Deployment

- **Frontend:** Vercel (or any static host) — `npm run build` produces `dist/`
- **Backend:** Supabase (hosted)
- **Config:** `vercel.json` handles SPA routing rewrites

```bash
npm run build        # Build for production
npm run typecheck    # TypeScript verification
npm run lint         # ESLint
```

## Important: No PostgREST FK Joins

All Supabase queries in this project use plain `.from('table').select('columns').eq()` — **never** use PostgREST FK join syntax (`!fkey_name`). Data from related tables is assembled manually using separate queries. This is a hard requirement due to schema cache limitations.
