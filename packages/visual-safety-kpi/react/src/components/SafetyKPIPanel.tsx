// Safety KPI Dashboard - React Component
// Displays safety metrics with status indicators and sparklines

import { SafetyKPI, KPI_STATUS_COLOURS, APPILICO_COLOURS } from '@appilico/shared-types'
import { ChartSkeleton, EmptyState, TrendIndicator, MiniSparkline, StatusBadge } from '@appilico/shared-ui'

// ── Props Interface ──────────────────────────────────────────────────────────

export interface SafetyKPIPanelProps {
  /** Array of safety KPIs to display */
  kpis: SafetyKPI[]
  /** Number of columns in the grid */
  columns?: number
  /** Whether to show sparkline charts */
  showSparkline?: boolean
  /** Whether data is loading */
  isLoading?: boolean
  /** Callback when a KPI card is clicked */
  onKPIClick?: (kpi: SafetyKPI) => void
  /** Additional CSS classes */
  className?: string
}

// ── KPI Card Component ───────────────────────────────────────────────────────

interface KPICardProps {
  kpi: SafetyKPI
  showSparkline: boolean
  onClick?: () => void
}

function KPICard({ kpi, showSparkline, onClick }: KPICardProps) {
  const statusColour = KPI_STATUS_COLOURS[kpi.status]
  
  // For trend: determine if direction is positive based on isLowerBetter
  const isTrendPositive = kpi.isLowerBetter
    ? kpi.trendDirection === 'down'
    : kpi.trendDirection === 'up'

  const sparklineColour = kpi.status === 'good' 
    ? APPILICO_COLOURS.green 
    : kpi.status === 'bad' 
      ? APPILICO_COLOURS.red 
      : APPILICO_COLOURS.amber

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden"
      onClick={onClick}
      style={{ borderLeftWidth: 4, borderLeftColor: statusColour }}
    >
      {/* Leading/Lagging badge */}
      <div className="absolute top-2 right-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            kpi.isLeading
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {kpi.isLeading ? 'LEADING' : 'LAGGING'}
        </span>
      </div>

      {/* KPI Name */}
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 pr-16">
        {kpi.displayName}
      </p>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <span
          className="text-3xl font-bold"
          style={{ color: statusColour }}
        >
          {typeof kpi.currentValue === 'number' && kpi.currentValue % 1 !== 0
            ? kpi.currentValue.toFixed(1)
            : kpi.currentValue}
        </span>
        {kpi.unit && (
          <span className="text-sm text-gray-400">{kpi.unit}</span>
        )}
      </div>

      {/* Trend Indicator */}
      <div className="mt-2 flex items-center gap-2">
        <TrendIndicator
          direction={kpi.trendDirection}
          percent={kpi.trendPercent}
          isPositive={isTrendPositive}
        />
        {kpi.previousValue !== undefined && (
          <span className="text-xs text-gray-400">
            vs {kpi.previousValue} prev
          </span>
        )}
      </div>

      {/* Target */}
      {kpi.targetValue !== undefined && (
        <p className="mt-2 text-xs text-gray-500">
          Target: <span className="font-medium">{kpi.targetValue} {kpi.unit}</span>
        </p>
      )}

      {/* Sparkline */}
      {showSparkline && kpi.trendHistory.length >= 2 && (
        <div className="mt-3 -mx-1">
          <MiniSparkline
            data={kpi.trendHistory.map(p => p.value)}
            colour={sparklineColour}
            height={40}
          />
        </div>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function SafetyKPIPanel({
  kpis,
  columns = 2,
  showSparkline = true,
  isLoading = false,
  onKPIClick,
  className,
}: SafetyKPIPanelProps) {
  if (isLoading) {
    return <ChartSkeleton width="100%" height={400} type="cards" />
  }

  if (!kpis.length) {
    return <EmptyState title="No safety data" description="Select a site to view safety KPIs" />
  }

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns] || 'grid-cols-2'

  return (
    <div className={className}>
      {/* Summary header */}
      <div className="flex gap-4 mb-4">
        {(['good', 'warning', 'bad'] as const).map(status => {
          const count = kpis.filter(k => k.status === status).length
          if (count === 0) return null
          return (
            <StatusBadge key={status} status={status} label={`${count} ${status}`} />
          )
        })}
      </div>

      {/* KPI Grid */}
      <div className={`grid ${gridCols} gap-4`}>
        {kpis.map(kpi => (
          <KPICard
            key={kpi.id}
            kpi={kpi}
            showSparkline={showSparkline}
            onClick={() => onKPIClick?.(kpi)}
          />
        ))}
      </div>
    </div>
  )
}

export default SafetyKPIPanel
