/*
 * De-Shop SDK — Unity Plugin
 * ==========================
 * DeShopSDK.cs — Main SDK MonoBehaviour.
 *
 * Usage:
 *   1. Attach DeShopSDK to a GameObject (or use AddComponent).
 *   2. Call Initialize(config) once.
 *   3. Authenticate, then call API methods.
 *   4. Subscribe to WebSocket events for real-time updates.
 *
 * All API methods are coroutine-based (return IEnumerator).
 * Start them with StartCoroutine(sdk.MintNFT(...)).
 *
 * Target: Unity 2021.3+
 */

using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace DeShop
{
    /// <summary>
    /// Main De-Shop SDK component. Attach to a persistent GameObject.
    /// Provides the full marketplace API and real-time WebSocket events.
    /// </summary>
    public class DeShopSDK : MonoBehaviour
    {
        // ─── Internal State ─────────────────────────────────────────────────

        private DeShopHttpClient _http;
        private DeShopWebSocket _ws;
        private DeShopConfig _config;

        // JWT token management
        private string _authToken;
        private float _tokenIssuedTime;
        private int _tokenExpiresIn;

        /// <summary>True after Initialize() has been called.</summary>
        public bool IsInitialized { get; private set; }

        /// <summary>True when a valid (non-expired) JWT is held.</summary>
        public bool IsAuthenticated =>
            !string.IsNullOrEmpty(_authToken) && !IsTokenExpired();

        // ─── C# Events ──────────────────────────────────────────────────────

        /// <summary>Raised when an asset is minted.</summary>
        public event Action<Asset> OnAssetMinted;

        /// <summary>Raised when an asset is sold.</summary>
        public event Action<Asset, SaleRecord> OnAssetSold;

        /// <summary>Raised when an asset is listed on the marketplace.</summary>
        public event Action<Asset> OnAssetListed;

        /// <summary>Raised when a listing is cancelled.</summary>
        public event Action<Asset> OnAssetCancelled;

        /// <summary>Raised when a price update is received via WebSocket.</summary>
        public event Action<string> OnPriceUpdate;

        /// <summary>Raised for any De-Shop event (general listener).</summary>
        public event Action<DeShopEvent> OnEvent;

        /// <summary>Raised on SDK-level errors.</summary>
        public event Action<string> OnError;

        // ─── Lifecycle ──────────────────────────────────────────────────────

        private void Update()
        {
            // Pump WebSocket messages onto the main thread every frame
            if (_ws != null)
            {
                _ws.ProcessIncomingMessages();
            }
        }

        private void OnDestroy()
        {
            _ws?.Dispose();
        }

        // ─── Initialize ─────────────────────────────────────────────────────

        /// <summary>
        /// Initialize the SDK with the given configuration.
        /// Creates HTTP and WebSocket clients. Call once after scene load.
        /// </summary>
        public void Initialize(DeShopConfig config)
        {
            _config = config;

            _http = new DeShopHttpClient(
                config.BackendUrl,
                config.TimeoutSeconds,
                config.Debug);

            // Derive WebSocket URL from backend URL
            string wsUrl = DeriveWebSocketUrl(config.BackendUrl);

            _ws = new DeShopWebSocket(wsUrl, config.Debug);

            // Wire up WebSocket events
            _ws.OnMessage += HandleWebSocketMessage;
            _ws.OnConnected += () =>
            {
                LogDebug("WebSocket connected.");
            };
            _ws.OnDisconnected += () =>
            {
                LogDebug("WebSocket disconnected.");
            };
            _ws.OnError += (err) =>
            {
                LogDebug($"WebSocket error: {err}");
                OnError?.Invoke(err);
            };

            IsInitialized = true;
            LogDebug($"SDK initialized — backend={config.BackendUrl} network={config.Network}");
        }

        // ═══════════════════════════════════════════════════════════════════════
        //  AUTHENTICATION
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>
        /// Step 1 of wallet authentication: request a nonce from the server.
        /// The nonce must then be signed with the wallet's private key.
        /// </summary>
        public IEnumerator Authenticate(
            string wallet,
            Action<NonceResponse> onNonce,
            Action<string> onError)
        {
            var body = new WalletRequest { wallet = wallet };
            yield return _http.Post<NonceResponse>(
                "/auth/nonce",
                body,
                (nonceResp) =>
                {
                    LogDebug($"Nonce received for {wallet}");
                    onNonce?.Invoke(nonceResp);
                },
                onError);
        }

        /// <summary>
        /// Step 2 of wallet authentication: submit the signed nonce
        /// to receive a JWT token.
        /// </summary>
        public IEnumerator CompleteAuth(
            string wallet,
            string signature,
            Action<AuthResponse> onSuccess,
            Action<string> onError)
        {
            // We need to send { wallet, nonce, signature } but we don't have
            // the nonce here — it was returned in step 1 and should have been
            // captured by the caller. The caller should include it in the
            // signature or pass it back. We'll send the full verify payload.
            var body = new AuthVerifyBody
            {
                wallet = wallet,
                signature = signature
            };

            yield return _http.Post<AuthResponse>(
                "/auth/verify",
                body,
                (authResp) =>
                {
                    if (authResp != null)
                    {
                        _authToken = authResp.token;
                        _tokenExpiresIn = authResp.expires_in;
                        _tokenIssuedTime = Time.realtimeSinceStartup;
                        _http.AuthToken = _authToken;
                        LogDebug($"Authenticated: {wallet}");
                    }
                    onSuccess?.Invoke(authResp);
                },
                onError);
        }

        /// <summary>
        /// Step 2 (full): submit wallet, nonce, and signature for verification.
        /// </summary>
        public IEnumerator CompleteAuth(
            string wallet,
            string nonce,
            string signature,
            Action<AuthResponse> onSuccess,
            Action<string> onError)
        {
            var body = new AuthVerifyBody
            {
                wallet = wallet,
                nonce = nonce,
                signature = signature
            };

            yield return _http.Post<AuthResponse>(
                "/auth/verify",
                body,
                (authResp) =>
                {
                    if (authResp != null)
                    {
                        _authToken = authResp.token;
                        _tokenExpiresIn = authResp.expires_in;
                        _tokenIssuedTime = Time.realtimeSinceStartup;
                        _http.AuthToken = _authToken;
                        LogDebug($"Authenticated: {wallet}");
                    }
                    onSuccess?.Invoke(authResp);
                },
                onError);
        }

        // ─── JWT Token Management ───────────────────────────────────────────

        /// <summary>Manually set the JWT auth token.</summary>
        public void SetAuthToken(string token, int expiresInSeconds = 86400)
        {
            _authToken = token;
            _tokenExpiresIn = expiresInSeconds;
            _tokenIssuedTime = Time.realtimeSinceStartup;
            if (_http != null) _http.AuthToken = token;
            LogDebug("Auth token set manually.");
        }

        /// <summary>Clear the current JWT auth token.</summary>
        public void ClearAuthToken()
        {
            _authToken = null;
            _tokenExpiresIn = 0;
            _tokenIssuedTime = 0;
            if (_http != null) _http.AuthToken = null;
            LogDebug("Auth token cleared.");
        }

        /// <summary>Check if the current JWT token has expired.</summary>
        public bool IsTokenExpired()
        {
            if (string.IsNullOrEmpty(_authToken)) return true;
            float elapsed = Time.realtimeSinceStartup - _tokenIssuedTime;
            return elapsed >= _tokenExpiresIn;
        }

        // ═══════════════════════════════════════════════════════════════════════
        //  API METHODS
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>Mint a new NFT skin asset. Requires authentication.</summary>
        public IEnumerator MintNFT(
            MintParams parms,
            Action<MintResponse> onSuccess,
            Action<string> onError)
        {
            yield return _http.Post<MintResponse>(
                "/mint",
                parms,
                (resp) =>
                {
                    if (resp?.asset != null)
                    {
                        OnAssetMinted?.Invoke(resp.asset);
                        DispatchEvent(DeShopEventType.Minted, resp.asset, "Asset minted");
                    }
                    onSuccess?.Invoke(resp);
                },
                onError);
        }

        /// <summary>Get all assets owned by a wallet.</summary>
        public IEnumerator GetAssets(
            string wallet,
            Action<AssetsResponse> onSuccess,
            Action<string> onError)
        {
            yield return _http.Get<AssetsResponse>(
                $"/assets/{wallet}",
                onSuccess,
                onError);
        }

        /// <summary>List an asset for sale on the marketplace. Requires authentication.</summary>
        public IEnumerator ListAsset(
            ListParams parms,
            Action<ListResponse> onSuccess,
            Action<string> onError)
        {
            yield return _http.Post<ListResponse>(
                "/list",
                parms,
                (resp) =>
                {
                    if (resp?.asset != null)
                    {
                        OnAssetListed?.Invoke(resp.asset);
                        DispatchEvent(DeShopEventType.Listed, resp.asset, "Asset listed");
                    }
                    onSuccess?.Invoke(resp);
                },
                onError);
        }

        /// <summary>Buy a listed asset. Requires authentication.</summary>
        public IEnumerator BuyAsset(
            BuyParams parms,
            Action<BuyResponse> onSuccess,
            Action<string> onError)
        {
            yield return _http.Post<BuyResponse>(
                "/buy",
                parms,
                (resp) =>
                {
                    if (resp?.asset != null)
                    {
                        OnAssetSold?.Invoke(resp.asset, resp.sale);
                        DispatchEvent(DeShopEventType.Purchased, resp.asset, "Asset purchased");
                    }
                    onSuccess?.Invoke(resp);
                },
                onError);
        }

        /// <summary>Cancel an active listing. Requires authentication.</summary>
        public IEnumerator CancelListing(
            CancelParams parms,
            Action<CancelResponse> onSuccess,
            Action<string> onError)
        {
            yield return _http.Post<CancelResponse>(
                "/cancel",
                parms,
                (resp) =>
                {
                    if (resp?.asset != null)
                    {
                        OnAssetCancelled?.Invoke(resp.asset);
                        DispatchEvent(DeShopEventType.Cancelled, resp.asset, "Listing cancelled");
                    }
                    onSuccess?.Invoke(resp);
                },
                onError);
        }

        /// <summary>Get all active marketplace listings and recent sales.</summary>
        public IEnumerator GetMarketplace(
            Action<MarketplaceResponse> onSuccess,
            Action<string> onError)
        {
            yield return _http.Get<MarketplaceResponse>(
                "/marketplace",
                onSuccess,
                onError);
        }

        /// <summary>Get AI-suggested price for a skin.</summary>
        public IEnumerator GetAIPrice(
            AIPriceParams parms,
            Action<PriceSuggestion> onSuccess,
            Action<string> onError)
        {
            yield return _http.Post<PriceSuggestion>(
                "/ai-price",
                parms,
                onSuccess,
                onError);
        }

        /// <summary>Analyze a skin using the Skin Intelligence Engine.</summary>
        public IEnumerator AnalyzeSkin(
            string name,
            string weapon,
            string rarity,
            Action<AnalyzeResponse> onSuccess,
            Action<string> onError)
        {
            var body = new AnalyzeRequest
            {
                name = name,
                weapon = weapon,
                rarity = rarity
            };

            yield return _http.Post<AnalyzeResponse>(
                "/analyze",
                body,
                onSuccess,
                onError);
        }

        /// <summary>Get the real-time market price for a skin.</summary>
        public IEnumerator GetSkinPrice(
            string skinName,
            Action<PriceResponse> onSuccess,
            Action<string> onError)
        {
            string path = $"/prices?name={UnityWebRequest.EscapeURL(skinName)}";
            yield return _http.Get<PriceResponse>(
                path,
                onSuccess,
                onError);
        }

        /// <summary>Get the Steam inventory for a Steam ID.</summary>
        public IEnumerator GetSteamInventory(
            string steamId,
            Action<SteamInventoryResponse> onSuccess,
            Action<string> onError)
        {
            yield return _http.Get<SteamInventoryResponse>(
                $"/steam/inventory/{steamId}",
                onSuccess,
                onError);
        }

        /// <summary>Get the provenance history for an asset.</summary>
        public IEnumerator GetAssetHistory(
            int assetId,
            Action<HistoryResponse> onSuccess,
            Action<string> onError)
        {
            yield return _http.Get<HistoryResponse>(
                $"/history/{assetId}",
                onSuccess,
                onError);
        }

        // ═══════════════════════════════════════════════════════════════════════
        //  WEBSOCKET SUBSCRIPTIONS
        // ═══════════════════════════════════════════════════════════════════════

        /// <summary>Connect to the WebSocket server and subscribe to marketplace events.</summary>
        public void SubscribeMarketplace()
        {
            EnsureWebSocketConnected();
            _ws.SubscribeMarketplace();
            LogDebug("Subscribed to marketplace room.");
        }

        /// <summary>Subscribe to real-time events for a specific wallet.</summary>
        public void SubscribeWallet(string wallet)
        {
            EnsureWebSocketConnected();
            _ws.SubscribeWallet(wallet);
            LogDebug($"Subscribed to wallet room: {wallet}");
        }

        /// <summary>Subscribe to real-time events for a specific rarity tier.</summary>
        public void SubscribeRarity(string rarity)
        {
            EnsureWebSocketConnected();
            _ws.SubscribeRarity(rarity);
            LogDebug($"Subscribed to rarity room: {rarity}");
        }

        // ═══════════════════════════════════════════════════════════════════════
        //  INTERNAL HELPERS
        // ═══════════════════════════════════════════════════════════════════════

        private async void EnsureWebSocketConnected()
        {
            if (_ws == null)
            {
                OnError?.Invoke("SDK not initialized. Call Initialize() first.");
                return;
            }

            if (!_ws.IsConnected)
            {
                try
                {
                    await _ws.ConnectAsync();
                }
                catch (Exception ex)
                {
                    LogDebug($"WebSocket connect error: {ex.Message}");
                    OnError?.Invoke($"WebSocket connect error: {ex.Message}");
                }
            }
        }

        /// <summary>
        /// Derive the WebSocket URL from the backend HTTP URL.
        /// http:// → ws:// and https:// → wss://, then append the Socket.IO path.
        /// </summary>
        private string DeriveWebSocketUrl(string httpUrl)
        {
            string wsUrl = httpUrl;

            if (wsUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                wsUrl = "wss://" + wsUrl.Substring(8);
            }
            else if (wsUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
            {
                wsUrl = "ws://" + wsUrl.Substring(7);
            }

            // Remove trailing slash before appending path
            wsUrl = wsUrl.TrimEnd('/');

            // Socket.IO v4 Engine.IO transport path
            wsUrl += "/socket.io/?EIO=4&transport=websocket";

            return wsUrl;
        }

        // ─── WebSocket Message Handling ─────────────────────────────────────

        private void HandleWebSocketMessage(string rawMessage)
        {
            LogDebug($"WS message: {rawMessage}");

            // Socket.IO Engine.IO protocol:
            //   "0" = open, "2" = ping, "3" = pong,
            //   "40" = connect, "42[event,data]" = event
            if (string.IsNullOrEmpty(rawMessage)) return;

            // Handle Engine.IO open packet
            if (rawMessage == "0" || rawMessage.StartsWith("0{"))
            {
                LogDebug("Engine.IO open received.");
                return;
            }

            // Handle pong
            if (rawMessage == "3")
            {
                LogDebug("Engine.IO pong received.");
                return;
            }

            // Handle Socket.IO connect
            if (rawMessage == "40")
            {
                LogDebug("Socket.IO connected.");
                return;
            }

            // Handle Socket.IO event: "42["event_name",{data}]"
            if (rawMessage.StartsWith("42"))
            {
                try
                {
                    // Strip the "42" prefix and parse the JSON array
                    string jsonPayload = rawMessage.Substring(2);
                    var wrapper = JsonUtility.FromJson<SocketIOEventWrapper>(jsonPayload);

                    if (wrapper != null)
                    {
                        DispatchSocketIOEvent(wrapper);
                    }
                }
                catch (Exception ex)
                {
                    LogDebug($"Socket.IO parse error: {ex.Message}");
                }

                return;
            }

            // Try parsing as a generic WebSocketMessage
            try
            {
                var msg = JsonUtility.FromJson<WebSocketMessage>(rawMessage);
                if (msg != null && !string.IsNullOrEmpty(msg.event_type))
                {
                    DispatchWebSocketEvent(msg);
                }
            }
            catch { /* not a known format — ignore */ }
        }

        private void DispatchSocketIOEvent(SocketIOEventWrapper wrapper)
        {
            string evtName = wrapper.eventName ?? "";
            string dataJson = wrapper.data ?? "";

            switch (evtName)
            {
                case "asset_minted":
                {
                    var asset = SafeFromJson<Asset>(dataJson);
                    if (asset != null)
                    {
                        OnAssetMinted?.Invoke(asset);
                        DispatchEvent(DeShopEventType.Minted, asset, "Asset minted (WS)");
                    }
                    break;
                }
                case "asset_sold":
                {
                    var asset = SafeFromJson<Asset>(dataJson);
                    if (asset != null)
                    {
                        OnAssetSold?.Invoke(asset, null);
                        DispatchEvent(DeShopEventType.Purchased, asset, "Asset sold (WS)");
                    }
                    break;
                }
                case "asset_listed":
                {
                    var asset = SafeFromJson<Asset>(dataJson);
                    if (asset != null)
                    {
                        OnAssetListed?.Invoke(asset);
                        DispatchEvent(DeShopEventType.Listed, asset, "Asset listed (WS)");
                    }
                    break;
                }
                case "asset_cancelled":
                {
                    var asset = SafeFromJson<Asset>(dataJson);
                    if (asset != null)
                    {
                        OnAssetCancelled?.Invoke(asset);
                        DispatchEvent(DeShopEventType.Cancelled, asset, "Listing cancelled (WS)");
                    }
                    break;
                }
                case "price_update":
                {
                    OnPriceUpdate?.Invoke(dataJson);
                    break;
                }
                default:
                {
                    LogDebug($"Unhandled Socket.IO event: {evtName}");
                    break;
                }
            }
        }

        private void DispatchWebSocketEvent(WebSocketMessage msg)
        {
            string evtType = msg.event_type;
            string data = msg.data_json ?? "";

            switch (evtType)
            {
                case "minted":
                {
                    var asset = SafeFromJson<Asset>(data);
                    if (asset != null)
                    {
                        OnAssetMinted?.Invoke(asset);
                        DispatchEvent(DeShopEventType.Minted, asset, "Asset minted");
                    }
                    break;
                }
                case "purchased":
                case "sold":
                {
                    var asset = SafeFromJson<Asset>(data);
                    if (asset != null)
                    {
                        OnAssetSold?.Invoke(asset, null);
                        DispatchEvent(DeShopEventType.Purchased, asset, "Asset purchased");
                    }
                    break;
                }
                case "listed":
                {
                    var asset = SafeFromJson<Asset>(data);
                    if (asset != null)
                    {
                        OnAssetListed?.Invoke(asset);
                        DispatchEvent(DeShopEventType.Listed, asset, "Asset listed");
                    }
                    break;
                }
                case "cancelled":
                {
                    var asset = SafeFromJson<Asset>(data);
                    if (asset != null)
                    {
                        OnAssetCancelled?.Invoke(asset);
                        DispatchEvent(DeShopEventType.Cancelled, asset, "Listing cancelled");
                    }
                    break;
                }
                case "price_update":
                {
                    OnPriceUpdate?.Invoke(data);
                    break;
                }
            }
        }

        private void DispatchEvent(DeShopEventType type, Asset asset, string message)
        {
            var evt = new DeShopEvent
            {
                Type = type,
                Asset = asset,
                Message = message
            };
            OnEvent?.Invoke(evt);
        }

        // ─── JSON Utility ───────────────────────────────────────────────────

        private T SafeFromJson<T>(string json) where T : class
        {
            if (string.IsNullOrEmpty(json)) return null;
            try
            {
                return JsonUtility.FromJson<T>(json);
            }
            catch (Exception ex)
            {
                LogDebug($"JSON parse error for {typeof(T).Name}: {ex.Message}");
                return null;
            }
        }

        // ─── Logging ────────────────────────────────────────────────────────

        private void LogDebug(string message)
        {
            if (_config != null && _config.Debug)
                Debug.Log($"[DeShop SDK] {message}");
        }

        // ─── Internal Serialization Types ───────────────────────────────────

        [Serializable]
        private class WalletRequest
        {
            public string wallet;
        }

        [Serializable]
        private class AuthVerifyBody
        {
            public string wallet;
            public string nonce;
            public string signature;
        }

        [Serializable]
        private class AnalyzeRequest
        {
            public string name;
            public string weapon;
            public string rarity;
        }

        /// <summary>
        /// Wrapper for Socket.IO event packets: ["event_name", {data}]
        /// JsonUtility doesn't support top-level arrays, so we use a
        /// two-element array wrapper.
        /// </summary>
        [Serializable]
        private class SocketIOEventWrapper
        {
            // JsonUtility serializes arrays of primitive/object types as
            // fixed fields. For a ["name", {data}] pattern we use:
            public string eventName;   // maps to first element
            public string data;        // maps to second element (as raw JSON string)
        }
    }
}
