import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

// Reset handlers after each test
afterEach(() => {
  cleanup()
  server.resetHandlers()
})

// Close MSW server after all tests
afterAll(() => server.close())

// Mock window.matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock navigator.geolocation
Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: {
    getCurrentPosition: (success: PositionCallback) =>
      success({
        coords: {
          latitude: -33.8688,
          longitude: 151.2093,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition),
    watchPosition: () => 0,
    clearWatch: () => {},
  },
})

// Mock html5-qrcode (no camera in test environment)
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
    getState: vi.fn().mockReturnValue(0),
  })),
  Html5QrcodeSupportedFormats: { QR_CODE: 0 },
  Html5QrcodeScanner: vi.fn(),
}))

// Mock Supabase Storage
vi.mock('@/lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase')>()
  return {
    ...actual,
    storage: {
      handoffPhotos: { upload: vi.fn().mockResolvedValue({ data: { path: 'test/photo.jpg' }, error: null }) },
      signatures: { upload: vi.fn().mockResolvedValue({ data: { path: 'test/sig.png' }, error: null }) },
      ndisInvoices: { upload: vi.fn().mockResolvedValue({ data: { path: 'test/invoice.pdf' }, error: null }) },
      avatars: { upload: vi.fn().mockResolvedValue({ data: { path: 'test/avatar.jpg' }, error: null }) },
      bagQrCodes: { upload: vi.fn().mockResolvedValue({ data: { path: 'test/qr.png' }, error: null }) },
    },
  }
})
