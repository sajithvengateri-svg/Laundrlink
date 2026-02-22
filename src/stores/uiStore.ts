import { create } from 'zustand'

interface Toast {
  id: string
  title?: string
  description: string
  variant?: 'default' | 'destructive' | 'success'
}

interface UIState {
  toasts: Toast[]
  isScannerOpen: boolean
  isOffline: boolean

  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  setScanner: (open: boolean) => void
  setOffline: (offline: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  isScannerOpen: false,
  isOffline: false,

  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: crypto.randomUUID() },
      ],
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setScanner: (isScannerOpen) => set({ isScannerOpen }),

  setOffline: (isOffline) => set({ isOffline }),
}))
