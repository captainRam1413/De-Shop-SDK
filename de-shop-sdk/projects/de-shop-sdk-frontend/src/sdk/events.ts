/**
 * De-Shop SDK — Event Emitter
 * ────────────────────────────
 * Type-safe event system for SDK lifecycle events.
 *
 * @example
 * ```ts
 * sdk.on('mint', (asset) => console.log('Minted:', asset.name))
 * sdk.on('buy', (result) => console.log('Bought for', result.amount_paid))
 * sdk.on('error', (err) => reportError(err))
 *
 * // Remove listener
 * const unsub = sdk.on('mint', handler)
 * unsub()
 *
 * // One-time listener
 * sdk.once('buy', (result) => celebrate())
 * ```
 */

type Listener = (...args: any[]) => void

export class EventEmitter<Events extends Record<string, Listener>> {
  private _listeners = new Map<keyof Events, Set<Listener>>()

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<K extends keyof Events>(event: K, listener: Events[K]): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event)!.add(listener as Listener)

    // Return unsubscribe function
    return () => {
      this._listeners.get(event)?.delete(listener as Listener)
    }
  }

  /**
   * Subscribe to an event, but only fire the listener once.
   */
  once<K extends keyof Events>(event: K, listener: Events[K]): () => void {
    const wrapped = ((...args: any[]) => {
      this.off(event, wrapped as unknown as Events[K])
      ;(listener as Listener)(...args)
    }) as unknown as Events[K]
    return this.on(event, wrapped)
  }

  /**
   * Remove a specific listener from an event.
   */
  off<K extends keyof Events>(event: K, listener: Events[K]): void {
    this._listeners.get(event)?.delete(listener as Listener)
  }

  /**
   * Remove all listeners, or all listeners for a specific event.
   */
  removeAllListeners(event?: keyof Events): void {
    if (event) {
      this._listeners.delete(event)
    } else {
      this._listeners.clear()
    }
  }

  /**
   * Emit an event with arguments. Called internally by the SDK.
   */
  protected emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): void {
    this._listeners.get(event)?.forEach((listener) => {
      try {
        listener(...args)
      } catch (e) {
        console.error(`[DeShop] Error in ${String(event)} listener:`, e)
      }
    })
  }

  /**
   * Get the number of listeners for an event.
   */
  listenerCount(event: keyof Events): number {
    return this._listeners.get(event)?.size ?? 0
  }
}
