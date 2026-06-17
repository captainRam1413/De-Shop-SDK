import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [totalAssets, totalTransactions, listedAssets, legendaryCount, epicCount, rareCount, commonCount] =
      await Promise.all([
        db.asset.count(),
        db.transaction.count(),
        db.asset.count({ where: { listed: true } }),
        db.asset.count({ where: { rarity: 'legendary' } }),
        db.asset.count({ where: { rarity: 'epic' } }),
        db.asset.count({ where: { rarity: 'rare' } }),
        db.asset.count({ where: { rarity: 'common' } }),
      ])

    const totalValue = await db.asset.aggregate({ _sum: { price: true } })

    return NextResponse.json({
      totalAssets,
      totalTransactions,
      listedAssets,
      totalValueLocked: totalValue._sum.price ?? 0,
      activeWallets: 1847,
      gasFees: 0.003,
      crossChainVolume: 890000,
      rarityDistribution: {
        common: commonCount,
        rare: rareCount,
        epic: epicCount,
        legendary: legendaryCount,
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
