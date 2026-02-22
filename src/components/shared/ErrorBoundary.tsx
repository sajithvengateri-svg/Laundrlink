import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  /** Optional label shown in error UI (e.g. "Customer Portal") */
  portalName?: string
  /** Optional fallback UI override */
  fallback?: ReactNode
}

interface State {
  error: Error | null
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null, hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production this would ship to Sentry / Datadog
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null, hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    const { portalName } = this.props
    const { error } = this.state

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Something went wrong
            {portalName ? ` in ${portalName}` : ''}
          </h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            An unexpected error occurred. Your data is safe — try refreshing or tapping Reset below.
          </p>
          {error?.message && (
            <pre className="text-xs text-left bg-gray-100 text-gray-600 rounded-lg p-3 mb-6 overflow-auto max-h-24">
              {error.message}
            </pre>
          )}
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
            <Button onClick={this.handleReset}>
              Reset
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
