package com.deshop.minecraft.listeners;

import com.deshop.minecraft.DeShopPlugin;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.text.format.TextDecoration;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;

/**
 * Handles player join/quit events:
 *   - On join: restore linked wallet from config, show welcome, fetch inventory
 *   - On quit: stop particle effects, cleanup
 */
public class PlayerListener implements Listener {

    private static final TextColor CYAN = TextColor.fromHexString("#8be9fd");
    private static final TextColor GREEN = TextColor.fromHexString("#50fa7b");
    private static final TextColor GRAY = TextColor.fromHexString("#6272a4");

    private final DeShopPlugin plugin;

    public PlayerListener(DeShopPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler
    public void onJoin(PlayerJoinEvent event) {
        var player = event.getPlayer();
        var uuid = player.getUniqueId();

        // Restore wallet link from config
        String savedWallet = plugin.getConfig().getString("wallets." + uuid.toString());
        if (savedWallet != null && !savedWallet.isEmpty()) {
            plugin.getLinkedWallets().put(uuid, savedWallet);

            // Send welcome message
            plugin.getServer().getScheduler().runTaskLater(plugin, () -> {
                player.sendMessage(Component.text()
                        .append(Component.text("\n⬡ ", CYAN))
                        .append(Component.text("De-Shop SDK", CYAN, TextDecoration.BOLD))
                        .append(Component.text(" — Wallet linked: ", GRAY))
                        .append(Component.text(savedWallet.substring(0, 6) + "...\n", GREEN))
                        .append(Component.text("  Use ", GRAY))
                        .append(Component.text("/deshop skins", GREEN))
                        .append(Component.text(" to view your NFT inventory\n", GRAY))
                        .build());
            }, 40L); // 2 seconds after join

            // Pre-fetch inventory in background
            plugin.getApiClient().fetchInventoryAsync(savedWallet, skins -> {
                // Cached silently
            });
        } else {
            // First-time player — show onboarding
            plugin.getServer().getScheduler().runTaskLater(plugin, () -> {
                player.sendMessage(Component.text()
                        .append(Component.text("\n⬡ ", CYAN))
                        .append(Component.text("De-Shop SDK", CYAN, TextDecoration.BOLD))
                        .append(Component.text(" — NFT Skins enabled on this server!\n", GRAY))
                        .append(Component.text("  Link your wallet: ", GRAY))
                        .append(Component.text("/deshop link <wallet_address>\n", GREEN))
                        .build());
            }, 40L);
        }
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent event) {
        var player = event.getPlayer();
        // Cleanup particles and equipped skins
        plugin.getSkinManager().unequipSkin(player);
    }
}
