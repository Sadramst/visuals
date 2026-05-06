import { ResponsiveContainer, Area, AreaChart } from 'recharts'
import { APPILICO_COLOURS } from '@appilico/shared-types'

interface MiniSparklineProps {
  /** Array of numeric values to display */
  data: number[]
  /** Line/fill colour (defaults to navy) */
  colour?: string
  /** Height in pixels (default 48) */
  height?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * Tiny sparkline chart with no axes
 */
export function MiniSparkline({
  data,
  colour = APPILICO_COLOURS.navy,
  height = 48,
  className = '',
}: MiniSparklineProps) {
  if (!data.length) return null

  // Transform to chart data format
  const chartData = data.map((value, index) => ({
    index,
    value,
  }))

  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={`sparkline-gradient-${colour.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colour} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colour} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={colour}
            strokeWidth={2}
            fill={`url(#sparkline-gradient-${colour.replace('#', '')})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default MiniSparkline
