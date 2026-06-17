import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

/* ===== AI NFT Artwork Generator =====
 * POST /api/ai-artwork
 * Body: { name, rarity, type, description, assetId }
 * Returns: { url, source: 'ai' | 'placeholder', prompt }
 *
 * Uses z-ai-web-dev-sdk image generation (server-side only).
 * Saves generated image to /public/nft-artwork/{assetId}.png
 * Falls back to placehold.co if image generation fails.
 */

const ACCENT_BY_RARITY: Record<string, string> = {
  common: 'gray',
  rare: 'cyan',
  epic: 'magenta',
  legendary: 'amber',
}

function safeSlug(input: string, maxLen = 40): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, maxLen) || 'asset'
  )
}

function buildPrompt(
  name: string,
  rarity: string,
  type: string,
  description: string
): string {
  const accent = ACCENT_BY_RARITY[(rarity || '').toLowerCase()] || 'gray'
  return `Pixel art style NFT artwork for a ${rarity} ${type} called "${name}". ${description}. Dark background, glowing ${accent} accents, retro game aesthetic, square composition, highly detailed, centered, no text, no watermark.`
}

function placeholderUrl(name: string, rarity: string): string {
  const accent = ACCENT_BY_RARITY[(rarity || '').toLowerCase()] || 'gray'
  const colorMap: Record<string, string> = {
    gray: '888888',
    cyan: '00D4FF',
    magenta: 'FF00FF',
    amber: 'FFB800',
  }
  const bg = '1E1E1E'
  const fg = colorMap[accent] || '33FF33'
  const label = encodeURIComponent((name || 'NFT').slice(0, 20))
  return `https://placehold.co/512x512/${bg}/${fg}?text=${label}&font=monospace`
}

export async function POST(request: NextRequest) {
  let body: {
    name?: string
    rarity?: string
    type?: string
    description?: string
    assetId?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, rarity, type, description } = body
  const assetId = body.assetId ? safeSlug(body.assetId) : safeSlug(name || 'asset') + '-' + Date.now()

  if (!name || !rarity || !type) {
    return NextResponse.json(
      { error: 'Missing required fields: name, rarity, type' },
      { status: 400 }
    )
  }

  const prompt = buildPrompt(name, rarity, type, description || '')

  // Ensure output directory exists
  const outDir = path.join(process.cwd(), 'public', 'nft-artwork')
  try {
    await mkdir(outDir, { recursive: true })
  } catch {
    // dir may already exist
  }

  try {
    const zai = await ZAI.create()
    const result = await zai.images.generations.create({
      model: 'cogview-3-plus',
      prompt,
      size: '1024x1024',
    })

    const base64: string | undefined = result?.data?.[0]?.base64
    if (!base64) {
      throw new Error('No image data in response')
    }

    const buffer = Buffer.from(base64, 'base64')
    const filePath = path.join(outDir, `${assetId}.png`)
    await writeFile(filePath, buffer)

    return NextResponse.json({
      url: `/nft-artwork/${assetId}.png`,
      source: 'ai',
      prompt,
    })
  } catch (error) {
    console.error('AI artwork generation error:', error)
    // Fall back to placeholder
    return NextResponse.json({
      url: placeholderUrl(name, rarity),
      source: 'placeholder',
      prompt,
      note: 'AI image generation unavailable, using placeholder',
    })
  }
}
