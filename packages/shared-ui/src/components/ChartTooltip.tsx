import React, { useEffect, useRef, useState } from 'react'

interface ChartTooltipProps {
  /** X position relative to container */
  x: number
  /** Y position relative to container */
  y: number
  /** Tooltip content */
  children: React.ReactNode
  /** Whether tooltip is visible */
  visible: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Generic tooltip component for chart hover states
 * Auto-repositions when near viewport edges
 */
export function ChartTooltip({ x, y, children, visible, className = '' }: ChartTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x, y })

  useEffect(() => {
    if (!tooltipRef.current || !visible) return

    const tooltip = tooltipRef.current
    const rect = tooltip.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let adjustedX = x
    let adjustedY = y

    // Adjust horizontal position if near right edge
    if (x + rect.width + 20 > viewportWidth) {
      adjustedX = x - rect.width - 10
    } else {
      adjustedX = x + 10
    }

    // Adjust vertical position if near bottom edge
    if (y + rect.height + 20 > viewportHeight) {
      adjustedY = y - rect.height - 10
    } else {
      adjustedY = y + 10
    }

    // Ensure not off left/top edge
    adjustedX = Math.max(10, adjustedX)
    adjustedY = Math.max(10, adjustedY)

    setPosition({ x: adjustedX, y: adjustedY })
  }, [x, y, visible])

  if (!visible) return null

  return (
    <div
      ref={tooltipRef}
      className={`absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 pointer-events-none ${className}`}
      style={{
        left: position.x,
        top: position.y,
        transition: 'opacity 150ms ease-in-out',
      }}
    >
      {children}
    </div>
  )
}

export default ChartTooltip
