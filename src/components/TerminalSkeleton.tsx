'use client'

import React from 'react'
import { cn } from '@/lib/utils'

/* ===== TRAFFIC LIGHT DOTS (for skeleton card headers) ===== */

function SkeletonTrafficLights() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      <span className="w-3 h-3 rounded-full bg-[#3a3a3a]" />
      <span className="w-3 h-3 rounded-full bg-[#3a3a3a]" />
      <span className="w-3 h-3 rounded-full bg-[#3a3a3a]" />
    </div>
  )
}

/* ===== SKELETON CARD (terminal-card shaped) ===== */

interface SkeletonCardProps {
  className?: string
  title?: string
  bodyHeight?: number | string
}

export function SkeletonCard({ className, title = 'loading.log', bodyHeight = 140 }: SkeletonCardProps) {
  return (
    <div className={cn('skeleton-card', className)}>
      <div className="skeleton-card-header flex items-center">
        <SkeletonTrafficLights />
        <span className="ml-2 text-[10px] font-terminal text-[#444444]">{title}</span>
      </div>
      <div className="skeleton-card-body" style={{ minHeight: typeof bodyHeight === 'number' ? bodyHeight : undefined, height: typeof bodyHeight === 'string' ? bodyHeight : undefined }}>
        <span className="skeleton-line" style={{ width: '60%' }} />
        <span className="skeleton-line" style={{ width: '90%' }} />
        <span className="skeleton-line" style={{ width: '75%' }} />
      </div>
    </div>
  )
}

/* ===== SKELETON LINE ===== */

interface SkeletonLineProps {
  width?: string | number
  className?: string
  height?: number | string
}

export function SkeletonLine({ width = '100%', className, height = 10 }: SkeletonLineProps) {
  return (
    <span
      className={cn('skeleton-line', className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  )
}

/* ===== SKELETON LIST (multiple stacked lines) ===== */

interface SkeletonListProps {
  rows?: number
  className?: string
  lineHeight?: number
}

export function SkeletonList({ rows = 4, className, lineHeight = 12 }: SkeletonListProps) {
  const widths = ['100%', '92%', '78%', '88%', '60%', '95%', '70%']
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine
          key={i}
          height={lineHeight}
          width={widths[i % widths.length]}
        />
      ))}
    </div>
  )
}

/* ===== SKELETON CHART (chart-shaped placeholder) ===== */

interface SkeletonChartProps {
  className?: string
  height?: number
  title?: string
}

export function SkeletonChart({ className, height = 220, title = 'chart_loading.log' }: SkeletonChartProps) {
  return (
    <div className={cn('skeleton-card', className)}>
      <div className="skeleton-card-header flex items-center">
        <SkeletonTrafficLights />
        <span className="ml-2 text-[10px] font-terminal text-[#444444]">{title}</span>
      </div>
      <div className="p-4 bg-[#1E1E1E]">
        <div className="flex items-center justify-between mb-3">
          <span className="skeleton-line" style={{ width: '40%', height: 8 }} />
          <span className="skeleton-line" style={{ width: '15%', height: 8 }} />
        </div>
        <div className="skeleton-block" style={{ height }} />
        <div className="flex justify-between mt-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <span key={d} className="skeleton-line" style={{ width: 24, height: 8 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ===== SKELETON STAT CARD (for dashboard stats grid) ===== */

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn('skeleton-card', className)}>
      <div className="skeleton-card-header flex items-center">
        <SkeletonTrafficLights />
        <span className="ml-2 text-[10px] font-terminal text-[#444444]">stat_loading.log</span>
      </div>
      <div className="skeleton-card-body">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <span className="skeleton-line" style={{ width: '60%', height: 8 }} />
            <span className="skeleton-line" style={{ width: '50%', height: 22 }} />
            <span className="skeleton-line" style={{ width: '40%', height: 10 }} />
          </div>
          <div className="w-8 h-8 rounded-sm bg-[#1E1E1E] border border-[#444444] flex-shrink-0" />
        </div>
      </div>
    </div>
  )
}

/* ===== SKELETON ACTIVITY ROW (for feed lists) ===== */

export function SkeletonActivityRow() {
  return (
    <div className="flex items-center gap-2 py-1 px-1.5">
      <span className="skeleton-line" style={{ width: 60, height: 10 }} />
      <span className="skeleton-line" style={{ width: 50, height: 14 }} />
      <span className="skeleton-line flex-1" style={{ height: 10 }} />
      <span className="skeleton-line" style={{ width: 70, height: 10 }} />
    </div>
  )
}

/* ===== DEFAULT EXPORT (compound component) ===== */

export default Object.assign(SkeletonCard, {
  Card: SkeletonCard,
  Line: SkeletonLine,
  List: SkeletonList,
  Chart: SkeletonChart,
  StatCard: SkeletonStatCard,
  ActivityRow: SkeletonActivityRow,
})
