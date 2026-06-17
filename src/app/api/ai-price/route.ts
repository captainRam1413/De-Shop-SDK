import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

/* ===== AI NFT Pricing Oracle =====
 * POST /api/ai-price
 * Body: { name, rarity, type, description }
 * Returns: { price, confidence, reasoning, trend, source }
 *
 * Uses z-ai-web-dev-sdk LLM (server-side only).
 * Falls back to a heuristic price if the LLM call fails or returns invalid JSON.
 */

interface AIPriceResponse {
  price: number
  confidence: number
  reasoning: string
  trend: 'up' | 'down' | 'stable'
  source: 'ai' | 'heuristic'
}

const RARITY_RANGES: Record<string, [number, number]> = {
  common: [0.5, 5],
  rare: [5, 15],
  epic: [15, 35],
  legendary: [35, 60],
}

function heuristicPrice(
  rarity: string,
  type: string,
  name: string,
  description: string
): AIPriceResponse {
  const r = (rarity || 'common').toLowerCase()
  const range = RARITY_RANGES[r] || RARITY_RANGES.common
  const base = (range[0] + range[1]) / 2
  // tiny deterministic seed based on name length
  const seed = (name.length * 7 + description.length * 3 + type.length * 5) % 100
  const variance = (seed / 100) * (range[1] - range[0]) * 0.6
  const price = Math.round((base - (range[1] - range[0]) * 0.3 + variance) * 100) / 100
  const trend: AIPriceResponse['trend'] = seed % 3 === 0 ? 'up' : seed % 3 === 1 ? 'down' : 'stable'
  return {
    price: Math.max(range[0], Math.min(range[1], price)),
    confidence: 60 + (seed % 25),
    reasoning: `Heuristic estimate: ${r} ${type} falls within typical range ${range[0]}-${range[1]} ALGO. Adjusted by name length and description complexity.`,
    trend,
    source: 'heuristic',
  }
}

function safeParseJSON(text: string): AIPriceResponse | null {
  // Strip markdown code fences if present
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
  }
  // Try direct parse first
  try {
    return JSON.parse(cleaned) as AIPriceResponse
  } catch {
    // fall through
  }
  // Try to extract first {...} block
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      return JSON.parse(match[0]) as AIPriceResponse
    } catch {
      // fall through
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  let body: { name?: string; rarity?: string; type?: string; description?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, rarity, type, description } = body

  if (!name || !rarity || !type) {
    return NextResponse.json(
      { error: 'Missing required fields: name, rarity, type' },
      { status: 400 }
    )
  }

  try {
    const zai = await ZAI.create()
    const response = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You are an NFT pricing oracle for a blockchain game marketplace on Algorand. Respond ONLY with valid JSON, no markdown fences, no commentary.',
        },
        {
          role: 'user',
          content: `Suggest a price in ALGO for this NFT:
Name: ${name}
Rarity: ${rarity} (common=0.5-5, rare=5-15, epic=15-35, legendary=35-60)
Type: ${type}
Description: ${description || 'No description'}

Return JSON exactly in this shape:
{"price": number, "confidence": number (0-100), "reasoning": "short string under 200 chars", "trend": "up|down|stable"}`,
        },
      ],
      temperature: 0.7,
    })

    const content: string =
      response?.choices?.[0]?.message?.content ??
      response?.message?.content ??
      (typeof response === 'string' ? response : '') ??
      ''

    const parsed = safeParseJSON(content)

    if (parsed && typeof parsed.price === 'number' && !Number.isNaN(parsed.price)) {
      const r = (rarity || 'common').toLowerCase()
      const range = RARITY_RANGES[r] || RARITY_RANGES.common
      const clampedPrice = Math.max(
        range[0] * 0.5,
        Math.min(range[1] * 1.5, parsed.price)
      )
      const trend: AIPriceResponse['trend'] =
        parsed.trend === 'up' || parsed.trend === 'down' || parsed.trend === 'stable'
          ? parsed.trend
          : 'stable'
      const confidence =
        typeof parsed.confidence === 'number'
          ? Math.max(0, Math.min(100, parsed.confidence))
          : 70
      return NextResponse.json({
        price: Math.round(clampedPrice * 100) / 100,
        confidence: Math.round(confidence),
        reasoning: parsed.reasoning || 'AI-generated estimate based on rarity and type.',
        trend,
        source: 'ai',
      } satisfies AIPriceResponse)
    }

    // Fallback to heuristic if parsing failed
    const fallback = heuristicPrice(rarity, type, name, description || '')
    return NextResponse.json({ ...fallback, note: 'AI response unparseable, used heuristic' })
  } catch (error) {
    console.error('AI pricing error:', error)
    const fallback = heuristicPrice(rarity, type, name, description || '')
    return NextResponse.json({
      ...fallback,
      note: 'AI service unavailable, used heuristic',
    })
  }
}
