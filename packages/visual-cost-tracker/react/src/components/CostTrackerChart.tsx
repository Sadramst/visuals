// Cost Tracker Chart - React Component
// Combo chart with budget vs actual, anomaly detection, and category breakdown

import { useState, useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { CostDataPoint, COST_CATEGORY_COLOURS, APPILICO_COLOURS } from '@appilico/shared-types'
import { ChartSkeleton, EmptyState } from '@appilico/shared-ui'

// ── Props Interface ──────────────────────────────────────────────────────────

export interface CostTrackerChartProps {
  /** Array of cost data points */
  data: CostDataPoint[]
  /** Chart height in pixels */
  height?: number
  /** Whether to show anomaly markers */
  showAnomalies?: boolean
  /** Whether to show cumulative budget line */
  showCumulative?: boolean
  /** Whether to show category breakdown on click */
  showCategoryBreakdown?: boolean
  /** Anomaly threshold as percentage */
  anomalyThreshold?: number
  /** Whether data is loading */
  isLoading?: boolean
  /** Callback when month is clicked */
  onMonthClick?: (point: CostDataPoint) => void
  /** Additional CSS classes */
  className?: string
}

// ── Helper Functions ─────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function isAnomaly(point: CostDataPoint, threshold: number): boolean {
  if (!point.budgetAmount) return false
  const variance = ((point.actualAmount - point.budgetAmount) / point.budgetAmount) * 100
  return Math.abs(variance) > threshold
}

function getBarColour(point: CostDataPoint, threshold: number): string {
  if (!point.budgetAmount) return APPILICO_COLOURS.blue
  const variance = ((point.actualAmount - point.budgetAmount) / point.budgetAmount) * 100
  if (variance > threshold) return APPILICO_COLOURS.red
  if (variance < -threshold) return APPILICO_COLOURS.green
  return APPILICO_COLOURS.blue
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

interface CostTooltipProps {
  active?: boolean
  payload?: Array<{ payload: CostDataPoint }>
}

function CostTooltip({ active, payload }: CostTooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload

  const variance = point.budgetAmount
    ? ((point.actualAmount - point.budgetAmount) / point.budgetAmount) * 100
    : undefined

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-2">{point.month}</p>
      <div className="space-y-1">
        <p className="flex justify-between gap-4">
          <span>Actual:</span>
          <span className="font-medium">{formatCurrency(point.actualAmount)}</span>
        </p>
        {point.budgetAmount !== undefined && (
          <p className="flex justify-between gap-4">
            <span>Budget:</span>
            <span className="font-medium">{formatCurrency(point.budgetAmount)}</span>
          </p>
        )}
        {variance !== undefined && (
          <p className="flex justify-between gap-4">
            <span>Variance:</span>
            <span className={`font-medium ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
            </span>
          </p>
        )}
        {point.costPerTonne !== undefined && (
          <p className="flex justify-between gap-4 mt-2 pt-2 border-t border-gray-100">
            <span>$/tonne:</span>
            <span className="font-medium">${point.costPerTonne.toFixed(2)}</span>
          </p>
        )}
      </div>
    </div>
  )
}

// ── Category Breakdown Component ─────────────────────────────────────────────

interface CategoryBreakdownProps {
  point: CostDataPoint
}

function CategoryBreakdown({ point }: CategoryBreakdownProps) {
  if (!point.categories?.length) return null

  return (
    <div className="mt-4 bg-gray-50 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">
        Category Breakdown - {point.month}
      </h4>
      <div className="space-y-2">
        {point.categories.map(cat => {
          const pct = (cat.amount / point.actualAmount) * 100
          const colour = COST_CATEGORY_COLOURS[cat.name] || APPILICO_COLOURS.grey
          return (
            <div key={cat.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: colour }}
              />
              <span className="text-sm text-gray-700 flex-1">{cat.name}</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(cat.amount)}
              </span>
              <span className="text-xs text-gray-500 w-12 text-right">
                {pct.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Summary Card Component ───────────────────────────────────────────────────

interface SummaryCardsProps {
  data: CostDataPoint[]
}

function SummaryCards({ data }: SummaryCardsProps) {
  const totalActual = data.reduce((sum, p) => sum + p.actualAmount, 0)
  const totalBudget = data.reduce((sum, p) => sum + (p.budgetAmount || 0), 0)
  const variance = totalBudget ? ((totalActual - totalBudget) / totalBudget) * 100 : 0
  const avgCostPerTonne = data.reduce((sum, p) => sum + (p.costPerTonne || 0), 0) / data.length

  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <p className="text-xs text-gray-500 uppercase">Total Spend</p>
        <p className="text-lg font-semibold" style={{ color: APPILICO_COLOURS.navy }}>
          {formatCurrency(totalActual)}
        </p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <p className="text-xs text-gray-500 uppercase">Budget</p>
        <p className="text-lg font-semibold text-gray-700">
          {formatCurrency(totalBudget)}
        </p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <p className="text-xs text-gray-500 uppercase">Variance</p>
        <p className={`text-lg font-semibold ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
        </p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <p className="text-xs text-gray-500 uppercase">Avg $/tonne</p>
        <p className="text-lg font-semibold text-gray-700">
          ${avgCostPerTonne.toFixed(2)}
        </p>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function CostTrackerChart({
  data,
  height = 400,
  showAnomalies = true,
  showCumulative = true,
  showCategoryBreakdown = true,
  anomalyThreshold = 15,
  isLoading = false,
  onMonthClick,
  className,
}: CostTrackerChartProps) {
  const [selectedMonth, setSelectedMonth] = useState<CostDataPoint | null>(null)

  // Add cumulative data
  const chartData = useMemo(() => {
    let cumActual = 0
    let cumBudget = 0
    return data.map(point => {
      cumActual += point.actualAmount
      cumBudget += point.budgetAmount || 0
      return {
        ...point,
        cumulativeActual: cumActual,
        cumulativeBudget: cumBudget,
      }
    })
  }, [data])

  if (isLoading) {
    return <ChartSkeleton width="100%" height={height} type="combo" />
  }

  if (!data.length) {
    return <EmptyState title="No cost data" description="Select a site to view cost data" />
  }

  const handleBarClick = (index: number) => {
    const point = chartData[index]
    setSelectedMonth(prev => (prev?.month === point.month ? null : point))
    onMonthClick?.(point)
  }

  // Y axis domain
  const maxActual = Math.max(...chartData.map(p => p.actualAmount))
  const maxBudget = Math.max(...chartData.map(p => p.budgetAmount || 0))
  const yMax = Math.max(maxActual, maxBudget) * 1.1

  return (
    <div className={className}>
      <SummaryCards data={data} />

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 60, bottom: 20, left: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            tickLine={{ stroke: '#E5E5E5' }}
            axisLine={{ stroke: '#E5E5E5' }}
          />
          <YAxis
            yAxisId="left"
            domain={[0, yMax]}
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11 }}
            tickLine={{ stroke: '#E5E5E5' }}
            axisLine={{ stroke: '#E5E5E5' }}
          />
          {showCumulative && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11, fill: '#999' }}
              tickLine={{ stroke: '#E5E5E5' }}
              axisLine={{ stroke: '#E5E5E5' }}
            />
          )}
          <Tooltip content={<CostTooltip />} />
          <Legend wrapperStyle={{ paddingTop: 10 }} />

          {/* Actual spend bars */}
          <Bar
            yAxisId="left"
            dataKey="actualAmount"
            name="Actual"
            radius={[4, 4, 0, 0]}
            onClick={(_, index) => handleBarClick(index)}
          >
            {chartData.map((point) => (
              <Cell
                key={point.month}
                fill={getBarColour(point, anomalyThreshold)}
                cursor="pointer"
                opacity={selectedMonth && selectedMonth.month !== point.month ? 0.4 : 1}
              />
            ))}
          </Bar>

          {/* Budget line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="budgetAmount"
            name="Budget"
            stroke={APPILICO_COLOURS.amber}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 4, fill: APPILICO_COLOURS.amber }}
          />

          {/* Cumulative lines */}
          {showCumulative && (
            <>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeActual"
                name="Cumulative Actual"
                stroke={APPILICO_COLOURS.navy}
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeBudget"
                name="Cumulative Budget"
                stroke={APPILICO_COLOURS.grey}
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
            </>
          )}

          {/* Anomaly markers */}
          {showAnomalies && chartData.filter(p => isAnomaly(p, anomalyThreshold)).map(point => (
            <ReferenceLine
              key={`anomaly-${point.month}`}
              x={point.month}
              stroke={APPILICO_COLOURS.red}
              strokeDasharray="2 2"
              label={{ value: '!', fill: APPILICO_COLOURS.red, fontSize: 14 }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Category Breakdown */}
      {showCategoryBreakdown && selectedMonth && (
        <CategoryBreakdown point={selectedMonth} />
      )}
    </div>
  )
}

export default CostTrackerChart
