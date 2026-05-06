import { APPILICO_COLOURS } from '@appilico/shared-types'

interface TrendIndicatorProps {
  /** Direction of the trend */
  direction: 'up' | 'down' | 'flat'
  /** Percentage change */
  percent: number
  /** Whether this direction is positive (affects colour) */
  isPositive: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Trend indicator showing direction and percentage change
 * Colour based on isPositive (not just direction — for inverse metrics)
 */
export function TrendIndicator({
  direction,
  percent,
  isPositive,
  className = '',
}: TrendIndicatorProps) {
  const colour = isPositive ? APPILICO_COLOURS.green : APPILICO_COLOURS.red
  const flatColour = APPILICO_COLOURS.grey

  const renderArrow = () => {
    if (direction === 'flat') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )
    }

    if (direction === 'up') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )
    }

    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    )
  }

  const currentColour = direction === 'flat' ? flatColour : colour

  return (
    <span
      className={`inline-flex items-center text-sm font-medium ${className}`}
      style={{ color: currentColour }}
    >
      {renderArrow()}
      <span className="ml-0.5">
        {direction === 'flat' ? '0' : percent.toFixed(1)}%
      </span>
    </span>
  )
}

export default TrendIndicator
