import React from 'react'

interface SectionHeaderProps {
  /** Main title text */
  title: string
  /** Optional subtitle text */
  subtitle?: string
  /** Optional action element (button, dropdown, etc.) */
  action?: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Section header component for chart sections
 */
export function SectionHeader({ title, subtitle, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  )
}

export default SectionHeader
