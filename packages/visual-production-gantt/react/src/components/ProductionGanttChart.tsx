// Mine Production Gantt Chart - React Component
// Displays production shift performance with actual vs target tonnes

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { ShiftDataPoint, APPILICO_COLOURS } from '@appilico/shared-types'
import { ChartSkeleton, EmptyState } from '@appilico/shared-ui'

// ── Props Interface ──────────────────────────────────────────────────────────

export interface ProductionGanttChartProps {
  /** Array of shift data points to display */
  data: ShiftDataPoint[]
  /** Chart height in pixels */
  height?: number
  /** Whether to show target reference line */
  showTarget?: boolean
  /** Colour for bars above target */
  colourAboveTarget?: string
  /** Colour for bars near target (within 10%) */
  colourNearTarget?: string
  /** Colour for bars below target */
  colourBelowTarget?: string
  /** Callback when a bar is clicked */
  onBarClick?: (point: ShiftDataPoint) => void
  /** Whether data is loading */
  isLoading?: boolean
  /** Additional CSS classes */
  className?: string
}

// ── Helper Functions ─────────────────────────────────────────────────────────

interface ColourSettings {
  colourAboveTarget: string
  colourNearTarget: string
  colourBelowTarget: string
  colourNeutral: string
}

function getBarColour(point: ShiftDataPoint, settings: ColourSettings): string {
  if (!point.targetTonnes) return settings.colourNeutral
  const ratio = point.actualTonnes / point.targetTonnes
  if (ratio >= 1.0) return settings.colourAboveTarget
  if (ratio >= 0.9) return settings.colourNearTarget
  return settings.colourBelowTarget
}

function avgTarget(data: ShiftDataPoint[]): number | undefined {
  const withTarget = data.filter(d => d.targetTonnes !== undefined)
  if (!withTarget.length) return undefined
  return withTarget.reduce((sum, d) => sum + (d.targetTonnes ?? 0), 0) / withTarget.length
}

// ── Custom Tooltip Component ─────────────────────────────────────────────────

interface GanttTooltipProps {
  active?: boolean
  payload?: Array<{ payload: ShiftDataPoint }>
}

function GanttTooltip({ active, payload }: GanttTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-2">{d.shiftLabel}</p>
      <div className="space-y-1">
        <p>
          Actual: <span className="font-medium">{d.actualTonnes.toLocaleString()}t</span>
        </p>
        {d.targetTonnes !== undefined && (
          <>
            <p>
              Target: <span className="font-medium">{d.targetTonnes.toLocaleString()}t</span>
            </p>
            <p>
              Variance:{' '}
              <span
                className={`font-medium ${
                  (d.variance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {(d.variance ?? 0) >= 0 ? '+' : ''}
                {d.variance?.toFixed(1)}%
              </span>
            </p>
          </>
        )}
        {d.crewName && (
          <p>
            Crew: <span className="font-medium">{d.crewName}</span>
          </p>
        )}
        {d.equipmentCount !== undefined && (
          <p>
            Equipment: <span className="font-medium">{d.equipmentCount} units</span>
          </p>
        )}
        {d.location && (
          <p>
            Location: <span className="font-medium">{d.location}</span>
          </p>
        )}
      </div>
    </div>
  )
}

// ── Shift Detail Card Component ──────────────────────────────────────────────

export interface ShiftDetailCardProps {
  point: ShiftDataPoint | null
}

export function ShiftDetailCard({ point }: ShiftDetailCardProps) {
  return (
    <AnimatePresence>
      {point && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="mt-4 bg-white border border-gray-200 rounded-lg shadow p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{point.shiftLabel}</h3>
              <p className="text-sm text-gray-500">{point.location ?? 'Unknown location'}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {point.actualTonnes.toLocaleString()}t
              </p>
              {point.variance !== undefined && (
                <p
                  className={`text-sm font-medium ${
                    point.variance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {point.variance >= 0 ? '+' : ''}
                  {point.variance.toFixed(1)}% vs target
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {point.targetTonnes !== undefined && (
              <div>
                <p className="text-xs text-gray-500 uppercase">Target</p>
                <p className="text-sm font-medium">{point.targetTonnes.toLocaleString()}t</p>
              </div>
            )}
            {point.crewName && (
              <div>
                <p className="text-xs text-gray-500 uppercase">Crew</p>
                <p className="text-sm font-medium">{point.crewName}</p>
              </div>
            )}
            {point.equipmentCount !== undefined && (
              <div>
                <p className="text-xs text-gray-500 uppercase">Equipment</p>
                <p className="text-sm font-medium">{point.equipmentCount} units</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 uppercase">Shift Type</p>
              <p className="text-sm font-medium">{point.shiftType}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Main Chart Component ─────────────────────────────────────────────────────

export function ProductionGanttChart({
  data,
  height = 400,
  showTarget = true,
  colourAboveTarget = APPILICO_COLOURS.green,
  colourNearTarget = APPILICO_COLOURS.amber,
  colourBelowTarget = APPILICO_COLOURS.red,
  onBarClick,
  isLoading = false,
  className,
}: ProductionGanttChartProps) {
  const [activeBar, setActiveBar] = useState<string | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<ShiftDataPoint | null>(null)

  if (isLoading) {
    return <ChartSkeleton width="100%" height={height} type="bars" />
  }

  if (!data.length) {
    return <EmptyState title="No production data" description="Select a site and date range" />
  }

  const target = showTarget ? avgTarget(data) : undefined
  const hasTarget = data.some(d => d.targetTonnes !== undefined)

  const colourSettings: ColourSettings = {
    colourAboveTarget,
    colourNearTarget,
    colourBelowTarget,
    colourNeutral: APPILICO_COLOURS.navy,
  }

  const handleBarClick = (point: ShiftDataPoint) => {
    setSelectedPoint(prev => (prev?.id === point.id ? null : point))
    onBarClick?.(point)
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
          onClick={e => {
            if (e?.activePayload?.[0]?.payload) {
              handleBarClick(e.activePayload[0].payload)
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
          <XAxis
            dataKey="shiftLabel"
            angle={-45}
            textAnchor="end"
            height={70}
            tick={{ fontSize: 11 }}
            tickLine={{ stroke: '#E5E5E5' }}
            axisLine={{ stroke: '#E5E5E5' }}
          />
          <YAxis
            tickFormatter={v => v.toLocaleString() + 't'}
            label={{
              value: 'Tonnes',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#666' },
            }}
            tick={{ fontSize: 11 }}
            tickLine={{ stroke: '#E5E5E5' }}
            axisLine={{ stroke: '#E5E5E5' }}
          />
          <Tooltip
            content={<GanttTooltip />}
            cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
          />
          {target !== undefined && showTarget && hasTarget && (
            <ReferenceLine
              y={target}
              stroke={APPILICO_COLOURS.navy}
              strokeDasharray="6 4"
              strokeWidth={2}
              label={{
                value: `Target: ${target.toLocaleString()}t`,
                position: 'right',
                fontSize: 11,
                fill: APPILICO_COLOURS.navy,
              }}
            />
          )}
          <Bar
            dataKey="actualTonnes"
            radius={[3, 3, 0, 0]}
            onMouseEnter={(_, index) => setActiveBar(data[index]?.id ?? null)}
            onMouseLeave={() => setActiveBar(null)}
          >
            {data.map(entry => (
              <Cell
                key={entry.id}
                fill={getBarColour(entry, colourSettings)}
                opacity={activeBar && activeBar !== entry.id ? 0.4 : 1}
                cursor="pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      {hasTarget && (
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: colourAboveTarget }}
            />
            <span className="text-xs text-gray-600">Above Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: colourNearTarget }}
            />
            <span className="text-xs text-gray-600">Near Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: colourBelowTarget }}
            />
            <span className="text-xs text-gray-600">Below Target</span>
          </div>
        </div>
      )}

      <ShiftDetailCard point={selectedPoint} />
    </div>
  )
}

export default ProductionGanttChart
