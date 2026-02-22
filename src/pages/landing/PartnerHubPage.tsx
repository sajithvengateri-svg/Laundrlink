import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import {
  ArrowLeft,
  Building2,
  TrendingUp,
  Users,
  QrCode,
  CreditCard,
  BarChart2,
  ChevronRight,
  CheckCircle,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

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
    icon: TrendingUp,
    title: 'Increase throughput',
    body: 'Fill idle capacity during off-peak hours with LaundrLink overflow orders — no extra marketing needed.',
    color: 'text-brand-blue bg-blue-50',
  },
  {
    icon: Users,
    title: 'Access new customers',
    body: 'Tap into LaundrLink\'s growing customer base. Appear on the map with ratings, capacity and service types visible.',
    color: 'text-green-600 bg-green-50',
  },
  {
    icon: CreditCard,
    title: 'Weekly Stripe payouts',
    body: 'Receive your 70% revenue share automatically each week via Stripe Connect — direct to your bank account.',
    color: 'text-purple-600 bg-purple-50',
  },
  {
    icon: QrCode,
    title: 'Full logistics support',
    body: 'Driver pickup and delivery handled by LaundrLink. You focus on cleaning; we handle everything else.',
    color: 'text-brand-teal bg-teal-50',
  },
  {
    icon: BarChart2,
    title: 'Real-time analytics',
    body: 'Track daily volume, weekly revenue, capacity utilisation and ratings from your hub portal dashboard.',
    color: 'text-orange-600 bg-orange-50',
  },
  {
    icon: ShieldCheck,
    title: 'NDIS eligible revenue',
    body: 'LaundrLink handles NDIS invoicing automatically. Your hub can service NDIS participants without extra admin.',
    color: 'text-red-600 bg-red-50',
  },
]

const STEPS = [
  { n: '1', title: 'Apply as a Hub partner', body: 'Tell us about your business: location, capacity and services.' },
  { n: '2', title: 'Verification & approval', body: 'Our team verifies your credentials. Approval typically within 48 hours.' },
  { n: '3', title: 'Set up your profile', body: 'Configure operating hours, service types and pricing through your portal.' },
  { n: '4', title: 'Connect Stripe', body: 'Link your business bank account for weekly automatic payouts.' },
  { n: '5', title: 'Go live', body: 'You appear on the LaundrLink map. Orders start flowing in.' },
]

const REQUIREMENTS = [
  'Commercial or residential laundry facility with capacity ≥ 5 orders/day',
  'ABN registered Australian business',
  'Public liability insurance (minimum $10M cover)',
  'Operating hours of at least 5 days per week',
  'Commitment to 48-hour turnaround for standard services',
  'Agreement to LaundrLink quality and hygiene standards',
]

const COMPARE_COLS = [
  { label: 'Go live cost', hub: 'Free', traditional: '$2,000+' },
  { label: 'Customer acquisition', hub: 'Handled by LaundrLink', traditional: 'Your problem' },
  { label: 'Pickup & delivery', hub: 'LaundrLink drivers', traditional: 'You arrange' },
  { label: 'Invoicing & NDIS', hub: 'Automated', traditional: 'Manual' },
  { label: 'Payment collection', hub: 'Weekly Stripe payout', traditional: 'Chase invoices' },
  { label: 'Analytics', hub: 'Built-in portal', traditional: 'Spreadsheets' },
]

export function PartnerHubPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold text-gray-900">Partner Your Business</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 via-white to-white py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-6">
              <Building2 className="h-8 w-8 text-brand-blue" />
            </div>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="show"
            className="text-4xl md:text-5xl font-extrabold text-gray-900">
            Grow your laundry business<br />without the marketing
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} initial="hidden" animate="show"
            className="mt-5 text-lg text-gray-500 max-w-xl mx-auto">
            Join the LaundrLink Hub network and receive a steady stream of orders, handled logistics, and weekly payouts — all through your dedicated portal.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} initial="hidden" animate="show"
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="px-8 text-base" onClick={() => navigate('/register')}>
              Apply to Become a Hub
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="px-8 text-base" onClick={() => navigate('/find-hubs')}>
              View Existing Hubs
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Benefits grid */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-sm font-semibold text-brand-blue uppercase tracking-wider mb-2">Why Partner</p>
            <h2 className="text-3xl font-bold text-gray-900">Everything handled — you just clean</h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {BENEFITS.map((b, i) => {
              const Icon = b.icon
              return (
                <motion.div key={b.title} variants={fadeUp} custom={i}>
                  <Card className="border-gray-100 h-full hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${b.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{b.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{b.body}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl font-bold text-gray-900">LaundrLink vs going it alone</h2>
          </motion.div>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <Card className="border-gray-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_1fr] text-sm">
                <div className="p-3 font-medium text-gray-400 bg-gray-50 border-b border-r border-gray-100" />
                <div className="p-3 font-semibold text-brand-blue bg-blue-50 border-b border-r border-gray-100 text-center">LaundrLink Hub</div>
                <div className="p-3 font-semibold text-gray-500 bg-gray-50 border-b border-gray-100 text-center">Solo Operation</div>
                {COMPARE_COLS.map((row, i) => (
                  <>
                    <div key={`label-${i}`} className="p-3 text-gray-600 border-b border-r border-gray-100 bg-white">{row.label}</div>
                    <div key={`hub-${i}`} className="p-3 text-gray-900 font-medium border-b border-r border-gray-100 text-center bg-blue-50/30">{row.hub}</div>
                    <div key={`trad-${i}`} className="p-3 text-gray-500 border-b border-gray-100 text-center">{row.traditional}</div>
                  </>
                ))}
              </div>
            </Card>
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
            <p className="text-sm font-semibold text-brand-blue uppercase tracking-wider mb-2">Onboarding</p>
            <h2 className="text-3xl font-bold text-gray-900">From application to live in 5 days</h2>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="space-y-5"
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
              Hub Requirements
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
      <section className="py-16 px-6 bg-brand-blue text-white text-center">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="max-w-2xl mx-auto">
          <motion.h2 variants={fadeUp} className="text-3xl font-bold mb-3">Ready to grow your throughput?</motion.h2>
          <motion.p variants={fadeUp} className="text-blue-100 mb-8">No upfront costs. No lock-in. Apply in 5 minutes.</motion.p>
          <motion.div variants={fadeUp}>
            <Button
              size="lg"
              className="bg-white text-brand-blue hover:bg-blue-50 px-8 text-base"
              onClick={() => navigate('/register')}
            >
              Apply as a Hub Partner
            </Button>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
