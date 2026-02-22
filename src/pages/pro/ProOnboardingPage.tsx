import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Upload, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProProfile, useUpdateProProfile, useSubmitFit2Work } from '@/hooks/usePro'
import { storage } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const STEP_LABELS = [
  'Personal Details',
  'Identity',
  'Services & Pricing',
  'Equipment',
  'Hygiene Quiz',
  'Quality Pledge',
]

// ── Hygiene quiz ──────────────────────────────────────────────────────────────

const QUIZ: Array<{ question: string; options: string[]; correct: number }> = [
  {
    question: 'What is the recommended water temperature for washing delicate fabrics?',
    options: ['Hot (60°C+)', 'Warm (40°C)', 'Cold (30°C or below)', 'Any temperature'],
    correct: 2,
  },
  {
    question: 'Which fabric must NEVER go in a tumble dryer?',
    options: ['Cotton', 'Polyester', 'Wool', 'Linen'],
    correct: 2,
  },
  {
    question: 'How often should you clean your washing machine drum?',
    options: ['Once a year', 'Once a month', 'After every wash', 'Never'],
    correct: 1,
  },
  {
    question: 'What is the correct way to sort laundry before washing?',
    options: [
      'By owner only',
      'By color and fabric type',
      'Size only',
      'No sorting required',
    ],
    correct: 1,
  },
  {
    question: 'Freshly washed bags should be returned to the hub when they are:',
    options: [
      'Still slightly damp',
      'Washed but not dried',
      'Completely dry (no moisture)',
      'After 2 hours regardless of dryness',
    ],
    correct: 2,
  },
]

export function ProOnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: pro } = useProProfile()
  const updatePro = useUpdateProProfile()
  const submitFit2Work = useSubmitFit2Work()

  const [currentStep, setCurrentStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 — Personal
  const [abn, setAbn] = useState(pro?.abn ?? '')
  const [bio, setBio] = useState(pro?.bio ?? '')

  // Step 2 — Identity
  const [idUploading, setIdUploading] = useState(false)
  const idInputRef = useRef<HTMLInputElement>(null)

  // Step 3 — Services
  const ALL_SERVICES = ['Washing', 'Drying', 'Ironing', 'Folding', 'Express']
  const [services, setServices] = useState<string[]>(pro?.services ?? [])
  const [pricePerBag, setPricePerBag] = useState(
    pro?.price_per_bag != null ? String(pro.price_per_bag / 100) : ''
  )
  const [expressPrice, setExpressPrice] = useState(
    pro?.express_price_per_bag != null ? String(pro.express_price_per_bag / 100) : ''
  )
  const [maxBags, setMaxBags] = useState(pro?.max_bags_per_day != null ? String(pro.max_bags_per_day) : '')

  // Step 4 — Equipment
  const [machineType, setMachineType] = useState(pro?.machine_type ?? '')
  const [machineCapacity, setMachineCapacity] = useState(
    pro?.machine_capacity_kg != null ? String(pro.machine_capacity_kg) : ''
  )
  const [hasDryer, setHasDryer] = useState(pro?.has_dryer ?? false)
  const [hasIron, setHasIron] = useState(pro?.has_iron ?? false)
  const [detergent, setDetergent] = useState(pro?.detergent_type ?? '')
  const [setupPhotoUploading, setSetupPhotoUploading] = useState(false)
  const setupPhotoRef = useRef<HTMLInputElement>(null)

  // Step 5 — Quiz
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>(Array(QUIZ.length).fill(null))
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const quizPassed =
    quizSubmitted && quizAnswers.every((a, i) => a === QUIZ[i].correct)
  const quizFailed = quizSubmitted && !quizPassed

  // Step 6 — Pledge
  const [pledgeSigned, setPledgeSigned] = useState(pro?.pledge_signed ?? false)

  // ── Helpers ─────────────────────────────────────────────────────────────────

  async function uploadIdPhoto(file: File) {
    if (!user) return
    setIdUploading(true)
    try {
      const path = `pro-id/${user.id}/${Date.now()}.${file.name.split('.').pop() ?? 'jpg'}`
      const { error: upErr } = await storage.avatars.upload(path, file, {
        contentType: file.type,
        upsert: true,
      })
      if (upErr) throw upErr
      // Mark id_verified pending review (admin verifies)
      await updatePro.mutateAsync({ id_verified: false })
    } finally {
      setIdUploading(false)
    }
  }

  async function uploadSetupPhoto(file: File) {
    if (!user) return
    setSetupPhotoUploading(true)
    try {
      const path = `pro-setup/${user.id}/${Date.now()}.${file.name.split('.').pop() ?? 'jpg'}`
      const { error: upErr } = await storage.avatars.upload(path, file, {
        contentType: file.type,
        upsert: true,
      })
      if (upErr) throw upErr
      const { data } = storage.avatars.getPublicUrl(path)
      await updatePro.mutateAsync({ setup_photo_url: data.publicUrl })
    } finally {
      setSetupPhotoUploading(false)
    }
  }

  // ── Step saves ───────────────────────────────────────────────────────────────

  async function saveAndNext() {
    setError(null)
    setSaving(true)
    try {
      if (currentStep === 0) {
        await updatePro.mutateAsync({ abn: abn || null, bio: bio || null })
      } else if (currentStep === 1) {
        // ID photo already uploaded in real-time; just advance
      } else if (currentStep === 2) {
        if (!pricePerBag) throw new Error('Please enter your price per bag.')
        await updatePro.mutateAsync({
          services,
          price_per_bag: Math.round(parseFloat(pricePerBag) * 100),
          express_price_per_bag: expressPrice ? Math.round(parseFloat(expressPrice) * 100) : null,
          max_bags_per_day: maxBags ? parseInt(maxBags) : null,
        })
      } else if (currentStep === 3) {
        if (!machineType) throw new Error('Please specify your machine type.')
        await updatePro.mutateAsync({
          machine_type: machineType,
          machine_capacity_kg: machineCapacity ? parseFloat(machineCapacity) : null,
          has_dryer: hasDryer,
          has_iron: hasIron,
          detergent_type: detergent || null,
        })
      } else if (currentStep === 4) {
        if (!quizPassed) {
          setQuizSubmitted(true)
          if (!quizPassed) throw new Error('Please answer all quiz questions correctly.')
        }
        await updatePro.mutateAsync({ quiz_passed: true })
      } else if (currentStep === 5) {
        if (!pledgeSigned) throw new Error('Please sign the quality pledge to continue.')
        await updatePro.mutateAsync({ pledge_signed: true })
        // Submit Fit2Work check
        await submitFit2Work.mutateAsync()
        navigate('/pro')
        return
      }
      setCurrentStep((s) => s + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  // ── Step content ─────────────────────────────────────────────────────────────

  const stepContent = [
    // Step 1 — Personal Details
    <div key="personal" className="space-y-4">
      <div>
        <Label htmlFor="abn">ABN (optional)</Label>
        <Input
          id="abn"
          placeholder="12 345 678 901"
          value={abn}
          onChange={(e) => setAbn(e.target.value)}
          className="mt-1.5"
        />
        <p className="text-xs text-gray-400 mt-1">
          Required if you plan to receive payouts of $75+ per week.
        </p>
      </div>
      <div>
        <Label htmlFor="bio">Bio (optional)</Label>
        <textarea
          id="bio"
          rows={3}
          placeholder="Tell customers a bit about yourself and your laundry setup…"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>
    </div>,

    // Step 2 — Identity Verification
    <div key="identity" className="space-y-4">
      <div className="bg-blue-50 rounded-xl p-4">
        <p className="text-sm text-blue-800 font-medium mb-1">Government ID Required</p>
        <p className="text-xs text-blue-600">
          Upload a photo of your driver's licence, passport, or Medicare card. Your ID will be
          reviewed by the LaundrLink team within 24 hours.
        </p>
      </div>

      <input
        ref={idInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void uploadIdPhoto(f)
        }}
      />

      <Button
        variant="outline"
        className="w-full h-20 rounded-xl border-dashed border-2 flex-col gap-2"
        onClick={() => idInputRef.current?.click()}
        disabled={idUploading}
      >
        <Upload className="h-5 w-5 text-gray-400" />
        <span className="text-sm text-gray-500">
          {idUploading ? 'Uploading…' : 'Upload ID Photo'}
        </span>
      </Button>

      {pro?.id_verified === false && (
        <div className="flex items-center gap-2 text-amber-600">
          <AlertCircle className="h-4 w-4" />
          <p className="text-xs">ID uploaded — pending admin review</p>
        </div>
      )}
      {pro?.id_verified === true && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <p className="text-xs font-medium">Identity verified</p>
        </div>
      )}
    </div>,

    // Step 3 — Services & Pricing
    <div key="services" className="space-y-4">
      <div>
        <Label>Services you offer</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {ALL_SERVICES.map((s) => (
            <button
              key={s}
              onClick={() =>
                setServices((prev) =>
                  prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                )
              }
              className={[
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                services.includes(s)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200',
              ].join(' ')}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="price">Price per bag ($)</Label>
        <Input
          id="price"
          type="number"
          min="0"
          step="0.50"
          placeholder="12.00"
          value={pricePerBag}
          onChange={(e) => setPricePerBag(e.target.value)}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="express">Express price per bag ($) — optional</Label>
        <Input
          id="express"
          type="number"
          min="0"
          step="0.50"
          placeholder="18.00"
          value={expressPrice}
          onChange={(e) => setExpressPrice(e.target.value)}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="maxbags">Max bags per day — optional</Label>
        <Input
          id="maxbags"
          type="number"
          min="1"
          placeholder="10"
          value={maxBags}
          onChange={(e) => setMaxBags(e.target.value)}
          className="mt-1.5"
        />
      </div>
    </div>,

    // Step 4 — Equipment
    <div key="equipment" className="space-y-4">
      <div>
        <Label htmlFor="machine">Washing machine type</Label>
        <Input
          id="machine"
          placeholder="e.g. Front loader, Top loader"
          value={machineType}
          onChange={(e) => setMachineType(e.target.value)}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="capacity">Machine capacity (kg)</Label>
        <Input
          id="capacity"
          type="number"
          min="1"
          placeholder="7"
          value={machineCapacity}
          onChange={(e) => setMachineCapacity(e.target.value)}
          className="mt-1.5"
        />
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasDryer}
            onChange={(e) => setHasDryer(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">I have a dryer</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasIron}
            onChange={(e) => setHasIron(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">I have an iron</span>
        </label>
      </div>
      <div>
        <Label htmlFor="detergent">Preferred detergent</Label>
        <Input
          id="detergent"
          placeholder="e.g. OMO Sensitive, Coles brand"
          value={detergent}
          onChange={(e) => setDetergent(e.target.value)}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label>Setup photo (optional)</Label>
        <input
          ref={setupPhotoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void uploadSetupPhoto(f)
          }}
        />
        <Button
          variant="outline"
          className="w-full h-16 mt-1.5 rounded-xl border-dashed border-2 gap-2"
          onClick={() => setupPhotoRef.current?.click()}
          disabled={setupPhotoUploading}
        >
          <Upload className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {setupPhotoUploading
              ? 'Uploading…'
              : pro?.setup_photo_url
              ? 'Photo uploaded ✓'
              : 'Upload washing setup photo'}
          </span>
        </Button>
      </div>
    </div>,

    // Step 5 — Hygiene Quiz
    <div key="quiz" className="space-y-5">
      <p className="text-sm text-gray-600">
        Answer all 5 questions correctly to pass. You can retry if you get one wrong.
      </p>
      {QUIZ.map((q, qi) => {
        const selected = quizAnswers[qi]
        const isCorrect = selected === q.correct
        const isWrong = quizSubmitted && selected !== null && !isCorrect

        return (
          <div key={qi} className="space-y-2">
            <p className="text-sm font-medium text-gray-800">
              {qi + 1}. {q.question}
            </p>
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => {
                let optClass =
                  'w-full text-left px-3 py-2 rounded-xl border text-sm transition-colors '
                if (selected === oi && !quizSubmitted) {
                  optClass += 'border-indigo-500 bg-indigo-50 text-indigo-800'
                } else if (quizSubmitted && oi === q.correct) {
                  optClass += 'border-green-400 bg-green-50 text-green-800'
                } else if (quizSubmitted && selected === oi && !isCorrect) {
                  optClass += 'border-red-300 bg-red-50 text-red-700'
                } else {
                  optClass += 'border-gray-100 bg-white text-gray-600'
                }
                return (
                  <button
                    key={oi}
                    className={optClass}
                    disabled={quizSubmitted && isCorrect}
                    onClick={() => {
                      const next = [...quizAnswers]
                      next[qi] = oi
                      setQuizAnswers(next)
                      if (quizSubmitted) setQuizSubmitted(false)
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            {isWrong && (
              <p className="text-xs text-red-500">
                Incorrect — the correct answer is "{q.options[q.correct]}"
              </p>
            )}
          </div>
        )
      })}
      {quizFailed && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">Some answers were incorrect. Review and try again.</p>
        </div>
      )}
      {quizPassed && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl p-3">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm font-medium">All correct! Quiz passed.</p>
        </div>
      )}
      {!quizSubmitted && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setQuizSubmitted(true)}
          disabled={quizAnswers.some((a) => a === null)}
        >
          Submit Quiz
        </Button>
      )}
    </div>,

    // Step 6 — Quality Pledge + Fit2Work
    <div key="pledge" className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-700">
        <p className="font-semibold text-gray-900">LaundrLink Quality Pledge</p>
        <p>I commit to providing laundry services that meet LaundrLink's quality standards:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>Wash all items according to their care labels</li>
          <li>Return bags completely clean, dry, and odour-free</li>
          <li>Never mix customer laundry with my own</li>
          <li>Complete jobs within the agreed timeframe</li>
          <li>Communicate promptly if issues arise</li>
          <li>Maintain a hygienic and clean washing environment</li>
        </ul>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={pledgeSigned}
          onChange={(e) => setPledgeSigned(e.target.checked)}
          className="mt-0.5 rounded"
        />
        <span className="text-sm text-gray-700">
          I have read and agree to the LaundrLink Quality Pledge. I understand that repeated
          quality issues may result in suspension from the platform.
        </span>
      </label>

      <div className="bg-indigo-50 rounded-xl p-4">
        <p className="text-sm font-semibold text-indigo-800 mb-1">Background Check</p>
        <p className="text-xs text-indigo-600">
          By completing this step, we will submit a National Police Check via Fit2Work on your
          behalf. Results typically take 1–3 business days. You can start setting up while it's
          pending.
        </p>
      </div>
    </div>,
  ]

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">Pro Onboarding</h1>
        <p className="text-sm text-gray-500">
          Step {currentStep + 1} of {STEP_LABELS.length} — {STEP_LABELS[currentStep]}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Step progress bar */}
        <div className="flex gap-1">
          {STEP_LABELS.map((_, i) => (
            <div
              key={i}
              className={[
                'flex-1 h-1.5 rounded-full transition-colors',
                i < currentStep
                  ? 'bg-indigo-600'
                  : i === currentStep
                  ? 'bg-indigo-400'
                  : 'bg-gray-200',
              ].join(' ')}
            />
          ))}
        </div>

        {/* Step content */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              {STEP_LABELS[currentStep]}
            </h2>
            {stepContent[currentStep]}
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => { setCurrentStep((s) => s - 1); setError(null) }}
              disabled={saving}
            >
              Back
            </Button>
          )}
          <Button
            className="flex-1 rounded-xl"
            onClick={() => void saveAndNext()}
            disabled={saving || (currentStep === 4 && quizSubmitted && !quizPassed)}
          >
            {saving
              ? 'Saving…'
              : currentStep === STEP_LABELS.length - 1
              ? 'Submit & Start Background Check'
              : 'Continue'}
          </Button>
        </div>

        {/* Step list overview */}
        <div className="space-y-1.5">
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm',
                i === currentStep ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400',
              ].join(' ')}
            >
              <div
                className={[
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  i < currentStep
                    ? 'bg-green-500 text-white'
                    : i === currentStep
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-400',
                ].join(' ')}
              >
                {i < currentStep ? '✓' : i + 1}
              </div>
              <span className={i === currentStep ? 'font-medium' : ''}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
