// Structured JSON logger for all LaundrLink Edge Functions.
// Written first — every edge function imports this before any other util.

export type LogLevel = 'info' | 'warn' | 'error'

interface LogPayload {
  level: LogLevel
  event: string
  timestamp: string
  [key: string]: unknown
}

function log(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  const payload: LogPayload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...data,
  }
  // Supabase captures stdout as structured logs
  console.log(JSON.stringify(payload))
}

export const logger = {
  info(event: string, data?: Record<string, unknown>): void {
    log('info', event, data)
  },

  warn(event: string, data?: Record<string, unknown>): void {
    log('warn', event, data)
  },

  error(event: string, error: unknown, data?: Record<string, unknown>): void {
    const errorData =
      error instanceof Error
        ? { error_message: error.message, error_stack: error.stack }
        : { error_raw: String(error) }
    log('error', event, { ...errorData, ...data })
  },

  duration(event: string, startMs: number, data?: Record<string, unknown>): void {
    log('info', event, { duration_ms: Date.now() - startMs, ...data })
  },
}
