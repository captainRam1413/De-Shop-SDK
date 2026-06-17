import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rarity = searchParams.get('rarity')
    const sort = searchParams.get('sort')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { listed: true }
    if (rarity && rarity !== 'all') where.rarity = rarity
    if (search) where.name = { contains: search }

    let orderBy: Record<string, string> = { mintedAt: 'desc' }
    if (sort === 'price_asc') orderBy = { price: 'asc' }
    else if (sort === 'price_desc') orderBy = { price: 'desc' }
    else if (sort === 'newest') orderBy = { mintedAt: 'desc' }
    else if (sort === 'rarity') orderBy = { rarity: 'desc' }

    const [assets, total] = await Promise.all([
      db.asset.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.asset.count({ where }),
    ])

    return NextResponse.json({ assets, total, page, limit })
  } catch (error) {
    console.error('Error fetching market:', error)
    return NextResponse.json({ error: 'Failed to fetch market' }, { status: 500 })
  }
}
