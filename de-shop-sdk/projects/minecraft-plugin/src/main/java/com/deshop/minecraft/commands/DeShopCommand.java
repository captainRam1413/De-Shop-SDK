package com.deshop.minecraft.commands;

import com.deshop.minecraft.DeShopPlugin;
import com.deshop.minecraft.api.DeShopApiClient;
import com.deshop.minecraft.api.DeShopApiClient.SkinData;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.event.HoverEvent;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.text.format.TextDecoration;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import org.jetbrains.annotations.NotNull;

import java.util.List;
import java.util.stream.Collectors;

/**
 * /deshop command handler.
 *
 * Subcommands:
 *   link <wallet>   — Link your Algorand wallet
 *   unlink          — Unlink wallet
 *   skins           — List your NFT skins
 *   equip <id>      — Equip a skin as cosmetic
 *   unequip         — Remove cosmetics
 *   market          — Show marketplace URL
 *   info            — Plugin info
 *   reload          — Reload config (op only)
 */
public class DeShopCommand implements CommandExecutor, TabCompleter {

    private final DeShopPlugin plugin;

    private static final TextColor CYAN = TextColor.fromHexString("#8be9fd");
    private static final TextColor GOLD = TextColor.fromHexString("#f59e0b");
    private static final TextColor GREEN = TextColor.fromHexString("#50fa7b");
    private static final TextColor RED = TextColor.fromHexString("#ff5555");
    private static final TextColor GRAY = TextColor.fromHexString("#6272a4");

    public DeShopCommand(DeShopPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, @NotNull Command cmd,
                             @NotNull String label, @NotNull String[] args) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage("This command is player-only.");
            return true;
        }

        if (args.length == 0) {
            sendHelp(player);
            return true;
        }

        switch (args[0].toLowerCase()) {
            case "link" -> handleLink(player, args);
            case "unlink" -> handleUnlink(player);
            case "skins", "inventory", "inv" -> handleSkins(player);
            case "equip" -> handleEquip(player, args);
            case "unequip" -> handleUnequip(player);
            case "market", "marketplace" -> handleMarket(player);
            case "info" -> handleInfo(player);
            case "reload" -> handleReload(player);
            default -> sendHelp(player);
        }

        return true;
    }

    // ── Subcommands ──────────────────────────────────────

    private void handleLink(Player player, String[] args) {
        if (args.length < 2) {
            player.sendMessage(Component.text("Usage: /deshop link <wallet_address>", RED));
            return;
        }

        String existingWallet = plugin.getLinkedWallet(player.getUniqueId());
        if (existingWallet != null) {
            player.sendMessage(Component.text(plugin.msg("wallet-already-linked")));
            return;
        }

        String wallet = args[1];
        if (wallet.length() < 10) {
            player.sendMessage(Component.text("Invalid wallet address.", RED));
            return;
        }

        plugin.linkWallet(player.getUniqueId(), wallet);

        player.sendMessage(Component.text()
                .append(Component.text("⬡ ", CYAN))
                .append(Component.text("Wallet linked! ", GREEN))
                .append(Component.text(wallet.substring(0, 6) + "..." + wallet.substring(wallet.length() - 4), GRAY))
                .build());

        // Immediately fetch inventory
        plugin.getApiClient().fetchInventoryAsync(wallet, skins -> {
            player.sendMessage(Component.text()
                    .append(Component.text("⬡ ", CYAN))
                    .append(Component.text("Found " + skins.size() + " NFT skin(s)! ", GREEN))
                    .append(Component.text("Use /deshop skins to view.", GRAY))
                    .build());
        });
    }

    private void handleUnlink(Player player) {
        plugin.getSkinManager().unequipSkin(player);
        plugin.unlinkWallet(player.getUniqueId());
        player.sendMessage(Component.text()
                .append(Component.text("⬡ ", CYAN))
                .append(Component.text("Wallet unlinked and skins removed.", NamedTextColor.YELLOW))
                .build());
    }

    private void handleSkins(Player player) {
        String wallet = plugin.getLinkedWallet(player.getUniqueId());
        if (wallet == null) {
            player.sendMessage(Component.text(plugin.msg("no-wallet")));
            return;
        }

        // Fetch fresh data
        plugin.getApiClient().fetchInventoryAsync(wallet, skins -> {
            if (skins.isEmpty()) {
                player.sendMessage(Component.text(plugin.msg("no-skins")));
                return;
            }

            player.sendMessage(Component.text()
                    .append(Component.text("\n⬡ ", CYAN))
                    .append(Component.text("YOUR NFT SKINS", CYAN, TextDecoration.BOLD))
                    .append(Component.text(" (" + skins.size() + ")\n", GRAY))
                    .build());

            for (SkinData skin : skins) {
                TextColor rarityColor = getRarityTextColor(skin.rarity());

                Component skinLine = Component.text()
                        .append(Component.text("  ▸ ", GRAY))
                        .append(Component.text("#" + skin.id() + " ", GRAY))
                        .append(Component.text(skin.name(), rarityColor, TextDecoration.BOLD))
                        .append(Component.text(" [" + skin.rarity().toUpperCase() + "]", rarityColor))
                        .append(Component.text(" " + (skin.skinType().equals("weapon") ? "🔫" : "🧑"), NamedTextColor.WHITE))
                        .append(Component.text("  "))
                        .append(Component.text("[EQUIP]", GREEN, TextDecoration.BOLD)
                                .clickEvent(ClickEvent.runCommand("/deshop equip " + skin.id()))
                                .hoverEvent(HoverEvent.showText(Component.text("Click to equip " + skin.name(), GREEN))))
                        .build();

                player.sendMessage(skinLine);
            }

            player.sendMessage(Component.text(""));
        });
    }

    private void handleEquip(Player player, String[] args) {
        if (args.length < 2) {
            player.sendMessage(Component.text("Usage: /deshop equip <skin_id>", RED));
            return;
        }

        String wallet = plugin.getLinkedWallet(player.getUniqueId());
        if (wallet == null) {
            player.sendMessage(Component.text(plugin.msg("no-wallet")));
            return;
        }

        int skinId;
        try {
            skinId = Integer.parseInt(args[1]);
        } catch (NumberFormatException e) {
            player.sendMessage(Component.text("Invalid skin ID.", RED));
            return;
        }

        SkinData skin = plugin.getApiClient().findSkin(wallet, skinId);
        if (skin == null) {
            // Try refreshing first
            plugin.getApiClient().fetchInventoryAsync(wallet, skins -> {
                SkinData found = plugin.getApiClient().findSkin(wallet, skinId);
                if (found == null) {
                    player.sendMessage(Component.text("Skin #" + skinId + " not found in your inventory.", RED));
                } else {
                    applySkin(player, found);
                }
            });
            return;
        }

        applySkin(player, skin);
    }

    private void applySkin(Player player, SkinData skin) {
        plugin.getSkinManager().equipSkin(player, skin);

        TextColor rarityColor = getRarityTextColor(skin.rarity());
        player.sendMessage(Component.text()
                .append(Component.text("⬡ ", CYAN))
                .append(Component.text("Equipped ", GREEN))
                .append(Component.text(skin.name(), rarityColor, TextDecoration.BOLD))
                .append(Component.text(" [" + skin.rarity().toUpperCase() + "]", rarityColor))
                .build());
    }

    private void handleUnequip(Player player) {
        plugin.getSkinManager().unequipSkin(player);
        player.sendMessage(Component.text()
                .append(Component.text("⬡ ", CYAN))
                .append(Component.text("All cosmetic skins removed.", NamedTextColor.YELLOW))
                .build());
    }

    private void handleMarket(Player player) {
        String url = "http://localhost:5173";
        player.sendMessage(Component.text()
                .append(Component.text("\n⬡ ", CYAN))
                .append(Component.text("DE-SHOP MARKETPLACE", GOLD, TextDecoration.BOLD))
                .append(Component.text("\n  Visit: ", GRAY))
                .append(Component.text(url, CYAN, TextDecoration.UNDERLINED)
                        .clickEvent(ClickEvent.openUrl(url))
                        .hoverEvent(HoverEvent.showText(Component.text("Open De-Shop Marketplace", GREEN))))
                .append(Component.text("\n  Mint, trade, and sell NFT skins on Algorand!", GRAY))
                .append(Component.text("\n"))
                .build());
    }

    private void handleInfo(Player player) {
        String wallet = plugin.getLinkedWallet(player.getUniqueId());
        var equipped = plugin.getSkinManager().getEquippedSkin(player.getUniqueId());

        player.sendMessage(Component.text()
                .append(Component.text("\n═══════════════════════════════\n", GRAY))
                .append(Component.text("  ⬡ De-Shop SDK ", CYAN, TextDecoration.BOLD))
                .append(Component.text("v" + plugin.getDescription().getVersion() + "\n", GRAY))
                .append(Component.text("  Wallet: ", GRAY))
                .append(Component.text(wallet != null
                        ? wallet.substring(0, 6) + "..." + wallet.substring(wallet.length() - 4)
                        : "Not linked", wallet != null ? GREEN : RED))
                .append(Component.text("\n  Skin: ", GRAY))
                .append(equipped != null
                        ? Component.text(equipped.name() + " [" + equipped.rarity().toUpperCase() + "]",
                        getRarityTextColor(equipped.rarity()))
                        : Component.text("None equipped", GRAY))
                .append(Component.text("\n  Network: ", GRAY))
                .append(Component.text("Algorand TestNet", CYAN))
                .append(Component.text("\n═══════════════════════════════\n", GRAY))
                .build());

        // Async health check
        plugin.getApiClient().healthCheckAsync(healthy -> {
            player.sendMessage(Component.text()
                    .append(Component.text("  Backend: ", GRAY))
                    .append(healthy
                            ? Component.text("● Online", GREEN)
                            : Component.text("● Offline", RED))
                    .build());
        });
    }

    private void handleReload(Player player) {
        if (!player.hasPermission("deshop.admin")) {
            player.sendMessage(Component.text("No permission.", RED));
            return;
        }
        plugin.reloadConfig();
        player.sendMessage(Component.text()
                .append(Component.text("⬡ ", CYAN))
                .append(Component.text("Config reloaded.", GREEN))
                .build());
    }

    private void sendHelp(Player player) {
        player.sendMessage(Component.text()
                .append(Component.text("\n⬡ ", CYAN))
                .append(Component.text("De-Shop SDK Commands\n", CYAN, TextDecoration.BOLD))
                .append(Component.text("  /deshop link <wallet>", GREEN)).append(Component.text(" — Link your Algorand wallet\n", GRAY))
                .append(Component.text("  /deshop unlink", GREEN)).append(Component.text(" — Unlink wallet\n", GRAY))
                .append(Component.text("  /deshop skins", GREEN)).append(Component.text(" — View your NFT skins\n", GRAY))
                .append(Component.text("  /deshop equip <id>", GREEN)).append(Component.text(" — Equip a skin\n", GRAY))
                .append(Component.text("  /deshop unequip", GREEN)).append(Component.text(" — Remove cosmetics\n", GRAY))
                .append(Component.text("  /deshop market", GREEN)).append(Component.text(" — Marketplace link\n", GRAY))
                .append(Component.text("  /deshop info", GREEN)).append(Component.text(" — Plugin info\n", GRAY))
                .build());
    }

    // ── Tab completion ───────────────────────────────────

    @Override
    public List<String> onTabComplete(@NotNull CommandSender sender, @NotNull Command cmd,
                                       @NotNull String label, @NotNull String[] args) {
        if (args.length == 1) {
            return List.of("link", "unlink", "skins", "equip", "unequip", "market", "info", "reload")
                    .stream()
                    .filter(s -> s.startsWith(args[0].toLowerCase()))
                    .collect(Collectors.toList());
        }

        if (args.length == 2 && args[0].equalsIgnoreCase("equip")) {
            if (sender instanceof Player player) {
                String wallet = plugin.getLinkedWallet(player.getUniqueId());
                if (wallet != null) {
                    return plugin.getApiClient().getCachedInventory(wallet).stream()
                            .map(s -> String.valueOf(s.id()))
                            .filter(id -> id.startsWith(args[1]))
                            .collect(Collectors.toList());
                }
            }
        }

        return List.of();
    }

    // ── Helpers ──────────────────────────────────────────

    private TextColor getRarityTextColor(String rarity) {
        return switch (rarity.toLowerCase()) {
            case "common" -> TextColor.fromHexString("#9ca3af");
            case "rare" -> TextColor.fromHexString("#60a5fa");
            case "epic" -> TextColor.fromHexString("#c084fc");
            case "legendary" -> TextColor.fromHexString("#fbbf24");
            case "mythic" -> TextColor.fromHexString("#f472b6");
            default -> NamedTextColor.WHITE;
        };
    }
}
