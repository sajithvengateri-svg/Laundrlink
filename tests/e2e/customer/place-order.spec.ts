import { test, expect } from '@playwright/test'

// NOTE: This spec requires a seeded test customer user.
// Run the app locally: npm run dev
// Seed test users: npx supabase db reset

test.describe('Customer: Place Order', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as test customer
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test.customer@laundrlink.test')
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/orders', { timeout: 10000 })
  })

  test('customer home shows active orders section', async ({ page }) => {
    await expect(page.getByText('Active Orders')).toBeVisible()
  })

  test('can navigate to new order page', async ({ page }) => {
    await page.click('text=Place your first order')
    await expect(page).toHaveURL('/orders/new')
  })

  // Phase 3 test — enabled once OrderWizard is implemented
  test.skip('completes full order placement with Stripe test card', async ({ page }) => {
    await page.goto('/orders/new')
    // Step 1: Address
    await page.fill('[placeholder*="address"]', '123 Test Street, Sydney')
    await page.click('text=Next')
    // Step 2: Items
    await page.click('text=Wash & Fold')
    await page.click('text=Next')
    // Payment
    const cardFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
    await cardFrame.locator('[placeholder="Card number"]').fill('4242 4242 4242 4242')
    await cardFrame.locator('[placeholder="MM / YY"]').fill('12/28')
    await cardFrame.locator('[placeholder="CVC"]').fill('123')
    await page.click('text=Place Order')
    await expect(page).toHaveURL(/\/orders\/[a-z0-9-]+/)
    await expect(page.getByText('Order Placed')).toBeVisible()
  })
})
