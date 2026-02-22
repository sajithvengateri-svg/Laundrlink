import { useState, useRef, useCallback } from 'react'
import type { QRScanner, QRConfig } from '@/lib/qr'

type ScannerState = 'idle' | 'starting' | 'scanning' | 'error'

interface UseQRScannerOptions {
  onScan: (text: string) => void
  onError?: (error: string) => void
  config?: Partial<QRConfig>
}

export function useQRScanner({ onScan, onError, config }: UseQRScannerOptions) {
  const [state, setState] = useState<ScannerState>('idle')
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<QRScanner | null>(null)
  const elementId = 'qr-scanner-container'

  const start = useCallback(async () => {
    setState('starting')
    setError(null)

    try {
      const { createQRScanner, getRearCameraConstraint } = await import('@/lib/qr')
      const scanner = await createQRScanner(elementId)
      scannerRef.current = scanner

      await scanner.start(
        getRearCameraConstraint(),
        config ?? {},
        (text) => {
          // Haptic feedback on scan (supported on iOS 16+)
          if ('vibrate' in navigator) navigator.vibrate(50)
          onScan(text)
        },
        onError
      )

      setState('scanning')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start camera'
      setError(message)
      setState('error')
    }
  }, [onScan, onError, config])

  const stop = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch {
        // Ignore stop errors (scanner may already be stopped)
      }
      scannerRef.current = null
    }
    setState('idle')
    setError(null)
  }, [])

  return { state, error, start, stop, elementId, isScanning: state === 'scanning' }
}
