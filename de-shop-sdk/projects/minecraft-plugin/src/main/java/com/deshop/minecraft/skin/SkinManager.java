package com.deshop.minecraft.skin;

import com.deshop.minecraft.DeShopPlugin;
import com.deshop.minecraft.api.DeShopApiClient.SkinData;
import org.bukkit.Color;
import org.bukkit.Material;
import org.bukkit.Particle;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemFlag;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.LeatherArmorMeta;
import org.bukkit.scheduler.BukkitTask;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Applies NFT skins as in-game cosmetics:
 *   - Weapon skins  → Custom-named sword/crossbow with enchant glint
 *   - Character skins → Full dyed leather armor set
 *   - Particle trails for epic+ rarity
 *
 * All items are purely cosmetic and given alongside the player's real gear
 * using the off-hand slot for weapons and armor slots for character skins.
 */
public class SkinManager {

    private final DeShopPlugin plugin;

    /** Players with active particle tasks */
    private final Map<UUID, BukkitTask> particleTasks = new ConcurrentHashMap<>();

    /** Players with equipped skins */
    private final Map<UUID, SkinData> equippedSkins = new ConcurrentHashMap<>();

    private static final Map<String, Color> RARITY_COLORS = Map.of(
            "common", Color.fromRGB(0x6B, 0x72, 0x80),
            "rare", Color.fromRGB(0x3B, 0x82, 0xF6),
            "epic", Color.fromRGB(0xA8, 0x55, 0xF7),
            "legendary", Color.fromRGB(0xF5, 0x9E, 0x0B)
    );

    private static final Map<String, Particle> RARITY_PARTICLES = Map.of(
            "rare", Particle.ENCHANT,
            "epic", Particle.WITCH,
            "legendary", Particle.FLAME
    );

    public SkinManager(DeShopPlugin plugin) {
        this.plugin = plugin;
    }

    /**
     * Equip a skin on a player.
     * - Weapon skins: gives a custom-named diamond sword in off-hand
     * - Character skins: gives dyed leather armor
     * - Epic+ gets particle trails
     */
    public void equipSkin(Player player, SkinData skin) {
        // Remove any previous skin first
        unequipSkin(player);

        equippedSkins.put(player.getUniqueId(), skin);
        Color color = RARITY_COLORS.getOrDefault(skin.rarity().toLowerCase(), RARITY_COLORS.get("common"));
        String displayName = DeShopPlugin.colorize(getRarityColor(skin.rarity()) + skin.name());

        if ("weapon".equalsIgnoreCase(skin.skinType())) {
            // ── Weapon Skin ──
            ItemStack weapon = new ItemStack(getWeaponMaterial(skin.name()));
            var meta = weapon.getItemMeta();
            if (meta != null) {
                meta.setDisplayName(displayName);
                meta.setLore(java.util.List.of(
                        DeShopPlugin.colorize("&8─────────────────"),
                        DeShopPlugin.colorize("&7Rarity: " + getRarityColor(skin.rarity()) + skin.rarity().toUpperCase()),
                        DeShopPlugin.colorize("&7ASA ID: &f#" + skin.asaId()),
                        DeShopPlugin.colorize("&7Type: &fNFT Weapon Skin"),
                        DeShopPlugin.colorize("&8─────────────────"),
                        DeShopPlugin.colorize("&b⬡ De-Shop SDK")
                ));
                meta.addEnchant(Enchantment.SHARPNESS, 1, true);
                meta.addItemFlags(ItemFlag.HIDE_ENCHANTS, ItemFlag.HIDE_ATTRIBUTES);
                weapon.setItemMeta(meta);
            }
            player.getInventory().setItemInOffHand(weapon);

        } else {
            // ── Character Skin ── (full leather armor set)
            setArmorPiece(player, Material.LEATHER_HELMET, color, displayName + " Helm", skin);
            setArmorPiece(player, Material.LEATHER_CHESTPLATE, color, displayName + " Chest", skin);
            setArmorPiece(player, Material.LEATHER_LEGGINGS, color, displayName + " Legs", skin);
            setArmorPiece(player, Material.LEATHER_BOOTS, color, displayName + " Boots", skin);
        }

        // Particle effects for rare+
        startParticles(player, skin.rarity());
    }

    /** Remove all cosmetic items from the player. */
    public void unequipSkin(Player player) {
        equippedSkins.remove(player.getUniqueId());

        // Clear off-hand
        player.getInventory().setItemInOffHand(new ItemStack(Material.AIR));

        // Clear armor (only if it's our cosmetic leather)
        clearCosmeticArmor(player);

        // Stop particles
        stopParticles(player);
    }

    /** Get equipped skin for a player. */
    public SkinData getEquippedSkin(UUID playerId) {
        return equippedSkins.get(playerId);
    }

    /** Cleanup all tasks on disable. */
    public void cleanup() {
        particleTasks.values().forEach(BukkitTask::cancel);
        particleTasks.clear();
    }

    // ── Private helpers ──────────────────────────────────

    private void setArmorPiece(Player player, Material material, Color color, String name, SkinData skin) {
        ItemStack armor = new ItemStack(material);
        var meta = (LeatherArmorMeta) armor.getItemMeta();
        if (meta != null) {
            meta.setColor(color);
            meta.setDisplayName(DeShopPlugin.colorize(getRarityColor(skin.rarity()) + name));
            meta.setLore(java.util.List.of(
                    DeShopPlugin.colorize("&7NFT Skin: " + getRarityColor(skin.rarity()) + skin.rarity().toUpperCase()),
                    DeShopPlugin.colorize("&b⬡ De-Shop SDK")
            ));
            meta.addEnchant(Enchantment.UNBREAKING, 1, true);
            meta.addItemFlags(ItemFlag.HIDE_ENCHANTS, ItemFlag.HIDE_ATTRIBUTES, ItemFlag.HIDE_DYE);
            armor.setItemMeta(meta);
        }

        switch (material) {
            case LEATHER_HELMET -> player.getInventory().setHelmet(armor);
            case LEATHER_CHESTPLATE -> player.getInventory().setChestplate(armor);
            case LEATHER_LEGGINGS -> player.getInventory().setLeggings(armor);
            case LEATHER_BOOTS -> player.getInventory().setBoots(armor);
            default -> {}
        }
    }

    private void clearCosmeticArmor(Player player) {
        // Only clear if the armor is cosmetic leather with our lore
        for (var slot : new ItemStack[]{
                player.getInventory().getHelmet(),
                player.getInventory().getChestplate(),
                player.getInventory().getLeggings(),
                player.getInventory().getBoots()
        }) {
            if (slot != null && slot.hasItemMeta()) {
                var lore = slot.getItemMeta().getLore();
                if (lore != null && lore.stream().anyMatch(l -> l.contains("De-Shop SDK"))) {
                    // It's ours — clear it
                    if (slot.getType() == Material.LEATHER_HELMET) player.getInventory().setHelmet(null);
                    if (slot.getType() == Material.LEATHER_CHESTPLATE) player.getInventory().setChestplate(null);
                    if (slot.getType() == Material.LEATHER_LEGGINGS) player.getInventory().setLeggings(null);
                    if (slot.getType() == Material.LEATHER_BOOTS) player.getInventory().setBoots(null);
                }
            }
        }
    }

    private void startParticles(Player player, String rarity) {
        Particle particle = RARITY_PARTICLES.get(rarity.toLowerCase());
        if (particle == null) return;

        boolean effectsEnabled = plugin.getConfig().getBoolean("effects." + rarity.toLowerCase(), false);
        if (!effectsEnabled) return;

        BukkitTask task = plugin.getServer().getScheduler().runTaskTimer(plugin, () -> {
            if (!player.isOnline()) {
                stopParticles(player);
                return;
            }
            var loc = player.getLocation().add(0, 2.2, 0);
            player.getWorld().spawnParticle(particle, loc, 5, 0.3, 0.2, 0.3, 0.01);
        }, 0L, 10L); // Every 0.5 seconds

        particleTasks.put(player.getUniqueId(), task);
    }

    private void stopParticles(Player player) {
        BukkitTask task = particleTasks.remove(player.getUniqueId());
        if (task != null) task.cancel();
    }

    /** Map skin name keywords to a Minecraft weapon material. */
    private Material getWeaponMaterial(String skinName) {
        String lower = skinName.toLowerCase();
        if (lower.contains("sword") || lower.contains("blade") || lower.contains("katana")) return Material.DIAMOND_SWORD;
        if (lower.contains("axe")) return Material.DIAMOND_AXE;
        if (lower.contains("bow") || lower.contains("sniper") || lower.contains("awp")) return Material.CROSSBOW;
        if (lower.contains("trident") || lower.contains("spear")) return Material.TRIDENT;
        if (lower.contains("mace") || lower.contains("hammer")) return Material.MACE;
        // Default: netherite sword for the cool factor
        return Material.NETHERITE_SWORD;
    }

    /** Get the Minecraft color code for a rarity. */
    private String getRarityColor(String rarity) {
        return switch (rarity.toLowerCase()) {
            case "common" -> "&7";
            case "rare" -> "&9";
            case "epic" -> "&5";
            case "legendary" -> "&6";
            case "mythic" -> "&d";
            default -> "&f";
        };
    }
}
