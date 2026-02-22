import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, Mail, Lock, User, Phone } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ROLES } from '@/lib/constants'
import { cn } from '@/lib/utils'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().regex(/^(\+61|0)[0-9]{9}$/, 'Enter a valid Australian phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['customer', 'hub', 'pro', 'driver'] as const),
  referral_code: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const ROLE_OPTIONS: Array<{ value: FormData['role']; label: string; description: string }> = [
  { value: ROLES.CUSTOMER, label: 'Customer', description: 'I want to order laundry services' },
  { value: ROLES.HUB, label: 'Hub / Business', description: 'I run a laundromat or laundry business' },
  { value: ROLES.PRO, label: 'Laundry Pro', description: 'I want to wash from home and earn' },
  { value: ROLES.DRIVER, label: 'Driver', description: 'I want to deliver laundry orders' },
]

export function RegisterForm() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: 'customer',
      referral_code: searchParams.get('ref') ?? '',
    },
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    const { error } = await signUp(data)
    if (error) {
      setServerError(error)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-teal/10">
          <svg className="h-8 w-8 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We've sent a confirmation link to your email. Click it to activate your account and get started.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="text-sm font-medium text-brand-blue hover:underline"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Join LaundrLink — The Logistics Protocol for Clean.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Role selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">I am a…</label>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setValue('role', option.value)}
                className={cn(
                  'rounded-xl border p-3 text-left transition-all',
                  selectedRole === option.value
                    ? 'border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue'
                    : 'border-border hover:border-brand-blue/40'
                )}
              >
                <p className="text-sm font-medium">{option.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-tight">{option.description}</p>
              </button>
            ))}
          </div>
          {errors.role && <p className="text-xs text-brand-danger">{errors.role.message}</p>}
        </div>

        {/* Full name */}
        <Field label="Full name" error={errors.full_name?.message}>
          <InputIcon icon={<User className="h-4 w-4" />}>
            <input
              type="text"
              autoComplete="name"
              {...register('full_name')}
              className={inputCn(!!errors.full_name)}
              placeholder="Jane Smith"
            />
          </InputIcon>
        </Field>

        {/* Email */}
        <Field label="Email" error={errors.email?.message}>
          <InputIcon icon={<Mail className="h-4 w-4" />}>
            <input
              type="email"
              autoComplete="email"
              {...register('email')}
              className={inputCn(!!errors.email)}
              placeholder="jane@example.com"
            />
          </InputIcon>
        </Field>

        {/* Phone */}
        <Field label="Mobile number" error={errors.phone?.message}>
          <InputIcon icon={<Phone className="h-4 w-4" />}>
            <input
              type="tel"
              autoComplete="tel"
              {...register('phone')}
              className={inputCn(!!errors.phone)}
              placeholder="0400 000 000"
            />
          </InputIcon>
        </Field>

        {/* Password */}
        <Field label="Password" error={errors.password?.message}>
          <InputIcon icon={<Lock className="h-4 w-4" />}>
            <input
              type="password"
              autoComplete="new-password"
              {...register('password')}
              className={inputCn(!!errors.password)}
              placeholder="Min. 8 characters"
            />
          </InputIcon>
        </Field>

        {/* Referral code (hidden if not present in URL) */}
        {searchParams.get('ref') && (
          <input type="hidden" {...register('referral_code')} />
        )}

        {serverError && (
          <div className="rounded-xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3">
            <p className="text-sm text-brand-danger">{serverError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-blue text-sm font-semibold text-white transition-opacity',
            isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'
          )}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-blue hover:underline">
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground">
        By creating an account, you agree to our{' '}
        <a href="/terms" className="underline">Terms of Service</a> and{' '}
        <a href="/privacy" className="underline">Privacy Policy</a>.
      </p>
    </div>
  )
}

// ─── Helper sub-components ────────────────────────────────────────────────────
function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-brand-danger">{error}</p>}
    </div>
  )
}

function InputIcon({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      {children}
    </div>
  )
}

function inputCn(hasError: boolean) {
  return cn(
    'h-11 w-full rounded-xl border bg-background pl-10 pr-4 text-sm outline-none transition-colors',
    'focus:border-brand-blue focus:ring-1 focus:ring-brand-blue',
    hasError && 'border-brand-danger'
  )
}
