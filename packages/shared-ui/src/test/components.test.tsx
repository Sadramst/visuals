import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  ChartTooltip,
  ChartSkeleton,
  EmptyState,
  ErrorState,
  PlanBadge,
  StatusBadge,
  TrendIndicator,
  MiniSparkline,
  SectionHeader,
} from '../index'

describe('ChartTooltip', () => {
  it('renders content when visible', () => {
    render(
      <ChartTooltip x={100} y={100} visible={true}>
        <span>Tooltip content</span>
      </ChartTooltip>
    )
    expect(screen.getByText('Tooltip content')).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    render(
      <ChartTooltip x={100} y={100} visible={false}>
        <span>Tooltip content</span>
      </ChartTooltip>
    )
    expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument()
  })
})

describe('ChartSkeleton', () => {
  it('renders bars skeleton', () => {
    const { container } = render(<ChartSkeleton width={400} height={300} type="bars" />)
    expect(container.firstChild).toHaveStyle({ width: '400px', height: '300px' })
  })

  it('renders heatmap skeleton', () => {
    const { container } = render(<ChartSkeleton width="100%" height={200} type="heatmap" />)
    expect(container.firstChild).toHaveStyle({ width: '100%', height: '200px' })
  })

  it('renders cards skeleton', () => {
    const { container } = render(<ChartSkeleton width={400} height={300} type="cards" />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders line skeleton', () => {
    const { container } = render(<ChartSkeleton width={400} height={300} type="line" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No data" description="Please select a date range" />)
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(screen.getByText('Please select a date range')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    const handleClick = jest.fn()
    render(
      <EmptyState
        title="No data"
        description="Please select"
        action={{ label: 'Load Data', onClick: handleClick }}
      />
    )
    const button = screen.getByText('Load Data')
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalled()
  })

  it('does not render action button when not provided', () => {
    render(<EmptyState title="No data" description="Please select" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('renders error message', () => {
    render(<ErrorState message="Failed to load data" />)
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
  })

  it('renders retry button when onRetry provided', () => {
    const handleRetry = jest.fn()
    render(<ErrorState message="Error" onRetry={handleRetry} />)
    const button = screen.getByText('Try again')
    fireEvent.click(button)
    expect(handleRetry).toHaveBeenCalled()
  })

  it('does not render retry button when onRetry not provided', () => {
    render(<ErrorState message="Error" />)
    expect(screen.queryByText('Try again')).not.toBeInTheDocument()
  })
})

describe('PlanBadge', () => {
  it('renders Free plan badge', () => {
    render(<PlanBadge plan="Free" />)
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('renders Starter plan badge', () => {
    render(<PlanBadge plan="Starter" />)
    expect(screen.getByText('Starter')).toBeInTheDocument()
  })

  it('renders Professional plan badge', () => {
    render(<PlanBadge plan="Professional" />)
    expect(screen.getByText('Professional')).toBeInTheDocument()
  })

  it('renders Enterprise plan badge', () => {
    render(<PlanBadge plan="Enterprise" />)
    expect(screen.getByText('Enterprise')).toBeInTheDocument()
  })
})

describe('StatusBadge', () => {
  it('renders good status', () => {
    render(<StatusBadge status="good" />)
    expect(screen.getByText('On Target')).toBeInTheDocument()
  })

  it('renders warning status', () => {
    render(<StatusBadge status="warning" />)
    expect(screen.getByText('At Risk')).toBeInTheDocument()
  })

  it('renders bad status', () => {
    render(<StatusBadge status="bad" />)
    expect(screen.getByText('Off Target')).toBeInTheDocument()
  })

  it('renders neutral status', () => {
    render(<StatusBadge status="neutral" />)
    expect(screen.getByText('No Target')).toBeInTheDocument()
  })

  it('renders custom label', () => {
    render(<StatusBadge status="good" label="Custom Label" />)
    expect(screen.getByText('Custom Label')).toBeInTheDocument()
  })
})

describe('TrendIndicator', () => {
  it('renders up trend with positive colour', () => {
    render(<TrendIndicator direction="up" percent={5.5} isPositive={true} />)
    expect(screen.getByText('5.5%')).toBeInTheDocument()
  })

  it('renders down trend with negative colour', () => {
    render(<TrendIndicator direction="down" percent={3.2} isPositive={false} />)
    expect(screen.getByText('3.2%')).toBeInTheDocument()
  })

  it('renders flat trend', () => {
    render(<TrendIndicator direction="flat" percent={0} isPositive={true} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('handles inverse metrics (down is positive)', () => {
    // For TRIFR, down trend is positive
    const { container } = render(
      <TrendIndicator direction="down" percent={10} isPositive={true} />
    )
    expect(container.firstChild).toHaveStyle({ color: '#00B050' }) // Green
  })
})

describe('MiniSparkline', () => {
  it('renders with data', () => {
    const { container } = render(<MiniSparkline data={[1, 2, 3, 4, 5]} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders nothing with empty data', () => {
    const { container } = render(<MiniSparkline data={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('uses custom height', () => {
    const { container } = render(<MiniSparkline data={[1, 2, 3]} height={100} />)
    expect(container.firstChild).toHaveStyle({ height: '100px' })
  })
})

describe('SectionHeader', () => {
  it('renders title', () => {
    render(<SectionHeader title="Production Overview" />)
    expect(screen.getByText('Production Overview')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<SectionHeader title="Production" subtitle="Last 7 days" />)
    expect(screen.getByText('Production')).toBeInTheDocument()
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
  })

  it('renders action when provided', () => {
    render(
      <SectionHeader
        title="Production"
        action={<button>Export</button>}
      />
    )
    expect(screen.getByText('Export')).toBeInTheDocument()
  })
})
