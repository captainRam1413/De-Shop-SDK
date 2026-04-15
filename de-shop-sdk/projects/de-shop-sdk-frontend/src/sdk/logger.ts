/**
 * De-Shop SDK — Debug Logger
 * ───────────────────────────
 * Scoped console logger that only outputs when debug mode is enabled.
 */

export class Logger {
  private enabled: boolean
  private prefix = '[DeShop]'

  constructor(enabled = false) {
    this.enabled = enabled
  }

  enable() { this.enabled = true }
  disable() { this.enabled = false }

  info(message: string, ...data: any[]) {
    if (this.enabled) console.log(`${this.prefix} ${message}`, ...data)
  }

  success(message: string, ...data: any[]) {
    if (this.enabled) console.log(`${this.prefix} ✓ ${message}`, ...data)
  }

  warn(message: string, ...data: any[]) {
    if (this.enabled) console.warn(`${this.prefix} ⚠ ${message}`, ...data)
  }

  error(message: string, ...data: any[]) {
    // Errors always log, even when debug is off
    console.error(`${this.prefix} ✗ ${message}`, ...data)
  }

  time(label: string): () => void {
    if (!this.enabled) return () => {}
    const start = performance.now()
    this.info(`${label}...`)
    return () => {
      const ms = (performance.now() - start).toFixed(1)
      this.success(`${label} (${ms}ms)`)
    }
  }
}
