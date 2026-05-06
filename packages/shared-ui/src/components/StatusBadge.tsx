import { KPIStatus, KPI_STATUS_COLOURS } from '@appilico/shared-types'

interface StatusBadgeProps {
  /** Status to display */
  status: KPIStatus
  /** Optional label override */
  label?: string
  /** Additional CSS classes */
  className?: string
}

const STATUS_LABELS: Record<KPIStatus, string> = {
  good: 'On Target',
  warning: 'At Risk',
  bad: 'Off Target',
  neutral: 'No Target',
}

/**
 * Status badge component showing KPI status
 */
export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const colour = KPI_STATUS_COLOURS[status]
  const displayLabel = label ?? STATUS_LABELS[status]

  // Determine text colour based on status
  const textColour = status === 'neutral' ? 'text-gray-700' : 'text-white'

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${textColour} ${className}`}
      style={{ backgroundColor: colour }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          status === 'neutral' ? 'bg-gray-500' : 'bg-white bg-opacity-75'
        }`}
      />
      {displayLabel}
    </span>
  )
}

export default StatusBadge
