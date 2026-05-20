package com.deshop.minecraft;

import com.deshop.minecraft.api.DeShopApiClient;
import com.deshop.minecraft.commands.DeShopCommand;
import com.deshop.minecraft.listeners.PlayerListener;
import com.deshop.minecraft.skin.SkinManager;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * De-Shop SDK — Minecraft Plugin
 * ================================
 * Bridges the De-Shop NFT marketplace (Algorand) with a live Minecraft server.
 *
 * Players link their wallet, then view/equip NFT skins as in-game cosmetics:
 *   - Custom-named weapons with enchant glints
 *   - Dyed leather armor matching rarity colors
 *   - Particle trails for epic+ skins
 *
 * Commands:
 *   /deshop link <wallet>   — Link Algorand wallet
 *   /deshop unlink          — Unlink wallet
 *   /deshop skins           — List owned NFT skins
 *   /deshop equip <id>      — Equip a skin (visual cosmetics)
 *   /deshop unequip         — Remove cosmetics
 *   /deshop market          — Show marketplace link
 *   /deshop info            — Plugin info
 */
public class DeShopPlugin extends JavaPlugin {

    private static DeShopPlugin instance;

    /** Player UUID → linked Algorand wallet address */
    private final Map<UUID, String> linkedWallets = new ConcurrentHashMap<>();

    private DeShopApiClient apiClient;
    private SkinManager skinManager;

    @Override
    public void onEnable() {
        instance = this;

        // Save default config
        saveDefaultConfig();

        // Initialize API client
        String backendUrl = getConfig().getString("backend-url", "http://localhost:5000");
        apiClient = new DeShopApiClient(backendUrl, this);

        // Initialize skin manager
        skinManager = new SkinManager(this);

        // Register command
        var cmd = getCommand("deshop");
        if (cmd != null) {
            DeShopCommand handler = new DeShopCommand(this);
            cmd.setExecutor(handler);
            cmd.setTabCompleter(handler);
        }

        // Register listeners
        getServer().getPluginManager().registerEvents(new PlayerListener(this), this);

        // Start periodic sync task
        int syncInterval = getConfig().getInt("sync-interval", 60) * 20; // ticks
        getServer().getScheduler().runTaskTimerAsynchronously(this, () -> {
            for (var entry : linkedWallets.entrySet()) {
                var player = getServer().getPlayer(entry.getKey());
                if (player != null && player.isOnline()) {
                    apiClient.fetchInventoryAsync(entry.getValue(), (skins) -> {
                        // Cache is updated inside apiClient
                    });
                }
            }
        }, syncInterval, syncInterval);

        getLogger().info("═══════════════════════════════════════");
        getLogger().info("  De-Shop SDK v" + getDescription().getVersion());
        getLogger().info("  Backend: " + backendUrl);
        getLogger().info("  Commands: /deshop link|skins|equip");
        getLogger().info("═══════════════════════════════════════");
    }

    @Override
    public void onDisable() {
        if (skinManager != null) {
            skinManager.cleanup();
        }
        getLogger().info("De-Shop SDK disabled.");
    }

    // ── Accessors ──────────────────────────────────────────

    public static DeShopPlugin getInstance() {
        return instance;
    }

    public DeShopApiClient getApiClient() {
        return apiClient;
    }

    public SkinManager getSkinManager() {
        return skinManager;
    }

    public Map<UUID, String> getLinkedWallets() {
        return linkedWallets;
    }

    public void linkWallet(UUID playerId, String wallet) {
        linkedWallets.put(playerId, wallet);
        // Persist to config
        getConfig().set("wallets." + playerId.toString(), wallet);
        saveConfig();
    }

    public void unlinkWallet(UUID playerId) {
        linkedWallets.remove(playerId);
        getConfig().set("wallets." + playerId.toString(), null);
        saveConfig();
    }

    public String getLinkedWallet(UUID playerId) {
        return linkedWallets.get(playerId);
    }

    /** Get a formatted message from config. */
    public String msg(String key) {
        String prefix = getConfig().getString("messages.prefix", "&8[&bDeShop&8] &7");
        String message = getConfig().getString("messages." + key, "&cMissing message: " + key);
        return colorize(prefix + message);
    }

    /** Translate & color codes to Minecraft formatting. */
    public static String colorize(String text) {
        return text.replace("&", "§");
    }
}
