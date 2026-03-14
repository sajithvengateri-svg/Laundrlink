import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface Bag {
  id: string
  qr_code: string
  current_status: string | null
}

export default function QRCodesPage() {
  const [bags, setBags] = useState<Bag[]>([])
  const [qrImages, setQrImages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('bags')
        .select('id, qr_code, current_status')
        .order('qr_code', { ascending: true })

      const bagList = (data ?? []) as Bag[]
      setBags(bagList)

      // Generate QR code data URLs
      const images: Record<string, string> = {}
      for (const bag of bagList) {
        try {
          images[bag.id] = await QRCode.toDataURL(bag.qr_code, {
            width: 256,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          })
        } catch {
          // skip failed QR generation
        }
      }
      setQrImages(images)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Codes</h1>
          <p className="text-sm text-gray-500">{bags.length} bags in the system</p>
        </div>
        <Button onClick={() => window.print()} className="gap-2 print:hidden">
          <Printer className="h-4 w-4" />
          Print QR Codes
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
        {bags.map((bag) => (
          <Card key={bag.id} className="print:shadow-none print:border">
            <CardContent className="flex flex-col items-center py-6">
              {qrImages[bag.id] ? (
                <img
                  src={qrImages[bag.id]}
                  alt={`QR code for ${bag.qr_code}`}
                  className="w-48 h-48 print:w-36 print:h-36"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded">
                  <p className="text-sm text-gray-400">Failed</p>
                </div>
              )}
              <p className="mt-3 text-lg font-bold text-gray-900 font-mono">{bag.qr_code}</p>
              <p className="text-xs text-gray-400 capitalize print:hidden">
                {bag.current_status?.replace(/_/g, ' ') ?? 'unassigned'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:grid-cols-3, .print\\:grid-cols-3 * { visibility: visible; }
          .print\\:hidden { display: none !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  )
}
