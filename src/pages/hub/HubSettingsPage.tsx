import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useHub } from '@/hooks/useHub'
import { supabase } from '@/lib/supabase'

const VERIFICATION_OPTIONS = [
  { key: 'qr', label: 'QR Code Scanning', hint: 'Scan QR code on bag tag' },
  { key: 'otp', label: 'OTP Verification', hint: '4-digit code shared by customer' },
  { key: 'bag', label: 'Manual Bag Code', hint: 'Type bag code manually (e.g. LL-BAG-001)' },
] as const

export function HubSettingsPage() {
  const { data: hub, isLoading } = useHub()
  const [usePlatformDefaults, setUsePlatformDefaults] = useState(true)
  const [verificationMethods, setVerificationMethods] = useState<string[]>(['qr', 'otp', 'bag'])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hub) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = (hub as any).verification_methods as string[] | null
    if (methods && methods.length > 0) {
      setUsePlatformDefaults(false)
      setVerificationMethods(methods)
    } else {
      setUsePlatformDefaults(true)
    }
  }, [hub])

  const toggleVerification = (key: string) => {
    setVerificationMethods((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev
        return prev.filter((m) => m !== key)
      }
      return [...prev, key]
    })
  }

  const handleSave = async () => {
    if (!hub) return
    setSaving(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('hubs')
        .update({
          verification_methods: usePlatformDefaults ? null : verificationMethods,
        })
        .eq('id', hub.id)
      if (updateError) throw updateError
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Hub Settings</h1>
        <p className="text-sm text-gray-500 mb-6">Configure your hub preferences</p>

        {/* Verification Methods */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Verification Methods
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))
            ) : (
              <>
                <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePlatformDefaults}
                    onChange={(e) => setUsePlatformDefaults(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Use Platform Defaults</p>
                    <p className="text-xs text-gray-400">
                      Use the verification methods set by the platform admin
                    </p>
                  </div>
                </label>

                {!usePlatformDefaults && (
                  <div className="space-y-3 pt-1">
                    <p className="text-xs text-gray-500">
                      At least one method must remain enabled.
                    </p>
                    {VERIFICATION_OPTIONS.map(({ key, label, hint }) => (
                      <label
                        key={key}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-700">{label}</p>
                          <p className="text-xs text-gray-400">{hint}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={verificationMethods.includes(key)}
                          onChange={() => toggleVerification(key)}
                          className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Other Settings (placeholder) */}
        <Card className="border-0 shadow-sm mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Hub Name', 'Operating Hours', 'Service Area', 'Pricing Tiers', 'Notifications'].map((setting) => (
                <div
                  key={setting}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <span className="text-sm font-medium text-gray-700">{setting}</span>
                  <span className="text-xs text-gray-300 bg-white px-2 py-1 rounded-full border border-gray-100">
                    Coming soon
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="border-0 shadow-sm mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span className="font-bold text-brand-blue">1.</span> Driver brings customer's bag to your hub</li>
              <li className="flex gap-2"><span className="font-bold text-brand-blue">2.</span> Scan/verify bag at "Driver to Hub" step</li>
              <li className="flex gap-2"><span className="font-bold text-brand-blue">3.</span> Assign bag to a Pro for washing</li>
              <li className="flex gap-2"><span className="font-bold text-brand-blue">4.</span> Pro returns clean bag — scan at "Pro to Hub"</li>
              <li className="flex gap-2"><span className="font-bold text-brand-blue">5.</span> Dispatch bag with driver — scan at "Hub to Driver"</li>
            </ol>
            <p className="text-xs text-gray-400 mt-3">
              <a href="/help" className="text-brand-blue hover:underline">View full help guide</a>
            </p>
          </CardContent>
        </Card>

        {hub && (
          <div className="mt-4 flex items-center gap-3">
            <Button
              className="gap-2"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            {saved && (
              <p className="text-sm text-green-600 font-medium">Saved!</p>
            )}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
