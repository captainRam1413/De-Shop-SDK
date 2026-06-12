/*
 * De-Shop SDK — Unity Plugin
 * ==========================
 * DeShopHttp.cs — HTTP client wrapper using UnityWebRequest.
 *
 * Usage: Add to your Unity project under Assets/DeShopSDK/Runtime/
 * All methods return IEnumerator for use with coroutines.
 */

using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace DeShop
{
    /// <summary>
    /// HTTP client wrapper for the De-Shop backend API.
    /// Uses UnityWebRequest and JsonUtility. Designed for coroutine-based usage.
    /// </summary>
    public class DeShopHttpClient
    {
        // ─── Configuration ──────────────────────────────────────────────────

        private readonly string _baseUrl;
        private readonly int _timeoutSeconds;
        private readonly bool _debug;

        // ─── Rate Limiting ──────────────────────────────────────────────────

        private const int MaxRequestsPerMinute = 60;
        private int _requestCount;
        private float _rateWindowStart;
        private const float RateWindowSeconds = 60f;

        // ─── Auth ───────────────────────────────────────────────────────────

        /// <summary>JWT token injected into Authorization headers.</summary>
        public string AuthToken { get; set; }

        // ─── Constructor ────────────────────────────────────────────────────

        public DeShopHttpClient(string baseUrl, float timeoutSeconds = 15f, bool debug = false)
        {
            _baseUrl = baseUrl.TrimEnd('/');
            _timeoutSeconds = Mathf.RoundToInt(timeoutSeconds);
            _debug = debug;
            _requestCount = 0;
            _rateWindowStart = UnityEngine.Time.realtimeSinceStartup;
        }

        // ─── GET ────────────────────────────────────────────────────────────

        /// <summary>
        /// Send a GET request and deserialize the JSON response into type T.
        /// </summary>
        /// <param name="path">Relative API path (e.g. "/marketplace")</param>
        /// <param name="onSuccess">Callback with deserialized response</param>
        /// <param name="onError">Callback with error message</param>
        public IEnumerator Get<T>(string path, Action<T> onSuccess, Action<string> onError)
            where T : class
        {
            if (!CheckRateLimit(onError)) yield break;

            string url = BuildUrl(path);
            LogDebug($"GET {url}");

            using (var req = UnityWebRequest.Get(url))
            {
                ApplyDefaults(req);
                yield return req.SendWebRequest();

                HandleResponse(req, onSuccess, onError, $"GET {path}");
            }
        }

        // ─── POST (typed response) ─────────────────────────────────────────

        /// <summary>
        /// Send a POST request with a JSON body and deserialize the response into TResponse.
        /// </summary>
        /// <param name="path">Relative API path (e.g. "/mint")</param>
        /// <param name="body">Request body object (serialized via JsonUtility)</param>
        /// <param name="onSuccess">Callback with deserialized response</param>
        /// <param name="onError">Callback with error message</param>
        public IEnumerator Post<TResponse>(
            string path,
            object body,
            Action<TResponse> onSuccess,
            Action<string> onError)
            where TResponse : class
        {
            if (!CheckRateLimit(onError)) yield break;

            string url = BuildUrl(path);
            string json = JsonUtility.ToJson(body);
            LogDebug($"POST {url}  body={json}");

            using (var req = new UnityWebRequest(url, "POST"))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
                req.uploadHandler = new UploadHandlerRaw(bodyRaw);
                req.downloadHandler = new DownloadHandlerBuffer();
                ApplyDefaults(req);
                req.SetRequestHeader("Content-Type", "application/json");

                yield return req.SendWebRequest();

                HandleResponse(req, onSuccess, onError, $"POST {path}");
            }
        }

        // ─── POST (raw — no typed deserialization) ─────────────────────────

        /// <summary>
        /// Send a POST request with a raw JSON string body.
        /// Returns the raw response string on success.
        /// </summary>
        public IEnumerator PostRaw(
            string path,
            string jsonBody,
            Action<string> onSuccess,
            Action<string> onError)
        {
            if (!CheckRateLimit(onError)) yield break;

            string url = BuildUrl(path);
            LogDebug($"POST(raw) {url}  body={jsonBody}");

            using (var req = new UnityWebRequest(url, "POST"))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);
                req.uploadHandler = new UploadHandlerRaw(bodyRaw);
                req.downloadHandler = new DownloadHandlerBuffer();
                ApplyDefaults(req);
                req.SetRequestHeader("Content-Type", "application/json");

                yield return req.SendWebRequest();

                if (IsError(req))
                {
                    string err = ExtractError(req, $"POST(raw) {path}");
                    LogDebug($"ERROR: {err}");
                    onError?.Invoke(err);
                }
                else
                {
                    string responseText = req.downloadHandler?.text ?? "";
                    LogDebug($"RESPONSE({req.responseCode}): {responseText}");
                    onSuccess?.Invoke(responseText);
                }
            }
        }

        // ─── Internal Helpers ───────────────────────────────────────────────

        private string BuildUrl(string path)
        {
            if (path.StartsWith("http")) return path;
            return $"{_baseUrl}{path}";
        }

        private void ApplyDefaults(UnityWebRequest req)
        {
            req.timeout = _timeoutSeconds;
            if (!string.IsNullOrEmpty(AuthToken))
            {
                req.SetRequestHeader("Authorization", $"Bearer {AuthToken}");
            }
        }

        private void HandleResponse<T>(
            UnityWebRequest req,
            Action<T> onSuccess,
            Action<string> onError,
            string label) where T : class
        {
            if (IsError(req))
            {
                string err = ExtractError(req, label);
                LogDebug($"ERROR: {err}");
                onError?.Invoke(err);
                return;
            }

            string text = req.downloadHandler?.text ?? "";
            LogDebug($"RESPONSE({req.responseCode}): {text}");

            if (string.IsNullOrEmpty(text))
            {
                onSuccess?.Invoke(null);
                return;
            }

            try
            {
                T result = JsonUtility.FromJson<T>(text);
                onSuccess?.Invoke(result);
            }
            catch (Exception ex)
            {
                string msg = $"{label}: JSON parse error — {ex.Message}";
                LogDebug($"ERROR: {msg}");
                onError?.Invoke(msg);
            }
        }

        private bool IsError(UnityWebRequest req)
        {
#if UNITY_2020_1_OR_NEWER
            return req.result != UnityWebRequest.Result.Success;
#else
            return req.isNetworkError || req.isHttpError;
#endif
        }

        private string ExtractError(UnityWebRequest req, string label)
        {
            string body = req.downloadHandler?.text ?? "";
            string error = req.error ?? "Unknown error";

            // Try to extract structured error from JSON body
            if (!string.IsNullOrEmpty(body))
            {
                try
                {
                    var errObj = JsonUtility.FromJson<ErrorBody>(body);
                    if (errObj != null && !string.IsNullOrEmpty(errObj.error))
                        return $"{label} ({req.responseCode}): {errObj.error}";
                }
                catch { /* fall through */ }
            }

            return $"{label} ({req.responseCode}): {error}";
        }

        private bool CheckRateLimit(Action<string> onError)
        {
            float now = UnityEngine.Time.realtimeSinceStartup;
            if (now - _rateWindowStart > RateWindowSeconds)
            {
                _requestCount = 0;
                _rateWindowStart = now;
            }

            _requestCount++;
            if (_requestCount > MaxRequestsPerMinute)
            {
                string msg = "Rate limit exceeded (60 req/min). Please retry later.";
                LogDebug($"RATE LIMITED: {msg}");
                onError?.Invoke(msg);
                return false;
            }

            return true;
        }

        private void LogDebug(string message)
        {
            if (_debug)
                Debug.Log($"[DeShop HTTP] {message}");
        }

        // ─── Internal JSON Error Body ───────────────────────────────────────

        [Serializable]
        private class ErrorBody
        {
            public string error;
        }
    }
}
