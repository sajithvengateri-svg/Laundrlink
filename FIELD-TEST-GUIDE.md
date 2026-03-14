# LaundrLink — Field Test Guide

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@laundrlink.test | Test1234! | Admin |
| hub@laundrlink.test | Test1234! | Hub |
| customer@laundrlink.test | Test1234! | Customer |

All accounts can switch roles using the floating Dev Role Switcher (blue pill, bottom-right corner).

## Pre-Requisites

1. App is running at http://localhost:5173 (or deployed URL)
2. `VITE_DEV_MODE=true` is set in `.env.local`
3. Test bags (LL-BAG-001 through LL-BAG-010) are seeded in the database
4. Migration `0014_otp_verification.sql` has been run in Supabase SQL Editor

## Complete Test Flow

### Step 1: Place an Order (Customer)

1. Log in as **customer@laundrlink.test**
2. From the dashboard, tap **"New Order"**
3. **Address:** Pre-filled with "123 Test Street, Sydney, NSW 2000". Leave as-is or modify.
4. **Items:** Add at least one item (e.g., "Individual Bag")
5. **Service:** Select a service type (e.g., "Standard")
6. **Schedule:** Pick a pickup and delivery date
7. **Confirm:** Tap **"Place Order (Dev)"** — no payment required in dev mode
8. You'll be redirected to the order detail page

**What to expect:**
- Order status: "Pickup Scheduled"
- A bag code is shown (e.g., "Your Bag: LL-BAG-003")
- A pickup OTP is shown (e.g., "Pickup OTP: 4729")
- Note down the **bag code** — you'll need it for scanning

### Step 2: Pickup — Customer to Driver

1. Use the **Dev Role Switcher** (bottom-right) to switch to **Driver**
2. Go to **Scan** page
3. Select **"Customer to Driver"** step
4. Choose a verification method:
   - **OTP Code:** Enter the 4-digit pickup OTP from the customer's order
   - **Bag Code:** Type the bag code (e.g., LL-BAG-003)
   - **QR Scan:** Scan the QR code if you have printed tags
5. Review bag details, then tap **"Confirm Handoff"**
6. You'll see a success screen: "Handoff Complete — Step 1/6"
7. Tap **"Scan Next Step"** to continue, or **"Done"**

### Step 3: Drop-off — Driver to Hub

1. Still as **Driver** (or switch to Hub role)
2. Select **"Driver to Hub"** step
3. Enter the same bag code or OTP
4. Confirm handoff
5. Success: Step 2/6

### Step 4: Processing — Hub to Pro

1. Switch to **Hub** role
2. Go to **Scan** → select **"Hub to Pro"**
3. Enter bag code
4. Confirm handoff
5. Success: Step 3/6

### Step 5: Return — Pro to Hub

1. Stay as **Hub** (hub owner acts as pro)
2. Select **"Pro to Hub"** step
3. Enter bag code
4. Confirm handoff
5. Success: Step 4/6

### Step 6: Dispatch — Hub to Driver

1. Select **"Hub to Driver"** step
2. Enter bag code
3. Confirm handoff
4. Success: Step 5/6

### Step 7: Delivery — Driver to Customer

1. Switch to **Driver** role
2. Go to **Scan** → select **"Driver to Customer"**
3. Enter the bag code or the customer's **delivery OTP** (shown on customer's order detail when status is "Out for Delivery")
4. Confirm handoff
5. Success: Step 6/6 — **Order Delivered!**

### Step 8: Verify Complete Journey (Customer)

1. Switch back to **Customer** role
2. Go to your order detail page
3. The timeline should show all 6 steps completed with green checkmarks
4. Each step shows a timestamp
5. You should see a **"Rate Your Experience"** button

### Step 9: Admin Portal

1. Switch to **Admin** role
2. Dashboard shows KPIs (orders, revenue, users)
3. **Orders** page shows all orders with status
4. **Settings** page has pricing config and verification method toggles
5. **QR Codes** page at `/admin/qr-codes` shows printable QR codes for all bags

## Verification Methods

At each scan step, you have three options:

| Method | How to Use | Best For |
|--------|-----------|----------|
| QR Scan | Point camera at bag tag QR code | Physical bag tags |
| OTP Code | Enter 4-digit code from customer | Phone verification |
| Bag Code | Type LL-BAG-XXX | Desktop testing |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Bag not found" | Make sure you're typing the bag code (LL-BAG-XXX), not the order number |
| "No order found for OTP" | Check the customer's order detail page for the correct OTP |
| Order timeline stuck | Tap the refresh icon on the order detail page |
| Camera not working | Use OTP or bag code entry instead |
| Role switcher not showing | Ensure `VITE_DEV_MODE=true` in `.env.local` |
| 400 errors in console | Normal during role switching; queries are role-guarded |
| Can't place order | Ensure at least one hub exists and one bag is unassigned |

## Important Notes

- **Bag codes** are how the system tracks physical bags. Each order gets one bag assigned.
- **OTP codes** are generated per order — pickup OTP and delivery OTP are different.
- The **Dev Role Switcher** creates necessary records (driver, pro, hub) when switching roles for the first time.
- All handoff photos are optional in dev mode.
- In-app help is available at `/help` (also accessible via the help icon in the top bar).
