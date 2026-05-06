// Ore Grade Waterfall Chart - React Component
// Visualises grade changes through processing stages

import { useState } from 'react'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import { GradeStage, APPILICO_COLOURS } from '@appilico/shared-types'
import { ChartSkeleton, EmptyState } from '@appilico/shared-ui'

// ── Props Interface ──────────────────────────────────────────────────────────

export interface OreGradeWaterfallChartProps {
  /** Array of grade stages to display */
  data: GradeStage[]
  /** Chart height in pixels */
  height?: number
  /** Unit for grade display */
  unit?: string
  /** Whether to show target markers */
  showTarget?: boolean
  /** Whether to show variance labels */
  showVariance?: boolean
  /** Whether to show recovery calculation */
  showRecovery?: boolean
  /** Whether data is loading */
  isLoading?: boolean
  /** Callback when stage is clicked */
  onStageClick?: (stage: GradeStage) => void
  /** Additional CSS classes */
  className?: string
}

// ── Helper Functions ─────────────────────────────────────────────────────────

function getBarColour(stage: GradeStage): string {
  if (stage.targetGrade === undefined) return APPILICO_COLOURS.navy
  return stage.actualGrade >= stage.targetGrade
    ? APPILICO_COLOURS.blue
    : APPILICO_COLOURS.red
}

function calculateRecovery(stages: GradeStage[]): number | undefined {
  if (stages.length < 2) return undefined
  const first = stages[0]
  const last = stages[stages.length - 1]
  return ((last.actualGrade / first.actualGrade) - 1) * 100
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

interface WaterfallTooltipProps {
  active?: boolean
  payload?: Array<{ payload: GradeStage }>
  unit: string
}

function WaterfallTooltip({ active, payload, unit }: WaterfallTooltipProps) {
  if (!active || !payload?.length) return null
  const stage = payload[0].payload

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-2">{stage.name}</p>
      <div className="space-y-1">
        <p>
          Actual: <span className="font-medium">{stage.actualGrade.toFixed(2)}{unit}</span>
        </p>
        {stage.targetGrade !== undefined && (
          <p>
            Target: <span className="font-medium">{stage.targetGrade.toFixed(2)}{unit}</span>
          </p>
        )}
        {stage.variance !== undefined && (
          <p>
            Variance:{' '}
            <span className={`font-medium ${stage.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stage.variance >= 0 ? '+' : ''}{stage.variance.toFixed(2)}%
            </span>
          </p>
        )}
        {stage.deltaFromPrevious !== undefined && (
          <p>
            Change: <span className="font-medium">
              {stage.deltaFromPrevious >= 0 ? '+' : ''}{stage.deltaFromPrevious.toFixed(2)}{unit}
            </span>
          </p>
        )}
        {stage.material && (
          <p>Material: <span className="font-medium">{stage.material}</span></p>
        )}
      </div>
    </div>
  )
}

// ── Recovery Summary Component ───────────────────────────────────────────────

interface RecoverySummaryProps {
  recovery: number
  unit: string
}

function RecoverySummary({ recovery, unit }: RecoverySummaryProps) {
  const isUpgrading = recovery > 0
  const colour = isUpgrading
    ? APPILICO_COLOURS.green
    : recovery < -2
      ? APPILICO_COLOURS.red
      : APPILICO_COLOURS.amber

  return (
    <div className="mt-4 bg-gray-50 rounded-lg p-3 flex items-center justify-between">
      <span className="text-sm text-gray-600">
        {unit} Recovery:
      </span>
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold" style={{ color: colour }}>
          {recovery >= 0 ? '+' : ''}{recovery.toFixed(1)}%
        </span>
        <span className="text-xs text-gray-500">
          ({isUpgrading ? 'Upgrading' : 'Grade loss'})
        </span>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function OreGradeWaterfallChart({
  data,
  height = 400,
  unit = 'Fe%',
  showTarget = true,
  showVariance = true,
  showRecovery = true,
  isLoading = false,
  onStageClick,
  className,
}: OreGradeWaterfallChartProps) {
  const [selectedStage, setSelectedStage] = useState<GradeStage | null>(null)

  if (isLoading) {
    return <ChartSkeleton width="100%" height={height} type="bars" />
  }

  if (!data.length) {
    return <EmptyState title="No grade data" description="Select a site to view grade stages" />
  }

  // Sort by order
  const sortedData = [...data].sort((a, b) => a.order - b.order)

  // Calculate Y domain (tight around data range)
  const allGrades = sortedData.flatMap(s => [s.actualGrade, s.targetGrade].filter((v): v is number => v !== undefined))
  const minGrade = Math.min(...allGrades)
  const maxGrade = Math.max(...allGrades)
  const yMin = minGrade * 0.97
  const yMax = maxGrade * 1.03

  const recovery = showRecovery ? calculateRecovery(sortedData) : undefined

  const handleBarClick = (stage: GradeStage) => {
    setSelectedStage(prev => (prev?.id === stage.id ? null : stage))
    onStageClick?.(stage)
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={sortedData}
          margin={{ top: 30, right: 20, bottom: 20, left: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            tickLine={{ stroke: '#E5E5E5' }}
            axisLine={{ stroke: '#E5E5E5' }}
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={v => `${v.toFixed(1)}%`}
            tick={{ fontSize: 11 }}
            tickLine={{ stroke: '#E5E5E5' }}
            axisLine={{ stroke: '#E5E5E5' }}
            label={{
              value: unit,
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#666' },
            }}
          />
          <Tooltip content={<WaterfallTooltip unit={unit} />} />

          {/* Target reference lines */}
          {showTarget && sortedData.filter(s => s.targetGrade).map(stage => (
            <ReferenceLine
              key={`target-${stage.id}`}
              y={stage.targetGrade}
              stroke={APPILICO_COLOURS.amber}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          ))}

          <Bar
            dataKey="actualGrade"
            radius={[4, 4, 0, 0]}
            onClick={(data: { payload?: { id: string } }) => {
              if (data.payload) {
                const stage = sortedData.find(s => s.id === data.payload!.id)
                if (stage) handleBarClick(stage)
              }
            }}
          >
            {sortedData.map(stage => (
              <Cell
                key={stage.id}
                fill={getBarColour(stage)}
                cursor="pointer"
                opacity={selectedStage && selectedStage.id !== stage.id ? 0.4 : 1}
              />
            ))}
            <LabelList
              dataKey="actualGrade"
              position="top"
              formatter={(value: number) => `${value.toFixed(2)}%`}
              style={{ fontSize: 10, fill: '#333' }}
            />
            {showVariance && (
              <LabelList
                dataKey="variance"
                position="top"
                offset={15}
                formatter={(value: number | undefined) =>
                  value !== undefined ? `${value >= 0 ? '+' : ''}${value.toFixed(1)}%` : ''
                }
                style={{ fontSize: 9 }}
              />
            )}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>

      {/* Recovery Summary */}
      {showRecovery && recovery !== undefined && (
        <RecoverySummary recovery={recovery} unit={unit} />
      )}

      {/* Stage Detail */}
      {selectedStage && (
        <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900">{selectedStage.name}</h4>
          <p className="text-sm text-gray-500">{selectedStage.material}</p>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Actual:</span>{' '}
              <span className="font-medium">{selectedStage.actualGrade.toFixed(2)}{unit}</span>
            </div>
            {selectedStage.targetGrade !== undefined && (
              <div>
                <span className="text-gray-500">Target:</span>{' '}
                <span className="font-medium">{selectedStage.targetGrade.toFixed(2)}{unit}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default OreGradeWaterfallChart
