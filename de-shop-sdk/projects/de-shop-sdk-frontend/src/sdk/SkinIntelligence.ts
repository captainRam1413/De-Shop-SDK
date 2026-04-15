/**
 * Skin Intelligence Engine
 * ─────────────────────────
 * Classifies, analyzes, maps, and scores NFT game skins.
 * Rule-based AI with extensible architecture for future ML integration.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SkinType = 'gun_skin' | 'character_skin' | 'accessory'

export type WeaponClass = 'AR' | 'SMG' | 'LMG' | 'Sniper' | 'Shotgun' | 'Pistol' | 'Melee' | 'Launcher' | 'Unknown'

export type SkinAttributes = {
  weapon?: string
  rarity?: string
  effect?: string
  style?: string
  color?: string
  category?: string
  [key: string]: string | undefined
}

export type NFTMetadata = {
  name: string
  image?: string
  attributes?: SkinAttributes
  rarity?: string
  description?: string
}

export type GameMapping = {
  game: string
  category: string
  weapon_class: WeaponClass
  operator_type?: string
  cosmetic_slot?: string
}

export type SkinAnalysis = {
  type: SkinType
  game_mapping: GameMapping
  rarity_score: number
  visual_style: string
  suggested_price: number
  confidence: number
  tags: string[]
  effects: string[]
  description: string
}

// ─── Knowledge Base ──────────────────────────────────────────────────────────

const WEAPON_PATTERNS: Record<string, { class: WeaponClass; category: string }> = {
  // Assault Rifles
  'ak': { class: 'AR', category: 'Assault Rifle Skin' },
  'ak-47': { class: 'AR', category: 'Assault Rifle Skin' },
  'ak47': { class: 'AR', category: 'Assault Rifle Skin' },
  'ar': { class: 'AR', category: 'Assault Rifle Skin' },
  'ar-15': { class: 'AR', category: 'Assault Rifle Skin' },
  'm4': { class: 'AR', category: 'Assault Rifle Skin' },
  'm4a1': { class: 'AR', category: 'Assault Rifle Skin' },
  'm16': { class: 'AR', category: 'Assault Rifle Skin' },
  'scar': { class: 'AR', category: 'Assault Rifle Skin' },
  'grau': { class: 'AR', category: 'Assault Rifle Skin' },
  'kilo': { class: 'AR', category: 'Assault Rifle Skin' },
  'fal': { class: 'AR', category: 'Assault Rifle Skin' },
  'assault': { class: 'AR', category: 'Assault Rifle Skin' },
  'rifle': { class: 'AR', category: 'Assault Rifle Skin' },
  // SMGs
  'mp5': { class: 'SMG', category: 'SMG Skin' },
  'mp7': { class: 'SMG', category: 'SMG Skin' },
  'mp9': { class: 'SMG', category: 'SMG Skin' },
  'uzi': { class: 'SMG', category: 'SMG Skin' },
  'p90': { class: 'SMG', category: 'SMG Skin' },
  'smg': { class: 'SMG', category: 'SMG Skin' },
  'mac-10': { class: 'SMG', category: 'SMG Skin' },
  'vector': { class: 'SMG', category: 'SMG Skin' },
  // Snipers
  'sniper': { class: 'Sniper', category: 'Sniper Rifle Skin' },
  'awp': { class: 'Sniper', category: 'Sniper Rifle Skin' },
  'awm': { class: 'Sniper', category: 'Sniper Rifle Skin' },
  'kar98': { class: 'Sniper', category: 'Sniper Rifle Skin' },
  'hdr': { class: 'Sniper', category: 'Sniper Rifle Skin' },
  'ax-50': { class: 'Sniper', category: 'Sniper Rifle Skin' },
  'barrett': { class: 'Sniper', category: 'Sniper Rifle Skin' },
  // Shotguns
  'shotgun': { class: 'Shotgun', category: 'Shotgun Skin' },
  'r-90': { class: 'Shotgun', category: 'Shotgun Skin' },
  '725': { class: 'Shotgun', category: 'Shotgun Skin' },
  'spas': { class: 'Shotgun', category: 'Shotgun Skin' },
  // Pistols
  'pistol': { class: 'Pistol', category: 'Sidearm Skin' },
  'deagle': { class: 'Pistol', category: 'Sidearm Skin' },
  'glock': { class: 'Pistol', category: 'Sidearm Skin' },
  '1911': { class: 'Pistol', category: 'Sidearm Skin' },
  'revolver': { class: 'Pistol', category: 'Sidearm Skin' },
  'magnum': { class: 'Pistol', category: 'Sidearm Skin' },
  // LMGs
  'lmg': { class: 'LMG', category: 'LMG Skin' },
  'pkm': { class: 'LMG', category: 'LMG Skin' },
  'm249': { class: 'LMG', category: 'LMG Skin' },
  'bruen': { class: 'LMG', category: 'LMG Skin' },
  // Melee
  'knife': { class: 'Melee', category: 'Melee Weapon Skin' },
  'sword': { class: 'Melee', category: 'Melee Weapon Skin' },
  'blade': { class: 'Melee', category: 'Melee Weapon Skin' },
  'axe': { class: 'Melee', category: 'Melee Weapon Skin' },
  'katana': { class: 'Melee', category: 'Melee Weapon Skin' },
  'dagger': { class: 'Melee', category: 'Melee Weapon Skin' },
  // Launchers
  'rpg': { class: 'Launcher', category: 'Launcher Skin' },
  'launcher': { class: 'Launcher', category: 'Launcher Skin' },
  'jokr': { class: 'Launcher', category: 'Launcher Skin' },
}

const CHARACTER_KEYWORDS = [
  'operator', 'character', 'soldier', 'ghost', 'spectre', 'phantom',
  'warrior', 'ninja', 'samurai', 'knight', 'guardian', 'hunter',
  'assassin', 'commando', 'trooper', 'captain', 'agent', 'shadow',
  'skin', 'outfit', 'armor', 'suit', 'body', 'player', 'hero', 'champion',
]

const ACCESSORY_KEYWORDS = [
  'charm', 'sticker', 'spray', 'emblem', 'badge', 'banner',
  'calling card', 'emote', 'gestures', 'watch', 'pendant',
  'decal', 'tag', 'camo', 'wrap', 'parachute', 'glider',
  'wingsuit', 'vehicle', 'backpack', 'trail',
]

const EFFECT_MAP: Record<string, { visual: string; score_bonus: number }> = {
  'fire':       { visual: 'animated fire',       score_bonus: 1.5 },
  'flame':      { visual: 'animated fire',       score_bonus: 1.5 },
  'ice':        { visual: 'frost crystalline',   score_bonus: 1.3 },
  'frost':      { visual: 'frost crystalline',   score_bonus: 1.3 },
  'electric':   { visual: 'electric sparks',     score_bonus: 1.4 },
  'lightning':  { visual: 'electric sparks',      score_bonus: 1.4 },
  'neon':       { visual: 'neon glow',           score_bonus: 1.2 },
  'glow':       { visual: 'ambient glow',        score_bonus: 1.0 },
  'holographic':{ visual: 'holographic shimmer', score_bonus: 1.8 },
  'holo':       { visual: 'holographic shimmer', score_bonus: 1.8 },
  'dark':       { visual: 'shadow aura',         score_bonus: 1.1 },
  'shadow':     { visual: 'shadow aura',         score_bonus: 1.1 },
  'gold':       { visual: 'golden metallic',     score_bonus: 2.0 },
  'diamond':    { visual: 'diamond encrusted',   score_bonus: 2.5 },
  'plasma':     { visual: 'plasma energy',       score_bonus: 1.6 },
  'void':       { visual: 'void distortion',     score_bonus: 1.7 },
  'chromatic':  { visual: 'chromatic aberration', score_bonus: 1.9 },
  'dragon':     { visual: 'dragon themed',       score_bonus: 1.5 },
  'skull':      { visual: 'skull motif',         score_bonus: 1.1 },
  'galaxy':     { visual: 'galaxy animated',     score_bonus: 2.0 },
  'cosmic':     { visual: 'cosmic animated',     score_bonus: 2.0 },
  'reactive':   { visual: 'reactive kill-counter', score_bonus: 2.2 },
  'animated':   { visual: 'animated texture',    score_bonus: 1.5 },
  'tracer':     { visual: 'tracer bullets',      score_bonus: 1.8 },
  'dismemberment': { visual: 'dismemberment effect', score_bonus: 2.0 },
}

const RARITY_BASE_SCORES: Record<string, number> = {
  'common': 2.0,
  'uncommon': 3.5,
  'rare': 5.0,
  'epic': 7.0,
  'legendary': 8.5,
  'mythic': 9.5,
  'exotic': 10.0,
}

const RARITY_PRICE_MULTIPLIERS: Record<string, number> = {
  'common': 1,
  'uncommon': 2,
  'rare': 5,
  'epic': 12,
  'legendary': 30,
  'mythic': 80,
  'exotic': 150,
}

const STYLE_KEYWORDS: Record<string, string[]> = {
  'military': ['mil', 'camo', 'tactical', 'ops', 'combat', 'stealth'],
  'futuristic': ['cyber', 'neon', 'tech', 'mech', 'robot', 'synth', 'virtual'],
  'fantasy': ['dragon', 'magic', 'mystic', 'enchanted', 'arcane', 'elemental'],
  'horror': ['skull', 'death', 'dark', 'demon', 'cursed', 'doom', 'zombie'],
  'cultural': ['samurai', 'viking', 'aztec', 'ninja', 'shogun', 'spartan'],
  'luxury': ['gold', 'diamond', 'platinum', 'royal', 'obsidian', 'crystal'],
  'nature': ['forest', 'ocean', 'storm', 'lava', 'ice', 'leaf', 'aurora'],
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export class SkinIntelligence {

  // ── Step 1: Classify Skin Type ───────────────────────────────────────────
  classifySkinType(meta: NFTMetadata): SkinType {
    const explicitType = meta.attributes?.skin_type?.toLowerCase()
    if (explicitType === 'weapon' || explicitType === 'gun_skin') return 'gun_skin'
    if (explicitType === 'character' || explicitType === 'character_skin') return 'character_skin'
    if (explicitType === 'accessory') return 'accessory'

    const name = (meta.name || '').toLowerCase()
    const weapon = (meta.attributes?.weapon || '').toLowerCase()
    const category = (meta.attributes?.category || '').toLowerCase()
    const allText = `${name} ${weapon} ${category} ${meta.description || ''}`

    // Check weapon patterns first
    for (const pattern of Object.keys(WEAPON_PATTERNS)) {
      if (allText.includes(pattern)) return 'gun_skin'
    }

    // Check character keywords
    for (const kw of CHARACTER_KEYWORDS) {
      if (allText.includes(kw)) return 'character_skin'
    }

    // Check accessory keywords
    for (const kw of ACCESSORY_KEYWORDS) {
      if (allText.includes(kw)) return 'accessory'
    }

    // Default: if has weapon attribute → gun_skin, else character
    if (weapon) return 'gun_skin'
    return 'character_skin'
  }

  // ── Step 2: Detect Weapon Class ──────────────────────────────────────────
  detectWeaponClass(meta: NFTMetadata): { class: WeaponClass; category: string } {
    const name = (meta.name || '').toLowerCase()
    const weapon = (meta.attributes?.weapon || '').toLowerCase()
    const search = `${name} ${weapon}`

    // Direct weapon match
    for (const [pattern, info] of Object.entries(WEAPON_PATTERNS)) {
      if (search.includes(pattern)) return info
    }

    return { class: 'Unknown', category: 'Universal Weapon Skin' }
  }

  // ── Step 3: Detect Effects ───────────────────────────────────────────────
  detectEffects(meta: NFTMetadata): { effects: string[]; visuals: string[]; scoreBonus: number } {
    const allText = `${meta.name} ${meta.attributes?.effect || ''} ${meta.attributes?.style || ''} ${meta.description || ''}`.toLowerCase()
    const effects: string[] = []
    const visuals: string[] = []
    let scoreBonus = 0

    for (const [keyword, data] of Object.entries(EFFECT_MAP)) {
      if (allText.includes(keyword)) {
        effects.push(keyword)
        visuals.push(data.visual)
        scoreBonus = Math.max(scoreBonus, data.score_bonus)
      }
    }

    return { effects, visuals, scoreBonus }
  }

  // ── Step 4: Detect Style Theme ───────────────────────────────────────────
  detectStyle(meta: NFTMetadata): string {
    const allText = `${meta.name} ${meta.attributes?.style || ''} ${meta.description || ''}`.toLowerCase()

    for (const [theme, keywords] of Object.entries(STYLE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (allText.includes(keyword)) return theme
      }
    }

    return 'standard'
  }

  // ── Step 5: Compute Rarity Score (0–10) ──────────────────────────────────
  computeRarityScore(meta: NFTMetadata, effectBonus: number): number {
    const rarity = (meta.rarity || meta.attributes?.rarity || 'common').toLowerCase()
    let base = RARITY_BASE_SCORES[rarity] ?? 3.0

    // Effect bonus (capped at +2.5)
    base += Math.min(effectBonus, 2.5)

    // Style bonus
    const style = this.detectStyle(meta)
    if (style === 'luxury') base += 0.5
    else if (style === 'futuristic') base += 0.3
    else if (style === 'fantasy') base += 0.3

    // Name uniqueness factor (longer / more creative names score slightly higher)
    const nameLength = (meta.name || '').length
    if (nameLength > 15) base += 0.2
    if (nameLength > 25) base += 0.1

    return Math.round(Math.min(10, Math.max(0, base)) * 10) / 10
  }

  // ── Step 6: Suggest Price ────────────────────────────────────────────────
  suggestPrice(rarityScore: number, skinType: SkinType, rarity: string): number {
    const multiplier = RARITY_PRICE_MULTIPLIERS[rarity] ?? 5
    let basePrice = multiplier * 10

    // Type modifier
    if (skinType === 'gun_skin') basePrice *= 1.2
    else if (skinType === 'character_skin') basePrice *= 1.5
    else basePrice *= 0.6

    // Score modifier (exponential for premium items)
    const scoreMod = Math.pow(rarityScore / 5, 1.5)
    basePrice *= scoreMod

    // Add some noise for realism
    const noise = 0.9 + Math.random() * 0.2
    return Math.round(basePrice * noise)
  }

  // ── Step 7: Compute Confidence ───────────────────────────────────────────
  computeConfidence(meta: NFTMetadata, skinType: SkinType): number {
    let conf = 60 // base

    // Has explicit attributes → higher confidence
    if (meta.attributes?.weapon) conf += 10
    if (meta.attributes?.rarity) conf += 8
    if (meta.attributes?.effect) conf += 7
    if (meta.attributes?.style) conf += 5
    if (meta.name && meta.name.length > 5) conf += 5
    if (meta.image) conf += 5

    // Type clarity
    if (skinType === 'gun_skin' && meta.attributes?.weapon) conf += 5

    return Math.min(98, conf)
  }

  // ── Step 8: Generate Tags ────────────────────────────────────────────────
  generateTags(meta: NFTMetadata, skinType: SkinType, weaponClass: WeaponClass, effects: string[], style: string): string[] {
    const tags: string[] = []

    // Type tags
    if (skinType === 'gun_skin') tags.push('weapon_skin')
    else if (skinType === 'character_skin') tags.push('operator_skin')
    else tags.push('cosmetic')

    // Rarity
    const rarity = (meta.rarity || meta.attributes?.rarity || 'common').toLowerCase()
    tags.push(rarity)

    // Effects
    if (effects.length > 0) tags.push('animated')
    effects.forEach(e => tags.push(e))

    // Weapon
    if (weaponClass !== 'Unknown') tags.push(weaponClass.toLowerCase())

    // Game compatibility
    tags.push('fps')
    if (skinType === 'gun_skin') tags.push('battle_royale')
    if (style !== 'standard') tags.push(style)

    // De-dup
    return [...new Set(tags)]
  }

  // ── Step 9: Generate Visual Description ──────────────────────────────────
  generateVisualDescription(meta: NFTMetadata, visuals: string[], style: string): string {
    const parts: string[] = []

    if (style !== 'standard') parts.push(style)
    if (visuals.length > 0) parts.push(...visuals)
    else parts.push('static')

    parts.push('skin')

    return parts.join(' ')
  }

  // ── Step 10: Game Mapping ────────────────────────────────────────────────
  buildGameMapping(skinType: SkinType, weaponClass: WeaponClass, weaponCategory: string): GameMapping {
    if (skinType === 'character_skin') {
      return {
        game: 'Call of Duty',
        category: 'Operator Skin',
        weapon_class: 'Unknown' as WeaponClass,
        operator_type: 'Mil-Sim Operator',
        cosmetic_slot: 'Operator Bundle',
      }
    }

    if (skinType === 'accessory') {
      return {
        game: 'Call of Duty',
        category: 'Cosmetic Item',
        weapon_class: 'Unknown' as WeaponClass,
        cosmetic_slot: 'Customization',
      }
    }

    return {
      game: 'Call of Duty',
      category: weaponCategory,
      weapon_class: weaponClass,
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  🧠 MAIN ANALYSIS PIPELINE
  // ══════════════════════════════════════════════════════════════════════════

  analyze(meta: NFTMetadata): SkinAnalysis {
    // 1. Classify
    const skinType = this.classifySkinType(meta)

    // 2. Weapon detection
    const { class: weaponClass, category: weaponCategory } = this.detectWeaponClass(meta)

    // 3. Effects
    const { effects, visuals, scoreBonus } = this.detectEffects(meta)

    // 4. Style
    const style = this.detectStyle(meta)

    // 5. Rarity Score
    const rarityScore = this.computeRarityScore(meta, scoreBonus)

    // 6. Price
    const rarity = (meta.rarity || meta.attributes?.rarity || 'common').toLowerCase()
    const suggestedPrice = this.suggestPrice(rarityScore, skinType, rarity)

    // 7. Confidence
    const confidence = this.computeConfidence(meta, skinType)

    // 8. Tags
    const tags = this.generateTags(meta, skinType, weaponClass, effects, style)

    // 9. Visual description
    const visualStyle = this.generateVisualDescription(meta, visuals, style)

    // 10. Game mapping
    const gameMapping = this.buildGameMapping(skinType, weaponClass, weaponCategory)

    // 11. Human-readable description
    const description = this.generateDescription(meta, skinType, weaponClass, effects, style, rarityScore)

    return {
      type: skinType,
      game_mapping: gameMapping,
      rarity_score: rarityScore,
      visual_style: visualStyle,
      suggested_price: suggestedPrice,
      confidence,
      tags,
      effects,
      description,
    }
  }

  private generateDescription(
    meta: NFTMetadata, skinType: SkinType, weaponClass: WeaponClass,
    effects: string[], style: string, score: number
  ): string {
    const rarity = (meta.rarity || meta.attributes?.rarity || 'common')
    const lines: string[] = []

    if (skinType === 'gun_skin') {
      lines.push(`${rarity.toUpperCase()} ${weaponClass} weapon skin`)
    } else if (skinType === 'character_skin') {
      lines.push(`${rarity.toUpperCase()} operator skin`)
    } else {
      lines.push(`${rarity.toUpperCase()} cosmetic accessory`)
    }

    if (style !== 'standard') lines.push(`with ${style} theme`)
    if (effects.length > 0) lines.push(`featuring ${effects.join(', ')} effects`)
    lines.push(`— Rarity ${score}/10`)

    return lines.join(' ')
  }

  // ── Convenience: Analyze from simple SDK Asset format ────────────────────
  analyzeFromAsset(asset: { name: string; rarity: string; asa_id?: number; metadata?: { skin_name?: string, skin_type?: string } }): SkinAnalysis {
    const meta: NFTMetadata = {
      name: asset.name || asset.metadata?.skin_name || 'Unknown Skin',
      attributes: {
        rarity: asset.rarity,
        skin_type: asset.metadata?.skin_type,
      },
    }

    // Try to extract weapon from name
    const nameLower = meta.name.toLowerCase()
    for (const pattern of Object.keys(WEAPON_PATTERNS)) {
      if (nameLower.includes(pattern)) {
        meta.attributes!.weapon = pattern
        break
      }
    }

    // Try to detect style/effect from name
    for (const keyword of Object.keys(EFFECT_MAP)) {
      if (nameLower.includes(keyword)) {
        meta.attributes!.effect = keyword
        break
      }
    }

    return this.analyze(meta)
  }
}

// ─── Singleton for easy access ───────────────────────────────────────────────
export const skinIntelligence = new SkinIntelligence()
