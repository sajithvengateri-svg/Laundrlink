import { LoginForm } from '@/components/shared/Auth/LoginForm'

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo mark */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue shadow-lg">
            <span className="text-lg font-black text-white">LL</span>
          </div>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
