import { useEffect, useState } from 'react'
import { X, Keyboard } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQRScanner } from '@/hooks/useQRScanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface QRScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (qrCode: string) => void
  title?: string
  hint?: string
}

export function QRScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Scan QR Code',
  hint = 'Point the camera at a LaundrLink bag tag',
}: QRScannerModalProps) {
  const [manualEntry, setManualEntry] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [scanned, setScanned] = useState(false)

  const handleScan = (text: string) => {
    if (scanned) return // prevent double-fire
    setScanned(true)
    onScan(text)
    onClose()
  }

  const { state, error, start, stop, elementId } = useQRScanner({ onScan: handleScan })

  // Start scanner when modal opens, stop when it closes
  useEffect(() => {
    if (isOpen && !manualEntry) {
      setScanned(false)
      void start()
    }
    return () => {
      void stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, manualEntry])

  const handleManualSubmit = () => {
    const code = manualCode.trim()
    if (!code) return
    onScan(code)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-safe-top pb-3 bg-black/80">
          <div>
            <h2 className="text-white font-semibold text-lg">{title}</h2>
            <p className="text-white/60 text-sm">{hint}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-white"
            aria-label="Close scanner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scanner area */}
        <div className="flex-1 relative overflow-hidden">
          {manualEntry ? (
            <div className="flex flex-col items-center justify-center h-full px-6">
              <Keyboard className="h-12 w-12 text-white/30 mb-3" />
              <p className="text-white/50 text-sm text-center">
                Type the bag code below and tap Submit
              </p>
            </div>
          ) : (
            <>
              {/* html5-qrcode renders into this div */}
              <div id={elementId} className="w-full h-full" />

              {/* Targeting overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-64 h-64">
                  {/* Corner brackets */}
                  {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
                    <div
                      key={corner}
                      className={`absolute w-8 h-8 border-brand-blue border-2 ${
                        corner === 'tl'
                          ? 'top-0 left-0 border-r-0 border-b-0 rounded-tl-sm'
                          : corner === 'tr'
                          ? 'top-0 right-0 border-l-0 border-b-0 rounded-tr-sm'
                          : corner === 'bl'
                          ? 'bottom-0 left-0 border-r-0 border-t-0 rounded-bl-sm'
                          : 'bottom-0 right-0 border-l-0 border-t-0 rounded-br-sm'
                      }`}
                    />
                  ))}
                  {/* Scan line animation */}
                  <motion.div
                    className="absolute left-2 right-2 h-0.5 bg-brand-blue/80"
                    animate={{ top: ['10%', '90%', '10%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              </div>

              {/* Status overlay */}
              {state === 'starting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="text-white text-sm">Starting camera…</div>
                </div>
              )}

              {state === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 px-6">
                  <p className="text-red-400 text-sm text-center">
                    {error ?? 'Camera access denied. Please allow camera permissions and try again.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Fixed bottom manual-entry area — always visible */}
        <div className="px-4 pt-3 pb-4 pb-safe-bottom bg-black/90 border-t border-white/10">
          {manualEntry ? (
            <div className="space-y-3">
              <Input
                className="h-12 bg-white text-black text-lg font-mono placeholder:text-gray-400 border-0"
                placeholder="e.g. LL-BAG-001"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleManualSubmit}
                  disabled={!manualCode.trim()}
                  className="flex-1 h-12 bg-white text-black font-semibold text-base hover:bg-gray-100"
                >
                  Submit
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setManualEntry(false)}
                  className="h-12 text-white/70 hover:text-white px-4"
                >
                  Camera
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setManualEntry(true)}
              className="w-full h-14 bg-white text-black font-semibold text-base hover:bg-gray-100 rounded-xl"
            >
              <Keyboard className="h-5 w-5 mr-2" />
              Type Code Manually
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
