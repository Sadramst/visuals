interface ChartSkeletonProps {
  /** Width of the skeleton (CSS value) */
  width: string | number
  /** Height of the skeleton in pixels */
  height: number
  /** Type of skeleton to render */
  type: 'bars' | 'heatmap' | 'cards' | 'line' | 'combo'
  /** Additional CSS classes */
  className?: string
}

/**
 * Animated loading placeholder matching chart dimensions
 */
export function ChartSkeleton({ width, height, type, className = '' }: ChartSkeletonProps) {
  const widthStyle = typeof width === 'number' ? `${width}px` : width

  const renderBars = () => {
    const barCount = 8
    const barWidth = 100 / (barCount * 2)
    return (
      <div className="flex items-end justify-around h-full px-4 pb-8">
        {Array.from({ length: barCount }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 animate-pulse rounded-t"
            style={{
              width: `${barWidth}%`,
              height: `${30 + Math.random() * 60}%`,
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
    )
  }

  const renderHeatmap = () => {
    const rows = 4
    const cols = 12
    return (
      <div className="p-4">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 mb-1">
            <div className="w-20 h-6 bg-gray-200 animate-pulse rounded mr-2" />
            {Array.from({ length: cols }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="w-6 h-6 bg-gray-200 animate-pulse rounded"
                style={{ animationDelay: `${(rowIndex * cols + colIndex) * 30}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  const renderCards = () => {
    const cardCount = 6
    return (
      <div className="grid grid-cols-2 gap-4 p-4">
        {Array.from({ length: cardCount }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-100 rounded-lg p-4 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  const renderLine = () => {
    return (
      <div className="relative h-full px-4 pb-8">
        <svg width="100%" height="100%" className="overflow-visible">
          {/* X axis */}
          <line
            x1="0"
            y1="90%"
            x2="100%"
            y2="90%"
            stroke="#E5E7EB"
            strokeWidth="2"
          />
          {/* Line skeleton */}
          <path
            d="M 0 70 Q 15 50, 30 60 T 60 40 T 90 55 T 120 45 T 150 50 T 180 35 T 210 45 T 240 30 T 270 40 T 300 25"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="3"
            className="animate-pulse"
            style={{ transform: 'scale(1, 0.8)', transformOrigin: 'center' }}
          />
        </svg>
      </div>
    )
  }

  const renderContent = () => {
    switch (type) {
      case 'bars':
        return renderBars()
      case 'heatmap':
        return renderHeatmap()
      case 'cards':
        return renderCards()
      case 'line':
        return renderLine()
      default:
        return renderBars()
    }
  }

  return (
    <div
      className={`bg-gray-50 rounded-lg overflow-hidden ${className}`}
      style={{ width: widthStyle, height }}
    >
      {renderContent()}
    </div>
  )
}

export default ChartSkeleton
