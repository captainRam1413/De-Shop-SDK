import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const plugins = await db.plugin.findMany({
      orderBy: { downloads: 'desc' },
    })
    return NextResponse.json(plugins)
  } catch (error) {
    console.error('Error fetching plugins:', error)
    return NextResponse.json({ error: 'Failed to fetch plugins' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const plugin = await db.plugin.create({ data: body })
    return NextResponse.json(plugin, { status: 201 })
  } catch (error) {
    console.error('Error creating plugin:', error)
    return NextResponse.json({ error: 'Failed to create plugin' }, { status: 500 })
  }
}
