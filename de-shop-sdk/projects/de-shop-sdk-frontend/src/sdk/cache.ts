/**
 * De-Shop SDK — TTL Cache
 * ────────────────────────
 * Simple in-memory cache with time-to-live expiration.
 * Auto-invalidates on mutations (mint, buy, list, transfer).
 */

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class Cache {
  private store = new Map<string, CacheEntry<any>>()
  private defaultTTL: number
  private enabled: boolean

  constructor(ttl = 30_000, enabled = true) {
    this.defaultTTL = ttl
    this.enabled = enabled
  }

  /** Get a cached value, or undefined if expired/missing. */
  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value as T
  }

  /** Set a value with optional custom TTL (ms). */
  set<T>(key: string, value: T, ttl?: number): void {
    if (!this.enabled) return
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
    })
  }

  /** Delete a specific key. */
  delete(key: string): void {
    this.store.delete(key)
  }

  /** Invalidate all keys matching a prefix. */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key)
    }
  }

  /** Clear the entire cache. */
  clear(): void {
    this.store.clear()
  }

  /** Number of entries currently cached. */
  get size(): number {
    return this.store.size
  }
}
