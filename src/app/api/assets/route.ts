import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rarity = searchParams.get('rarity')
    const listed = searchParams.get('listed')
    const owner = searchParams.get('owner')

    const where: Record<string, unknown> = {}
    if (rarity) where.rarity = rarity
    if (listed !== null) where.listed = listed === 'true'
    if (owner) where.owner = owner

    const assets = await db.asset.findMany({
      where,
      orderBy: { mintedAt: 'desc' },
    })
    return NextResponse.json(assets)
  } catch (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, rarity, type, price, emoji, seller, owner } = body

    // Get the next assetId
    const maxAsset = await db.asset.findFirst({ orderBy: { assetId: 'desc' } })
    const assetId = (maxAsset?.assetId ?? 0) + 1

    const asset = await db.asset.create({
      data: {
        assetId,
        name: name || 'Unnamed Asset',
        description: description || '',
        rarity: rarity || 'common',
        type: type || 'weapon',
        price: price || 0,
        confidence: Math.round((60 + Math.random() * 38) * 100) / 100,
        emoji: emoji || '📦',
        seller: seller || '',
        owner: owner || '',
        listed: false,
      },
    })
    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error('Error creating asset:', error)
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 })
  }
}
