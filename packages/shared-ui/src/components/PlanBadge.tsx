import { PlanTier, PLAN_COLOURS } from '@appilico/shared-types'

interface PlanBadgeProps {
  /** Plan tier to display */
  plan: PlanTier
  /** Additional CSS classes */
  className?: string
}

/**
 * Coloured badge showing subscription plan tier
 */
export function PlanBadge({ plan, className = '' }: PlanBadgeProps) {
  const colour = PLAN_COLOURS[plan]

  // Determine text colour based on background
  const textColour =
    plan === 'Free' ? 'text-gray-700' : plan === 'Enterprise' ? 'text-gray-900' : 'text-white'

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${textColour} ${className}`}
      style={{ backgroundColor: colour }}
    >
      {plan}
    </span>
  )
}

export default PlanBadge
