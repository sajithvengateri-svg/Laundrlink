// Dynamic import factory for html5-qrcode — keeps ~500KB off the main bundle.
// Only loaded when the scanner is actually opened.

export interface QRConfig {
  fps?: number
  qrbox?: { width: number; height: number }
  aspectRatio?: number
  disableFlip?: boolean
}

export interface QRScanner {
  start(
    cameraId: string | { facingMode: string },
    config: QRConfig,
    onSuccess: (text: string) => void,
    onError?: (error: string) => void
  ): Promise<void>
  stop(): Promise<void>
  clear(): Promise<void>
}

const DEFAULT_CONFIG: QRConfig = {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  aspectRatio: 1.0,
  disableFlip: false,
}

export async function createQRScanner(elementId: string): Promise<QRScanner> {
  // Dynamic import — not bundled until first use
  const { Html5Qrcode } = await import('html5-qrcode')
  const scanner = new Html5Qrcode(elementId)

  return {
    async start(cameraId, config, onSuccess, onError) {
      // DEFAULT_CONFIG always provides required fields like `fps`
      await scanner.start(cameraId, { ...DEFAULT_CONFIG, ...config } as Required<Pick<QRConfig, 'fps'>> & QRConfig, onSuccess, onError)
    },
    async stop() {
      if (scanner.isScanning) {
        await scanner.stop()
      }
    },
    async clear() {
      await scanner.clear()
    },
  }
}

export async function getAvailableCameras() {
  const { Html5Qrcode } = await import('html5-qrcode')
  return Html5Qrcode.getCameras()
}

// Prefer rear camera, fallback to any camera (iOS Safari compat)
export function getRearCameraConstraint(): { facingMode: string } | string {
  return { facingMode: 'environment' }
}
