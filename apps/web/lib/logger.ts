/**
 * Structured logger and error telemetry for Free Music.
 * Formats events with timestamps, log level, and error stacks.
 */

export type LogLevel = 'info' | 'warn' | 'error'

export interface LogPayload {
  message: string
  context?: Record<string, unknown>
  error?: Error | unknown
}

class Logger {
  private format(level: LogLevel, payload: LogPayload): string {
    const timestamp = new Date().toISOString()
    const meta = payload.context ? ` | Context: ${JSON.stringify(payload.context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${payload.message}${meta}`
  }

  info(message: string, context?: Record<string, unknown>) {
    console.log(this.format('info', { message, context }))
  }

  warn(message: string, context?: Record<string, unknown>) {
    console.warn(this.format('warn', { message, context }))
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
    console.error(this.format('error', { message, error, context }))
    if (error instanceof Error && error.stack) {
      console.error(error.stack)
    }
  }
}

export const logger = new Logger()
