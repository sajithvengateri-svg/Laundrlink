import { z } from 'zod'

// ── Auth ─────────────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const signUpSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Enter your full name'),
  phone: z
    .string()
    .regex(/^04\d{8}$/, 'Enter a valid Australian mobile (04XXXXXXXX)'),
  role: z.enum(['customer', 'hub', 'pro', 'driver']),
  referral_code: z.string().optional(),
})

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>

// ── Address ───────────────────────────────────────────────────────────────────

export const addressSchema = z.object({
  street: z.string().min(3, 'Enter a street address'),
  suburb: z.string().min(2, 'Enter a suburb'),
  state: z.string().min(2, 'Enter a state'),
  postcode: z.string().regex(/^\d{4}$/, 'Enter a 4-digit postcode'),
  country: z.string().optional().default('Australia'),
  lat: z.number().optional(),
  lng: z.number().optional(),
  formatted: z.string().optional(),
})

export type AddressInput = z.infer<typeof addressSchema>

// ── Order Wizard ──────────────────────────────────────────────────────────────

export const orderStep1Schema = z.object({
  pickup_address: addressSchema,
  delivery_address: addressSchema,
  same_as_pickup: z.boolean().default(true),
})

export const orderItemSchema = z.object({
  description: z.string().min(1, 'Enter a description'),
  quantity: z.number().int().min(1, 'At least 1').max(20, 'Maximum 20'),
  price_cents: z.number().int().min(0),
})

export const orderStep2Schema = z.object({
  items: z.array(orderItemSchema).min(1, 'Add at least one item'),
})

export const orderStep3Schema = z.object({
  service_type: z.enum(['wash_fold', 'dry_clean', 'iron', 'specialist']),
  special_instructions: z.string().max(500).optional(),
  is_ndis: z.boolean().default(false),
  ndis_number: z.string().optional(),
  ndis_plan_manager: z.string().optional(),
})

export const orderStep4Schema = z.object({
  pickup_date: z.string().min(1, 'Select a pickup date'),
  delivery_date: z.string().min(1, 'Select a delivery date'),
})

export const fullOrderSchema = orderStep1Schema
  .merge(orderStep2Schema)
  .merge(orderStep3Schema)
  .merge(orderStep4Schema)
  .extend({
    hub_id: z.string().uuid('Select a hub').optional(),
  })

export type OrderWizardData = z.infer<typeof fullOrderSchema>

// ── Payments ──────────────────────────────────────────────────────────────────

export const paymentSchema = z.object({
  card_holder_name: z.string().min(2, 'Enter the name on your card'),
})

export type PaymentInput = z.infer<typeof paymentSchema>

// ── Profile ───────────────────────────────────────────────────────────────────

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Enter your full name'),
  phone: z
    .string()
    .regex(/^04\d{8}$/, 'Enter a valid Australian mobile (04XXXXXXXX)'),
  address: addressSchema.optional(),
})

export type ProfileInput = z.infer<typeof profileSchema>
