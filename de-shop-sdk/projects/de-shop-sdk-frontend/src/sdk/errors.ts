/**
 * De-Shop SDK — Error Classes
 * ────────────────────────────
 * Typed error hierarchy for precise error handling.
 *
 * @example
 * ```ts
 * try {
 *   await sdk.mintNFT({ ... })
 * } catch (e) {
 *   if (e instanceof WalletNotConnectedError) {
 *     showConnectWalletModal()
 *   } else if (e instanceof InsufficientFundsError) {
 *     alert(`Need ${e.required} μALGO, have ${e.available}`)
 *   }
 * }
 * ```
 */

/** Base error for all De-Shop SDK errors. */
export class DeShopError extends Error {
  public readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'DeShopError'
    this.code = code
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Thrown when an operation requires a connected wallet but none is set. */
export class WalletNotConnectedError extends DeShopError {
  constructor(operation: string) {
    super(`Wallet not connected. Connect a wallet before calling ${operation}().`, 'WALLET_NOT_CONNECTED')
    this.name = 'WalletNotConnectedError'
  }
}

/**
 * Thrown when the wallet has insufficient ALGO balance for a transaction.
 */
export class InsufficientFundsError extends DeShopError {
  public readonly required: number
  public readonly available: number

  constructor(required: number, available: number) {
    super(
      `Insufficient funds: need ${required} μALGO, have ${available} μALGO.`,
      'INSUFFICIENT_FUNDS'
    )
    this.name = 'InsufficientFundsError'
    this.required = required
    this.available = available
  }
}

/** Thrown when an asset ID is not found on-chain or in the marketplace. */
export class AssetNotFoundError extends DeShopError {
  public readonly assetId: number

  constructor(assetId: number) {
    super(`Asset #${assetId} not found.`, 'ASSET_NOT_FOUND')
    this.name = 'AssetNotFoundError'
    this.assetId = assetId
  }
}

/** Thrown when trying to buy an asset that isn't listed on the marketplace. */
export class AssetNotListedError extends DeShopError {
  public readonly assetId: number

  constructor(assetId: number) {
    super(`Asset #${assetId} is not currently listed on the marketplace.`, 'ASSET_NOT_LISTED')
    this.name = 'AssetNotListedError'
    this.assetId = assetId
  }
}

/** Thrown when an Algorand transaction fails to confirm. */
export class TransactionFailedError extends DeShopError {
  public readonly txnId?: string
  public readonly reason?: string

  constructor(message: string, txnId?: string, reason?: string) {
    super(message, 'TRANSACTION_FAILED')
    this.name = 'TransactionFailedError'
    this.txnId = txnId
    this.reason = reason
  }
}

/** Thrown when a network request (Algorand node or backend API) fails. */
export class NetworkError extends DeShopError {
  public readonly url?: string
  public readonly statusCode?: number

  constructor(message: string, url?: string, statusCode?: number) {
    super(message, 'NETWORK_ERROR')
    this.name = 'NetworkError'
    this.url = url
    this.statusCode = statusCode
  }
}

/** Thrown when input parameters fail validation. */
export class ValidationError extends DeShopError {
  public readonly field: string

  constructor(field: string, message: string) {
    super(`Invalid ${field}: ${message}`, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
    this.field = field
  }
}
