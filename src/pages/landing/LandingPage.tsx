import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import {
  QrCode,
  Truck,
  Sparkles,
  ShieldCheck,
  Clock,
  Star,
  ChevronRight,
  CheckCircle,
  Smartphone,
  Building2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
}

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

// ── Data ──────────────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: QrCode,
    title: 'Book & Get Your Bag',
    body: 'Place an order and receive your LaundrLink smart bag with a unique QR code — your laundry\'s digital passport.',
    color: 'text-brand-blue bg-blue-50',
  },
  {
    step: '02',
    icon: Truck,
    title: 'Driver Picks Up',
    body: 'A driver scans your bag QR at pickup. Every handoff is photo-verified so you always know where your laundry is.',
    color: 'text-purple-600 bg-purple-50',
  },
  {
    step: '03',
    icon: Sparkles,
    title: 'Cleaned by Experts',
    body: 'Your items go to a nearby Hub or certified Laundry Pro. Track progress in real-time — no guessing.',
    color: 'text-brand-teal bg-teal-50',
  },
  {
    step: '04',
    icon: CheckCircle,
    title: 'Delivered Fresh',
    body: 'The driver delivers your clean laundry. Confirm receipt with a digital signature — order complete.',
    color: 'text-green-600 bg-green-50',
  },
]

const FEATURES = [
  {
    icon: QrCode,
    title: 'QR Chain of Custody',
    body: 'Every handoff is scanned, photo-verified and timestamped. If something goes wrong, you\'ll know exactly where.',
  },
  {
    icon: ShieldCheck,
    title: 'Vetted Providers',
    body: 'All Hubs and Laundry Pros pass Fit2Work police checks and a rigorous onboarding process.',
  },
  {
    icon: Clock,
    title: 'Real-Time Tracking',
    body: 'Watch your bag move from pickup → hub → pro → delivery on a live map, just like a food delivery app.',
  },
  {
    icon: Smartphone,
    title: 'NDIS Compliant',
    body: 'Automatic invoice generation for NDIS participants with support item codes and PDF downloads.',
  },
  {
    icon: Star,
    title: 'Loyalty Rewards',
    body: 'Earn 10 points per dollar spent. Redeem for discounts. Refer friends and both of you get $10 off.',
  },
  {
    icon: Users,
    title: 'Multi-Party Payouts',
    body: 'Hubs, Pros and Drivers all get paid automatically via Stripe Connect — transparent, instant splits.',
  },
]

const PRICING_TIERS = [
  {
    name: 'Wash & Fold',
    price: '$4.50',
    unit: '/kg',
    features: ['Washed & folded', 'Returned in 48h', 'Photo-verified handoffs', 'SMS + app notifications'],
    color: 'border-gray-200',
    badge: null,
  },
  {
    name: 'Wash & Iron',
    price: '$7.00',
    unit: '/kg',
    features: ['Washed, pressed & hung', 'Returned in 72h', 'Photo-verified handoffs', 'SMS + app notifications'],
    color: 'border-brand-blue ring-1 ring-brand-blue',
    badge: 'Most Popular',
  },
  {
    name: 'Dry Clean',
    price: '$12.00',
    unit: '/item',
    features: ['Professional dry cleaning', 'Returned in 5 days', 'Item-level tracking', 'NDIS invoicing available'],
    color: 'border-gray-200',
    badge: null,
  },
]

const STATS = [
  { value: '50+', label: 'Partner Hubs' },
  { value: '200+', label: 'Laundry Pros' },
  { value: '10,000+', label: 'Orders Delivered' },
  { value: '4.9★', label: 'Average Rating' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function NavBar() {
  const navigate = useNavigate()
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-blue flex items-center justify-center">
            <QrCode className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">LaundrLink</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
          <a href="/find-hubs" className="hover:text-gray-900 transition-colors">Find Hubs</a>
          <a href="/become-pro" className="hover:text-gray-900 transition-colors">Become a Pro</a>
          <a href="/partner" className="hover:text-gray-900 transition-colors">Partner</a>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Log In</Button>
          <Button size="sm" onClick={() => navigate('/register')}>Get Started</Button>
        </div>
      </div>
    </nav>
  )
}

function HeroSection() {
  const navigate = useNavigate()
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white py-24 px-6">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-16 right-0 w-96 h-96 bg-brand-blue/5 rounded-full blur-3xl translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-teal/5 rounded-full blur-3xl -translate-x-1/2" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show">
          <Badge className="mb-6 bg-blue-50 text-brand-blue border-blue-100 text-xs font-medium px-3 py-1">
            QR-tracked laundry — every step verified
          </Badge>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          custom={1}
          initial="hidden"
          animate="show"
          className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight"
        >
          Laundry with a
          <br />
          <span className="text-brand-blue">chain of custody</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          custom={2}
          initial="hidden"
          animate="show"
          className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed"
        >
          LaundrLink connects you to vetted hubs and pros, tracks your bag at every handoff with QR codes, and delivers fresh laundry to your door — all with real-time visibility.
        </motion.p>

        <motion.div
          variants={fadeUp}
          custom={3}
          initial="hidden"
          animate="show"
          className="mt-10 flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button size="lg" className="text-base px-8 h-12" onClick={() => navigate('/register')}>
            Book Your First Pickup
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="text-base px-8 h-12" onClick={() => navigate('/find-hubs')}>
            Find Nearby Hubs
          </Button>
        </motion.div>

        {/* Bag journey animation */}
        <motion.div
          variants={fadeUp}
          custom={4}
          initial="hidden"
          animate="show"
          className="mt-16 flex items-center justify-center gap-2 text-sm text-gray-400"
        >
          {['Pickup', 'Hub', 'Washed', 'Delivered'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-lg">
                  {['🏠', '🏢', '✨', '📦'][i]}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </motion.div>
              {i < 3 && (
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                  className="w-6 h-px bg-brand-blue mb-4"
                />
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function StatsBar() {
  return (
    <section className="border-y border-gray-100 bg-white py-8 px-6">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
      >
        {STATS.map((s) => (
          <motion.div key={s.label} variants={fadeUp} className="text-center">
            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-brand-blue uppercase tracking-wider mb-2">How It Works</p>
          <h2 className="text-4xl font-bold text-gray-900">Fresh laundry in 4 steps</h2>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div key={step.step} variants={fadeUp} custom={i} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px border-t-2 border-dashed border-gray-200 z-0 -translate-y-1/2" style={{ width: 'calc(100% - 2rem)', left: 'calc(100% - 1rem)' }} />
                )}
                <Card className="relative z-10 h-full border-gray-100 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${step.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-300">{step.step}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section className="py-24 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-brand-blue uppercase tracking-wider mb-2">Why LaundrLink</p>
          <h2 className="text-4xl font-bold text-gray-900">Built for trust, not just convenience</h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto">
            Most laundry apps just book a service. We built a full logistics platform with verified chain of custody at every step.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div key={f.title} variants={fadeUp} custom={i}>
                <Card className="h-full border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5 text-brand-blue" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

function PricingSection() {
  const navigate = useNavigate()
  return (
    <section id="pricing" className="py-24 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-brand-blue uppercase tracking-wider mb-2">Pricing</p>
          <h2 className="text-4xl font-bold text-gray-900">Simple, transparent pricing</h2>
          <p className="mt-4 text-gray-500">No hidden fees. Pickup and delivery included.</p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {PRICING_TIERS.map((tier, i) => (
            <motion.div key={tier.name} variants={fadeUp} custom={i}>
              <Card className={`h-full border-2 ${tier.color} relative`}>
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-brand-blue text-white border-0 text-xs px-3">{tier.badge}</Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-1">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                    <span className="text-gray-500 text-sm">{tier.unit}</span>
                  </div>
                  <ul className="space-y-3">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-brand-teal mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-6"
                    variant={tier.badge ? 'default' : 'outline'}
                    onClick={() => navigate('/register')}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="text-center text-sm text-gray-400 mt-8"
        >
          Prices are indicative. Final pricing set by your Hub or Pro provider. NDIS invoicing available at no extra charge.
        </motion.p>
      </div>
    </section>
  )
}

function CtaBanner() {
  const navigate = useNavigate()
  return (
    <section className="py-20 px-6 bg-brand-blue">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="max-w-4xl mx-auto text-center text-white"
      >
        <motion.h2 variants={fadeUp} className="text-4xl font-bold mb-4">
          Ready to hand over the laundry?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-blue-100 text-lg mb-10">
          Join thousands of Australians who trust LaundrLink with their clothes.
        </motion.p>
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            className="bg-white text-brand-blue hover:bg-blue-50 text-base px-8 h-12"
            onClick={() => navigate('/register')}
          >
            Book a Pickup
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/50 text-white hover:bg-white/10 text-base px-8 h-12"
            onClick={() => navigate('/become-pro')}
          >
            Earn as a Pro
          </Button>
        </motion.div>
      </motion.div>
    </section>
  )
}

function MarketingLinksSection() {
  const navigate = useNavigate()
  return (
    <section className="py-16 px-6 bg-gray-50 border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            {
              icon: Users,
              title: 'Become a Laundry Pro',
              body: 'Turn your washing machine into a business. Set your own hours, earn per job, and build a 5-star rating.',
              cta: 'Learn More',
              path: '/become-pro',
              color: 'text-purple-600 bg-purple-50',
            },
            {
              icon: Building2,
              title: 'Partner Your Business',
              body: 'Already a laundromat, dry cleaner or commercial laundry? Join the Hub network and grow your throughput.',
              cta: 'Become a Hub',
              path: '/partner',
              color: 'text-brand-blue bg-blue-50',
            },
            {
              icon: QrCode,
              title: 'Find Nearby Hubs',
              body: 'See all partner hubs and pros in your suburb — ratings, capacity and service types at a glance.',
              cta: 'View Map',
              path: '/find-hubs',
              color: 'text-brand-teal bg-teal-50',
            },
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div key={item.title} variants={fadeUp} custom={i}>
                <Card
                  className="h-full cursor-pointer hover:shadow-md transition-shadow border-gray-100"
                  onClick={() => navigate(item.path)}
                >
                  <CardContent className="p-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed mb-4">{item.body}</p>
                    <span className="text-sm font-medium text-brand-blue flex items-center gap-1">
                      {item.cta} <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-brand-blue flex items-center justify-center">
                <QrCode className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-bold text-white">LaundrLink</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Logistics-grade laundry with verified chain of custody at every handoff.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
            <div>
              <p className="text-white font-medium mb-3">Platform</p>
              <ul className="space-y-2">
                <li><a href="/#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="/#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/find-hubs" className="hover:text-white transition-colors">Find Hubs</a></li>
              </ul>
            </div>
            <div>
              <p className="text-white font-medium mb-3">Providers</p>
              <ul className="space-y-2">
                <li><a href="/become-pro" className="hover:text-white transition-colors">Become a Pro</a></li>
                <li><a href="/partner" className="hover:text-white transition-colors">Partner Hub</a></li>
              </ul>
            </div>
            <div>
              <p className="text-white font-medium mb-3">Account</p>
              <ul className="space-y-2">
                <li><a href="/login" className="hover:text-white transition-colors">Log In</a></li>
                <li><a href="/register" className="hover:text-white transition-colors">Sign Up</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col md:flex-row justify-between gap-2 text-xs">
          <p>© {new Date().getFullYear()} LaundrLink Pty Ltd. All rights reserved.</p>
          <p>ABN 00 000 000 000 · Made in Australia</p>
        </div>
      </div>
    </footer>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => {
    if (user) navigate('/orders', { replace: true })
  }, [user, navigate])

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <HeroSection />
      <StatsBar />
      <HowItWorksSection />
      <FeaturesSection />
      <PricingSection />
      <CtaBanner />
      <MarketingLinksSection />
      <Footer />
    </div>
  )
}
