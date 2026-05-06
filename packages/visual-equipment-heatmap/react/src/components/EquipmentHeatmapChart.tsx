// Equipment Utilisation Heatmap - React Component
// 24-hour grid showing equipment status throughout the day

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EquipmentUnit, HourlyStatus, STATUS_COLOURS, APPILICO_COLOURS } from '@appilico/shared-types'
import { ChartSkeleton, EmptyState } from '@appilico/shared-ui'

// ── Props Interface ──────────────────────────────────────────────────────────

export interface EquipmentHeatmapChartProps {
  /** Array of equipment units with hourly status */
  data: EquipmentUnit[]
  /** Cell size in pixels */
  cellSize?: number
  /** Whether to show OEE percentage */
  showOEE?: boolean
  /** Whether data is loading */
  isLoading?: boolean
  /** Callback when cell is clicked */
  onCellClick?: (unit: EquipmentUnit, hour: number) => void
  /** Callback when equipment row is clicked */
  onEquipmentClick?: (unit: EquipmentUnit) => void
  /** Additional CSS classes */
  className?: string
}

// ── Fleet Summary Component ──────────────────────────────────────────────────

interface FleetSummaryProps {
  data: EquipmentUnit[]
}

function FleetSummary({ data }: FleetSummaryProps) {
  const avgOEE = Math.round(data.reduce((sum, e) => sum + e.oeePercent, 0) / data.length)
  const bestPerformer = data.reduce((best, e) => (e.oeePercent > best.oeePercent ? e : best), data[0])
  const worstPerformer = data.reduce((worst, e) => (e.oeePercent < worst.oeePercent ? e : worst), data[0])
  
  const totalDowntimeHours = data.reduce((sum, unit) => {
    return sum + unit.hourlyStatus.filter(h => 
      h.status === 'UnplannedDown' || h.status === 'Maintenance'
    ).reduce((hSum, h) => hSum + h.durationHours, 0)
  }, 0)

  const stats = [
    { label: 'Average OEE', value: `${avgOEE}%`, colour: avgOEE >= 85 ? APPILICO_COLOURS.green : avgOEE >= 70 ? APPILICO_COLOURS.amber : APPILICO_COLOURS.red },
    { label: 'Best Performer', value: `${bestPerformer.id} (${bestPerformer.oeePercent}%)`, colour: APPILICO_COLOURS.green },
    { label: 'Worst Performer', value: `${worstPerformer.id} (${worstPerformer.oeePercent}%)`, colour: APPILICO_COLOURS.red },
    { label: 'Total Downtime', value: `${totalDowntimeHours.toFixed(1)}h`, colour: APPILICO_COLOURS.grey },
  ]

  return (
    <div className="flex gap-4 mb-4 flex-wrap">
      {stats.map((stat, i) => (
        <div key={i} className="bg-gray-50 rounded-lg px-4 py-2 flex-1 min-w-[140px]">
          <p className="text-xs text-gray-500 uppercase">{stat.label}</p>
          <p className="text-sm font-semibold" style={{ color: stat.colour }}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}

// ── Cell Detail Panel Component ──────────────────────────────────────────────

interface CellDetailPanelProps {
  unit: EquipmentUnit | null
  hour: number | null
  onClose: () => void
}

function CellDetailPanel({ unit, hour, onClose }: CellDetailPanelProps) {
  if (!unit || hour === null) return null

  const hourStatus = unit.hourlyStatus.find(h => h.hour === hour)
  if (!hourStatus) return null

  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM'
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${displayHour}:00 ${period}`
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="mt-4 bg-white border border-gray-200 rounded-lg shadow p-4"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{unit.name}</h3>
            <p className="text-sm text-gray-500">{unit.id} • {unit.type}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Hour</p>
            <p className="text-sm font-medium">{formatHour(hour)} - {formatHour(hour + 1)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Status</p>
            <p className="text-sm font-medium" style={{ color: STATUS_COLOURS[hourStatus.status] }}>
              {hourStatus.status}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Duration</p>
            <p className="text-sm font-medium">{(hourStatus.durationHours * 60).toFixed(0)} min</p>
          </div>
          {hourStatus.reasonCode && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Reason Code</p>
              <p className="text-sm font-medium font-mono">{hourStatus.reasonCode}</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Heatmap Cell Component ───────────────────────────────────────────────────

interface HeatmapCellProps {
  status: HourlyStatus
  cellSize: number
  isHighlighted: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

function HeatmapCell({ status, cellSize, isHighlighted, onClick, onMouseEnter, onMouseLeave }: HeatmapCellProps) {
  const colour = STATUS_COLOURS[status.status]
  const opacity = 0.4 + status.durationHours * 0.6

  return (
    <rect
      width={cellSize}
      height={cellSize}
      fill={colour}
      opacity={isHighlighted ? 1 : opacity}
      rx={3}
      ry={3}
      cursor="pointer"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        transition: 'opacity 150ms ease-in-out',
        stroke: isHighlighted ? '#000' : 'transparent',
        strokeWidth: isHighlighted ? 2 : 0,
      }}
    />
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function EquipmentHeatmapChart({
  data,
  cellSize = 24,
  showOEE = true,
  isLoading = false,
  onCellClick,
  onEquipmentClick,
  className,
}: EquipmentHeatmapChartProps) {
  const [hoveredCell, setHoveredCell] = useState<{ unit: string; hour: number } | null>(null)
  const [selectedRow, setSelectedRow] = useState<string | null>(null)
  const [selectedCell, setSelectedCell] = useState<{ unit: EquipmentUnit; hour: number } | null>(null)

  const gap = 2
  const leftMargin = 120 + (showOEE ? 60 : 0)
  const topMargin = 28
  const rightMargin = 16

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const displayHours = [0, 3, 6, 9, 12, 15, 18, 21]

  const handleCellClick = useCallback((unit: EquipmentUnit, hour: number) => {
    setSelectedCell({ unit, hour })
    onCellClick?.(unit, hour)
  }, [onCellClick])

  const handleEquipmentClick = useCallback((unit: EquipmentUnit) => {
    setSelectedRow(prev => (prev === unit.id ? null : unit.id))
    onEquipmentClick?.(unit)
  }, [onEquipmentClick])

  const getOEEColour = (oee: number) => {
    if (oee >= 85) return APPILICO_COLOURS.green
    if (oee >= 70) return APPILICO_COLOURS.amber
    return APPILICO_COLOURS.red
  }

  if (isLoading) {
    return <ChartSkeleton width="100%" height={300} type="heatmap" />
  }

  if (!data.length) {
    return <EmptyState title="No equipment data" description="Select a site to view equipment status" />
  }

  const svgWidth = leftMargin + 24 * (cellSize + gap) + rightMargin
  const svgHeight = topMargin + data.length * (cellSize + gap) + 40

  return (
    <div className={className}>
      <FleetSummary data={data} />
      
      <div className="overflow-x-auto">
        <svg width={svgWidth} height={svgHeight}>
          {/* Hour labels */}
          <g>
            {displayHours.map(hour => (
              <text
                key={hour}
                x={leftMargin + hour * (cellSize + gap) + cellSize / 2}
                y={16}
                textAnchor="middle"
                fontSize={10}
                fill="#666"
              >
                {hour.toString().padStart(2, '0')}:00
              </text>
            ))}
          </g>

          {/* Equipment rows */}
          {data.map((unit, rowIndex) => {
            const y = topMargin + rowIndex * (cellSize + gap)
            const isRowSelected = selectedRow === unit.id
            const rowOpacity = selectedRow && !isRowSelected ? 0.35 : 1

            return (
              <g key={unit.id} opacity={rowOpacity}>
                {/* Equipment label */}
                <text
                  x={leftMargin - 8 - (showOEE ? 60 : 0)}
                  y={y + cellSize / 2 + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="#333"
                  cursor="pointer"
                  onClick={() => handleEquipmentClick(unit)}
                  style={{ fontWeight: isRowSelected ? 600 : 400 }}
                >
                  {unit.id}
                </text>

                {/* OEE % */}
                {showOEE && (
                  <text
                    x={leftMargin - 8}
                    y={y + cellSize / 2 + 4}
                    textAnchor="end"
                    fontSize={11}
                    fill={getOEEColour(unit.oeePercent)}
                    fontWeight={500}
                  >
                    {unit.oeePercent}%
                  </text>
                )}

                {/* Hour cells */}
                {hours.map(hour => {
                  const status = unit.hourlyStatus.find(h => h.hour === hour)
                  if (!status) return null

                  const x = leftMargin + hour * (cellSize + gap)
                  const isHighlighted = 
                    hoveredCell?.unit === unit.id && hoveredCell?.hour === hour

                  return (
                    <g key={hour} transform={`translate(${x}, ${y})`}>
                      <HeatmapCell
                        status={status}
                        cellSize={cellSize}
                        isHighlighted={isHighlighted}
                        onClick={() => handleCellClick(unit, hour)}
                        onMouseEnter={() => setHoveredCell({ unit: unit.id, hour })}
                        onMouseLeave={() => setHoveredCell(null)}
                      />
                    </g>
                  )
                })}
              </g>
            )
          })}

          {/* Legend */}
          <g transform={`translate(${leftMargin}, ${svgHeight - 30})`}>
            {Object.entries(STATUS_COLOURS).map(([status, colour], i) => (
              <g key={status} transform={`translate(${i * 100}, 0)`}>
                <rect width={12} height={12} fill={colour} rx={2} />
                <text x={16} y={10} fontSize={10} fill="#666">{status}</text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div className="fixed z-50 bg-white border border-gray-200 rounded shadow-lg p-2 text-xs pointer-events-none"
          style={{ display: 'none' }} // Use CSS positioning based on mouse
        >
          {/* Tooltip content handled by browser title or custom positioning */}
        </div>
      )}

      <CellDetailPanel
        unit={selectedCell?.unit ?? null}
        hour={selectedCell?.hour ?? null}
        onClose={() => setSelectedCell(null)}
      />
    </div>
  )
}

export default EquipmentHeatmapChart
