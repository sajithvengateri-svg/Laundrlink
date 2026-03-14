import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, UserCheck, Building2, Truck, Package, Shield, QrCode, Keyboard, Hash, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

interface AccordionItemProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

function AccordionItem({ title, icon, children, defaultOpen = false }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="border-0 shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left flex items-center gap-3 px-4 py-3"
      >
        {icon}
        <span className="flex-1 text-sm font-semibold text-gray-800">{title}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 pb-4 px-4 text-sm text-gray-600 leading-relaxed space-y-2">
              {children}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-20">
        <div className="flex items-center gap-3 mb-2">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Help Centre</h1>
            <p className="text-sm text-gray-500">Everything you need to know about LaundrLink</p>
          </div>
        </div>

        {/* Getting Started */}
        <AccordionItem title="Getting Started" icon={<UserCheck className="h-5 w-5 text-brand-blue" />} defaultOpen>
          <p><strong>How to register:</strong> Tap "Get Started" on the landing page, enter your details, and verify your email. You'll be assigned the Customer role by default.</p>
          <p><strong>Understanding roles:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Customer</strong> — Place laundry orders, track progress, rate service</li>
            <li><strong>Hub</strong> — Laundromat operator, receives and processes bags</li>
            <li><strong>Driver</strong> — Picks up and delivers bags between customers and hubs</li>
            <li><strong>Pro</strong> — Washing professional assigned by the hub</li>
            <li><strong>Admin</strong> — Platform operator, manages settings and users</li>
          </ul>
        </AccordionItem>

        {/* For Customers */}
        <AccordionItem title="For Customers" icon={<Package className="h-5 w-5 text-brand-teal" />}>
          <p><strong>Placing an order:</strong> Go to your dashboard and tap "New Order". Fill in your pickup address, add items, choose a service type, and select dates.</p>
          <p><strong>Your bag code:</strong> After placing an order, a physical bag is assigned (e.g., LL-BAG-003). This code appears on your order detail page. The bag travels with your laundry through all 6 handoff steps.</p>
          <p><strong>Your OTP codes:</strong> You receive two 4-digit codes — one for pickup and one for delivery. Share the pickup code with your driver when they collect your bag. Share the delivery code when they return it.</p>
          <p><strong>Tracking your laundry:</strong> Your order detail page shows a real-time timeline of all 6 handoff steps. Each completed step shows a green checkmark and timestamp.</p>
          <p><strong>Rating:</strong> After delivery, you can rate the hub, driver, and pro.</p>
        </AccordionItem>

        {/* For Hub Operators */}
        <AccordionItem title="For Hub Operators" icon={<Building2 className="h-5 w-5 text-purple-500" />}>
          <p><strong>Receiving bags:</strong> When a driver arrives, go to Scan and select "Driver to Hub". Verify the bag using QR scan, OTP, or manual bag code entry.</p>
          <p><strong>Processing orders:</strong> After receiving a bag, select "Hub to Pro" to assign it for washing. When washing is complete, select "Pro to Hub" to mark it returned.</p>
          <p><strong>Dispatching:</strong> When the clean bag is ready for delivery, select "Hub to Driver" to hand it to the delivery driver.</p>
          <p><strong>Verification methods:</strong> You can verify bags three ways: scan the QR code on the bag tag, enter the customer's 4-digit OTP, or type the bag code manually. Your hub can override the platform defaults in Settings.</p>
          <p><strong>Capacity:</strong> Your dashboard shows current capacity usage. Manage your maximum capacity in Settings.</p>
        </AccordionItem>

        {/* For Drivers */}
        <AccordionItem title="For Drivers" icon={<Truck className="h-5 w-5 text-amber-500" />}>
          <p><strong>Picking up from customers:</strong> Go to Scan, select "Customer to Driver". Ask the customer for their OTP code, or scan the QR code on the bag tag.</p>
          <p><strong>Verification:</strong> You have three options:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>QR Scan</strong> — Point your camera at the QR code on the bag</li>
            <li><strong>OTP Code</strong> — Enter the 4-digit code the customer shows you</li>
            <li><strong>Bag Code</strong> — Type the bag code (e.g., LL-BAG-001) manually</li>
          </ul>
          <p><strong>Delivering to hubs:</strong> At the hub, select "Driver to Hub" and verify the bag.</p>
          <p><strong>Delivering to customers:</strong> Select "Driver to Customer", verify with the customer's delivery OTP.</p>
        </AccordionItem>

        {/* Chain of Custody */}
        <AccordionItem title="The 6-Step Chain of Custody" icon={<Shield className="h-5 w-5 text-red-500" />}>
          <div className="space-y-3">
            {[
              { step: 1, label: 'Customer → Driver (Pickup)', desc: 'Driver collects bag from customer\'s door' },
              { step: 2, label: 'Driver → Hub (Drop-off)', desc: 'Driver brings bag to the laundromat' },
              { step: 3, label: 'Hub → Pro (Processing)', desc: 'Hub assigns bag for washing' },
              { step: 4, label: 'Pro → Hub (Return)', desc: 'Clean bag returned to hub' },
              { step: 5, label: 'Hub → Driver (Dispatch)', desc: 'Hub sends bag out for delivery' },
              { step: 6, label: 'Driver → Customer (Delivery)', desc: 'Driver delivers clean bag to customer' },
            ].map(({ step, label, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {step}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{label}</p>
                  <p className="text-gray-500 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </AccordionItem>

        {/* Verification Methods */}
        <AccordionItem title="Verification Methods" icon={<QrCode className="h-5 w-5 text-indigo-500" />}>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <QrCode className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">QR Code</p>
                <p>Scan the QR code printed on the bag tag. Fastest method when you have camera access.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Keyboard className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">OTP Code</p>
                <p>Customer shares their 4-digit code with the driver or hub staff. Great for phone-based verification.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Hash className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800">Manual Bag Code</p>
                <p>Type the bag code (e.g., LL-BAG-001) directly. Works on any device, no camera needed.</p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">Admin sets platform defaults. Hub operators can override in their settings.</p>
        </AccordionItem>

        {/* Troubleshooting */}
        <AccordionItem title="Troubleshooting" icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}>
          <div className="space-y-3">
            <div>
              <p className="font-medium text-gray-800">"Lookup failed" error</p>
              <p>Make sure you're entering the bag code (LL-BAG-XXX), not the order number. Bag codes start with "LL-BAG-".</p>
            </div>
            <div>
              <p className="font-medium text-gray-800">Camera not working</p>
              <p>Use OTP code or manual bag code entry instead. These work on all devices without camera permissions.</p>
            </div>
            <div>
              <p className="font-medium text-gray-800">Order not updating</p>
              <p>Tap the refresh button on the order detail page. The timeline updates automatically but may take a few seconds.</p>
            </div>
            <div>
              <p className="font-medium text-gray-800">OTP doesn't match</p>
              <p>Ask the customer to check their order detail page for the correct code. Pickup and delivery have different OTP codes.</p>
            </div>
          </div>
        </AccordionItem>
      </div>
    </div>
  )
}

export default HelpPage
