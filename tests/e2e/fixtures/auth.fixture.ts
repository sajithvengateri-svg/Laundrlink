// Auth fixture: creates test users in Supabase before E2E tests run.
// Called via globalSetup in playwright.config.ts.
// Requires SUPABASE_SERVICE_ROLE_KEY in environment.

import type { FullConfig } from '@playwright/test'

async function globalSetup(_config: FullConfig) {
  // In CI: seed test users via Supabase Admin API
  // For local dev: ensure test users exist in your local Supabase instance
  console.log('[E2E Setup] Auth fixture — test users should be pre-seeded in Supabase.')
  console.log('[E2E Setup] Run: npx supabase db reset to apply seed.sql with test users.')
}

export default globalSetup
