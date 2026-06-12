/*
 * De-Shop SDK — Unity Plugin
 * ==========================
 * DeShopWebSocket.cs — WebSocket client using System.Net.WebSockets.ClientWebSocket.
 *
 * Usage: Add to your Unity project under Assets/DeShopSDK/Runtime/
 * Target: Unity 2021.3+ with .NET Standard 2.1 / .NET Framework
 *
 * Thread-safety: Incoming messages are pushed to a ConcurrentQueue.
 * Call ProcessIncomingMessages() from the main thread (e.g. Unity Update)
 * to dispatch events safely.
 */

using System;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;

namespace DeShop
{
    /// <summary>
    /// WebSocket client for the De-Shop real-time event stream.
    /// Implements IDisposable for clean shutdown.
    /// </summary>
    public class DeShopWebSocket : IDisposable
    {
        // ─── Constants ──────────────────────────────────────────────────────

        private const int MaxReconnectAttempts = 5;
        private const float ReconnectDelaySeconds = 3f;
        private const int HeartbeatIntervalSeconds = 30;
        private const int ReceiveBufferSize = 8192;

        // ─── State ──────────────────────────────────────────────────────────

        private ClientWebSocket _socket;
        private CancellationTokenSource _cts;
        private readonly string _url;
        private readonly bool _debug;
        private bool _disposed;
        private bool _intentionalDisconnect;
        private int _reconnectAttempts;

        // ─── Thread-safe Message Queue ──────────────────────────────────────

        private readonly ConcurrentQueue<string> _incomingMessages =
            new ConcurrentQueue<string>();

        // ─── Events ─────────────────────────────────────────────────────────

        /// <summary>Raised when a WebSocket message is received (main thread).</summary>
        public event Action<string> OnMessage;

        /// <summary>Raised when the connection is established.</summary>
        public event Action OnConnected;

        /// <summary>Raised when the connection is lost (not intentional).</summary>
        public event Action OnDisconnected;

        /// <summary>Raised on WebSocket errors.</summary>
        public event Action<string> OnError;

        /// <summary>Whether the socket is currently connected.</summary>
        public bool IsConnected =>
            _socket != null &&
            _socket.State == WebSocketState.Open;

        // ─── Constructor ────────────────────────────────────────────────────

        public DeShopWebSocket(string url, bool debug = false)
        {
            _url = url;
            _debug = debug;
        }

        // ─── Connect ────────────────────────────────────────────────────────

        /// <summary>
        /// Connect to the WebSocket server. Auto-reconnects up to 5 times
        /// with a 3-second delay between attempts.
        /// </summary>
        public async Task ConnectAsync()
        {
            if (_disposed) return;
            _intentionalDisconnect = false;

            _reconnectAttempts = 0;

            while (_reconnectAttempts < MaxReconnectAttempts && !_intentionalDisconnect && !_disposed)
            {
                try
                {
                    LogDebug($"Connecting to {_url} (attempt {_reconnectAttempts + 1}/{MaxReconnectAttempts})...");

                    _cts?.Cancel();
                    _cts?.Dispose();
                    _cts = new CancellationTokenSource();

                    _socket?.Dispose();
                    _socket = new ClientWebSocket();

                    await _socket.ConnectAsync(
                        new Uri(_url),
                        _cts.Token);

                    LogDebug("Connected.");
                    _reconnectAttempts = 0;

                    OnConnected?.Invoke();

                    // Start receive and heartbeat loops
                    _ = ReceiveLoopAsync(_cts.Token);
                    _ = HeartbeatLoopAsync(_cts.Token);

                    return; // success
                }
                catch (OperationCanceledException)
                {
                    LogDebug("Connect cancelled.");
                    return;
                }
                catch (Exception ex)
                {
                    _reconnectAttempts++;
                    LogDebug($"Connect failed: {ex.Message}");

                    if (_reconnectAttempts >= MaxReconnectAttempts)
                    {
                        string err = $"Failed to connect after {MaxReconnectAttempts} attempts: {ex.Message}";
                        OnError?.Invoke(err);
                        return;
                    }

                    LogDebug($"Retrying in {ReconnectDelaySeconds}s...");
                    await Task.Delay(
                        TimeSpan.FromSeconds(ReconnectDelaySeconds));
                }
            }
        }

        // ─── Disconnect ─────────────────────────────────────────────────────

        /// <summary>
        /// Gracefully close the WebSocket connection.
        /// Does NOT auto-reconnect after this.
        /// </summary>
        public async Task DisconnectAsync()
        {
            _intentionalDisconnect = true;
            LogDebug("Disconnecting...");

            try
            {
                _cts?.Cancel();

                if (_socket != null && _socket.State == WebSocketState.Open)
                {
                    await _socket.CloseAsync(
                        WebSocketCloseStatus.NormalClosure,
                        "Client disconnect",
                        CancellationToken.None);
                }
            }
            catch (Exception ex)
            {
                LogDebug($"Disconnect error (ignored): {ex.Message}");
            }
            finally
            {
                OnDisconnected?.Invoke();
            }
        }

        // ─── Room Subscriptions ─────────────────────────────────────────────

        /// <summary>Subscribe to marketplace events (listings, sales, cancellations).</summary>
        public async Task SubscribeMarketplace()
        {
            await SendAsync(JsonUtility.ToJson(new SubscriptionMessage
            {
                action = "subscribe",
                room = "marketplace"
            }));
        }

        /// <summary>Subscribe to events for a specific wallet.</summary>
        public async Task SubscribeWallet(string wallet)
        {
            await SendAsync(JsonUtility.ToJson(new SubscriptionMessage
            {
                action = "subscribe",
                room = "wallet",
                wallet = wallet
            }));
        }

        /// <summary>Subscribe to events for a specific rarity tier.</summary>
        public async Task SubscribeRarity(string rarity)
        {
            await SendAsync(JsonUtility.ToJson(new SubscriptionMessage
            {
                action = "subscribe",
                room = "rarity",
                rarity = rarity
            }));
        }

        // ─── Main-thread Message Pump ──────────────────────────────────────

        /// <summary>
        /// Drain the incoming message queue and dispatch events.
        /// MUST be called from the Unity main thread (e.g. in Update()).
        /// </summary>
        public void ProcessIncomingMessages()
        {
            while (_incomingMessages.TryDequeue(out string msg))
            {
                try
                {
                    OnMessage?.Invoke(msg);
                }
                catch (Exception ex)
                {
                    LogDebug($"Message dispatch error: {ex.Message}");
                    OnError?.Invoke($"Message dispatch error: {ex.Message}");
                }
            }
        }

        // ─── Send ───────────────────────────────────────────────────────────

        private async Task SendAsync(string json)
        {
            if (_socket == null || _socket.State != WebSocketState.Open)
            {
                LogDebug("Send failed: socket not open.");
                return;
            }

            try
            {
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                var segment = new ArraySegment<byte>(bytes);

                await _socket.SendAsync(
                    segment,
                    WebSocketMessageType.Text,
                    true,
                    _cts?.Token ?? CancellationToken.None);

                LogDebug($"Sent: {json}");
            }
            catch (Exception ex)
            {
                LogDebug($"Send error: {ex.Message}");
                OnError?.Invoke($"Send error: {ex.Message}");
            }
        }

        // ─── Receive Loop ───────────────────────────────────────────────────

        private async Task ReceiveLoopAsync(CancellationToken ct)
        {
            var buffer = new byte[ReceiveBufferSize];
            var sb = new StringBuilder();

            try
            {
                while (!ct.IsCancellationRequested && _socket.State == WebSocketState.Open)
                {
                    sb.Clear();
                    WebSocketReceiveResult result;

                    do
                    {
                        result = await _socket.ReceiveAsync(
                            new ArraySegment<byte>(buffer),
                            ct);

                        if (result.MessageType == WebSocketMessageType.Close)
                        {
                            LogDebug("Server initiated close.");
                            HandleUnexpectedDisconnect();
                            return;
                        }

                        string chunk = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        sb.Append(chunk);

                    } while (!result.EndOfMessage);

                    string message = sb.ToString();
                    LogDebug($"Received: {message}");

                    // Enqueue for main-thread processing
                    _incomingMessages.Enqueue(message);
                }
            }
            catch (OperationCanceledException)
            {
                // Normal cancellation — ignore
            }
            catch (WebSocketException ex)
            {
                LogDebug($"Receive WebSocket error: {ex.Message}");
                HandleUnexpectedDisconnect();
            }
            catch (Exception ex)
            {
                LogDebug($"Receive error: {ex.Message}");
                HandleUnexpectedDisconnect();
            }
        }

        // ─── Heartbeat Loop ─────────────────────────────────────────────────

        private async Task HeartbeatLoopAsync(CancellationToken ct)
        {
            try
            {
                while (!ct.IsCancellationRequested && _socket.State == WebSocketState.Open)
                {
                    await Task.Delay(
                        TimeSpan.FromSeconds(HeartbeatIntervalSeconds),
                        ct);

                    if (_socket.State == WebSocketState.Open)
                    {
                        // Socket.IO Engine.IO ping: numeric message "2"
                        await SendAsync("2");
                        LogDebug("Heartbeat ping sent.");
                    }
                }
            }
            catch (OperationCanceledException)
            {
                // Normal
            }
            catch (Exception ex)
            {
                LogDebug($"Heartbeat error: {ex.Message}");
            }
        }

        // ─── Auto-reconnect ─────────────────────────────────────────────────

        private void HandleUnexpectedDisconnect()
        {
            if (_intentionalDisconnect || _disposed) return;

            LogDebug("Unexpected disconnect — will attempt reconnect.");
            OnDisconnected?.Invoke();

            // Fire and forget reconnect
            _ = ConnectAsync();
        }

        // ─── IDisposable ────────────────────────────────────────────────────

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            _intentionalDisconnect = true;

            try
            {
                _cts?.Cancel();
                _socket?.Dispose();
                _cts?.Dispose();
            }
            catch { /* swallow cleanup errors */ }

            LogDebug("Disposed.");
        }

        // ─── Logging ────────────────────────────────────────────────────────

        private void LogDebug(string message)
        {
            if (_debug)
                Debug.Log($"[DeShop WS] {message}");
        }

        // ─── Internal Serialization Helpers ─────────────────────────────────

        [Serializable]
        private class SubscriptionMessage
        {
            public string action;
            public string room;
            public string wallet;
            public string rarity;
        }
    }
}
