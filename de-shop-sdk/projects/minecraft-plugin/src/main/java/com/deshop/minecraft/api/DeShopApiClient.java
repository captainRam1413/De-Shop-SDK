package com.deshop.minecraft.api;

import com.deshop.minecraft.DeShopPlugin;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/**
 * HTTP client for the De-Shop Flask backend.
 *
 * All network calls run async (off the main thread) to avoid server lag.
 * Results are cached per-wallet and refreshed on sync interval.
 */
public class DeShopApiClient {

    private final String baseUrl;
    private final DeShopPlugin plugin;
    private final Gson gson = new Gson();

    /** Cached inventory: wallet → list of skin data */
    private final Map<String, List<SkinData>> inventoryCache = new ConcurrentHashMap<>();

    public DeShopApiClient(String baseUrl, DeShopPlugin plugin) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.plugin = plugin;
    }

    // ── Data classes ──────────────────────────────────────

    public record SkinData(
            int id,
            int asaId,
            String name,
            String rarity,
            String skinType,
            String owner,
            boolean listed,
            double listPrice
    ) {}

    public record MarketListing(
            int id,
            String name,
            String rarity,
            double price,
            String seller
    ) {}

    // ── Inventory ─────────────────────────────────────────

    /** Fetch inventory async and cache it. */
    public void fetchInventoryAsync(String wallet, Consumer<List<SkinData>> callback) {
        plugin.getServer().getScheduler().runTaskAsynchronously(plugin, () -> {
            try {
                String url = baseUrl + "/bridge/minecraft/" + wallet;
                JsonObject json = httpGet(url);
                List<SkinData> skins = parseSkins(json);
                inventoryCache.put(wallet, skins);

                // Callback on main thread
                plugin.getServer().getScheduler().runTask(plugin, () -> callback.accept(skins));
            } catch (Exception e) {
                plugin.getLogger().warning("Failed to fetch inventory for " + wallet + ": " + e.getMessage());
                plugin.getServer().getScheduler().runTask(plugin, () -> callback.accept(List.of()));
            }
        });
    }

    /** Get cached inventory (non-blocking). */
    public List<SkinData> getCachedInventory(String wallet) {
        return inventoryCache.getOrDefault(wallet, List.of());
    }

    /** Find a specific skin by ID in cached data. */
    public SkinData findSkin(String wallet, int skinId) {
        return getCachedInventory(wallet).stream()
                .filter(s -> s.id() == skinId || s.asaId() == skinId)
                .findFirst()
                .orElse(null);
    }

    // ── Marketplace ───────────────────────────────────────

    /** Fetch marketplace listings async. */
    public void fetchMarketplaceAsync(Consumer<List<MarketListing>> callback) {
        plugin.getServer().getScheduler().runTaskAsynchronously(plugin, () -> {
            try {
                JsonObject json = httpGet(baseUrl + "/marketplace");
                JsonArray market = json.getAsJsonArray("marketplace");
                List<MarketListing> listings = new ArrayList<>();

                for (JsonElement el : market) {
                    JsonObject obj = el.getAsJsonObject();
                    listings.add(new MarketListing(
                            obj.get("id").getAsInt(),
                            obj.has("name") ? obj.get("name").getAsString() : "Unknown",
                            obj.has("rarity") ? obj.get("rarity").getAsString() : "common",
                            obj.has("list_price") && !obj.get("list_price").isJsonNull()
                                    ? obj.get("list_price").getAsDouble() : 0,
                            obj.has("owner") ? obj.get("owner").getAsString() : "unknown"
                    ));
                }

                plugin.getServer().getScheduler().runTask(plugin, () -> callback.accept(listings));
            } catch (Exception e) {
                plugin.getLogger().warning("Failed to fetch marketplace: " + e.getMessage());
                plugin.getServer().getScheduler().runTask(plugin, () -> callback.accept(List.of()));
            }
        });
    }

    // ── Health Check ──────────────────────────────────────

    /** Check if the backend is reachable (async). */
    public void healthCheckAsync(Consumer<Boolean> callback) {
        plugin.getServer().getScheduler().runTaskAsynchronously(plugin, () -> {
            try {
                httpGet(baseUrl + "/health");
                plugin.getServer().getScheduler().runTask(plugin, () -> callback.accept(true));
            } catch (Exception e) {
                plugin.getServer().getScheduler().runTask(plugin, () -> callback.accept(false));
            }
        });
    }

    // ── HTTP helpers ──────────────────────────────────────

    private JsonObject httpGet(String urlStr) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) URI.create(urlStr).toURL().openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("User-Agent", "DeShopMinecraftPlugin/1.0");
        conn.setRequestProperty("Accept", "application/json");
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(5000);

        int code = conn.getResponseCode();
        if (code != 200) {
            throw new RuntimeException("HTTP " + code + " from " + urlStr);
        }

        try (var reader = new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8)) {
            return gson.fromJson(reader, JsonObject.class);
        }
    }

    private List<SkinData> parseSkins(JsonObject json) {
        List<SkinData> skins = new ArrayList<>();
        JsonArray skinsArray = json.getAsJsonArray("skins");
        if (skinsArray == null) return skins;

        for (JsonElement el : skinsArray) {
            JsonObject obj = el.getAsJsonObject();
            skins.add(new SkinData(
                    obj.has("id") ? obj.get("id").getAsInt() : 0,
                    obj.has("asa_id") ? obj.get("asa_id").getAsInt() : 0,
                    obj.has("name") ? obj.get("name").getAsString() : "Unknown Skin",
                    obj.has("rarity") ? obj.get("rarity").getAsString() : "common",
                    obj.has("skin_type") ? obj.get("skin_type").getAsString() : "weapon",
                    obj.has("owner") ? obj.get("owner").getAsString() : "",
                    obj.has("listed") && obj.get("listed").getAsBoolean(),
                    obj.has("list_price") && !obj.get("list_price").isJsonNull()
                            ? obj.get("list_price").getAsDouble() : 0
            ));
        }
        return skins;
    }
}
