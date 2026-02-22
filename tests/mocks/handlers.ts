import { http, HttpResponse } from 'msw'

const SUPABASE_URL = 'https://eozguawwmpkaouzantie.supabase.co'

export const handlers = [
  // Edge function: create-payment-intent
  http.post(`${SUPABASE_URL}/functions/v1/create-payment-intent`, () => {
    return HttpResponse.json({
      client_secret: 'pi_test_secret_123',
      payment_intent_id: 'pi_test_123',
      amount: 3000,
      hub_amount: 2100,
      platform_fee: 900,
    })
  }),

  // Edge function: send-sms
  http.post(`${SUPABASE_URL}/functions/v1/send-sms`, () => {
    return HttpResponse.json({ success: true, message_sid: 'SM_test_123' })
  }),

  // Edge function: send-email
  http.post(`${SUPABASE_URL}/functions/v1/send-email`, () => {
    return HttpResponse.json({ success: true, id: 'email_test_123' })
  }),

  // Edge function: assign-hub-pro
  http.post(`${SUPABASE_URL}/functions/v1/assign-hub-pro`, () => {
    return HttpResponse.json({
      hub_id: 'hub_test_123',
      pro_id: null,
      distance_km: 3.2,
    })
  }),

  // Edge function: stripe-connect-onboard
  http.post(`${SUPABASE_URL}/functions/v1/stripe-connect-onboard`, () => {
    return HttpResponse.json({
      url: 'https://connect.stripe.com/test/onboarding/...',
    })
  }),

  // Edge function: generate-ndis-invoice
  http.post(`${SUPABASE_URL}/functions/v1/generate-ndis-invoice`, () => {
    return HttpResponse.json({
      status: 'generating',
      invoice_id: 'ndis_test_123',
    })
  }),

  // Edge function: dispatch-driver
  http.post(`${SUPABASE_URL}/functions/v1/dispatch-driver`, () => {
    return HttpResponse.json({
      dispatch_provider: 'native',
      dispatch_job_id: 'job-test-123',
      driver_id: 'driver-test-1',
      external_job_id: null,
      estimated_eta: null,
    })
  }),

  // Edge function: fit2work-check
  http.post(`${SUPABASE_URL}/functions/v1/fit2work-check`, () => {
    return HttpResponse.json({ reference: 'FW-TEST-123456' })
  }),

  // Edge function: process-referral
  http.post(`${SUPABASE_URL}/functions/v1/process-referral`, () => {
    return HttpResponse.json({ success: true, pointsAwarded: 1000 })
  }),

  // Edge function: update-loyalty-points
  http.post(`${SUPABASE_URL}/functions/v1/update-loyalty-points`, () => {
    return HttpResponse.json({
      success: true,
      pointsEarned: 150,
      newPoints: 650,
      newTier: 'bronze',
      referralCode: 'LLTEST1',
    })
  }),
]
