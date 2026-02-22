import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import {
  ArrowLeft,
  DollarSign,
  Clock,
  Star,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.08 },
  }),
}

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }

const BENEFITS = [
  {
    icon: DollarSign,
    title: 'Earn $25–$50 per job',
    body: 'Set your own per-bag rate. Keep up to 70% of what you earn — paid weekly via Stripe.',
    color: 'text-green-600 bg-green-50',
  },
  {
    icon: Clock,
    title: 'Your hours, your rules',
    body: 'Go online when you\'re ready. Accept only the jobs that fit around your life.',
    color: 'text-brand-blue bg-blue-50',
  },
  {
    icon: Star,
    title: 'Build a 5-star profile',
    body: 'Every completed job builds your rating. Higher ratings unlock more jobs and the Elite & Legendary tier bonuses.',
    color: 'text-yellow-600 bg-yellow-50',
  },
  {
    icon: TrendingUp,
    title: 'Grow with tier rewards',
    body: 'Progress from Rookie → Elite → Legendary as you complete more jobs. Each tier unlocks higher per-bag rates.',
    color: 'text-purple-600 bg-purple-50',
  },
]

const STEPS = [
  { n: '1', title: 'Create your account', body: 'Register as a Laundry Pro. Takes 2 minutes.' },
  { n: '2', title: 'Complete onboarding', body: 'Verify your ID, equipment and pass the hygiene quiz.' },
  { n: '3', title: 'Police check (Fit2Work)', body: 'We run a background check — usually 1–3 business days.' },
  { n: '4', title: 'Connect Stripe', body: 'Link your bank account to receive weekly payouts.' },
  { n: '5', title: 'Go online & earn', body: 'Accept jobs in your area. Scan bags in and out. Get paid.' },
]

const TIERS = [
  { name: 'Rookie', range: '0–49 jobs', rate: 'Base rate', color: 'bg-gray-100 text-gray-700' },
  { name: 'Elite', range: '50–199 jobs', rate: '+10% bonus', color: 'bg-purple-100 text-purple-700' },
  { name: 'Legendary', range: '200+ jobs', rate: '+20% bonus', color: 'bg-yellow-100 text-yellow-700' },
]

const REQUIREMENTS = [
  'Residential washing machine & dryer (commercial grade for 200+ jobs/month)',
  'Clean, dedicated laundry space',
  'Australian resident with valid ID',
  'Clear police check (Fit2Work, funded by LaundrLink)',
  'Smartphone for the LaundrLink app',
]

export function BecomeProPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold text-gray-900">Become a Laundry Pro</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-purple-50 via-white to-white py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-8 w-8 text-purple-600" />
            </div>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="show" className="text-4xl md:text-5xl font-extrabold text-gray-900">
            Turn your washing machine<br />into a business
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} initial="hidden" animate="show" className="mt-5 text-lg text-gray-500 max-w-xl mx-auto">
            Join 200+ Laundry Pros earning money on their own schedule by washing clothes for busy Australians.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} initial="hidden" animate="show" className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="px-8 text-base" onClick={() => navigate('/register')}>
              Apply to Become a Pro
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {BENEFITS.map((b, i) => {
              const Icon = b.icon
              return (
                <motion.div key={b.title} variants={fadeUp} custom={i}>
                  <Card className="border-gray-100 h-full hover:shadow-md transition-shadow">
                    <CardContent className="p-6 flex gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${b.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{b.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">{b.body}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* Tier progression */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-2">Tier System</p>
            <h2 className="text-3xl font-bold text-gray-900">The more you do, the more you earn</h2>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-3 gap-4"
          >
            {TIERS.map((tier, i) => (
              <motion.div key={tier.name} variants={fadeUp} custom={i}>
                <Card className="text-center border-gray-100">
                  <CardContent className="p-6">
                    <Badge className={`mb-3 ${tier.color} border-0`}>{tier.name}</Badge>
                    <p className="text-sm text-gray-500">{tier.range}</p>
                    <p className="text-lg font-bold text-gray-900 mt-2">{tier.rate}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How to join */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-sm font-semibold text-brand-blue uppercase tracking-wider mb-2">Getting Started</p>
            <h2 className="text-3xl font-bold text-gray-900">5 steps to your first job</h2>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="space-y-4"
          >
            {STEPS.map((step, i) => (
              <motion.div key={step.n} variants={fadeUp} custom={i} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-brand-blue text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                  {step.n}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{step.body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-brand-teal" />
              Requirements
            </h2>
            <ul className="space-y-3">
              {REQUIREMENTS.map((req) => (
                <li key={req} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-brand-teal mt-0.5 shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-purple-600 text-white text-center">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="max-w-2xl mx-auto">
          <motion.h2 variants={fadeUp} className="text-3xl font-bold mb-3">Ready to start earning?</motion.h2>
          <motion.p variants={fadeUp} className="text-purple-200 mb-8">Apply takes under 5 minutes. Police check is free.</motion.p>
          <motion.div variants={fadeUp}>
            <Button
              size="lg"
              className="bg-white text-purple-600 hover:bg-purple-50 px-8 text-base"
              onClick={() => navigate('/register')}
            >
              Apply Now
            </Button>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
