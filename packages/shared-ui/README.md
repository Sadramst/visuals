# @appilico/shared-ui

Shared React components for Appilico mining visuals.

## Installation

```bash
npm install @appilico/shared-ui
```

## Peer Dependencies

- `react` >= 18.0.0
- `react-dom` >= 18.0.0

## Components

### ChartTooltip
Generic tooltip component for chart hover states with auto-repositioning.

```tsx
import { ChartTooltip } from '@appilico/shared-ui'

<ChartTooltip x={100} y={100} visible={isHovering}>
  <div>Tooltip content</div>
</ChartTooltip>
```

### ChartSkeleton
Animated loading placeholder matching chart dimensions.

```tsx
import { ChartSkeleton } from '@appilico/shared-ui'

<ChartSkeleton width={400} height={300} type="bars" />
// Types: 'bars' | 'heatmap' | 'cards' | 'line'
```

### EmptyState
Empty state component for charts with no data.

```tsx
import { EmptyState } from '@appilico/shared-ui'

<EmptyState 
  title="No production data" 
  description="Select a site and date range"
  action={{ label: 'Load Data', onClick: handleLoad }}
/>
```

### ErrorState
Error state component with optional retry.

```tsx
import { ErrorState } from '@appilico/shared-ui'

<ErrorState message="Failed to load data" onRetry={handleRetry} />
```

### PlanBadge
Coloured badge showing subscription plan tier.

```tsx
import { PlanBadge } from '@appilico/shared-ui'

<PlanBadge plan="Professional" />
// Plans: 'Free' | 'Starter' | 'Professional' | 'Enterprise'
```

### StatusBadge
Status badge for KPI status display.

```tsx
import { StatusBadge } from '@appilico/shared-ui'

<StatusBadge status="good" />
// Status: 'good' | 'warning' | 'bad' | 'neutral'
```

### TrendIndicator
Trend arrow with percentage, colour-coded by outcome.

```tsx
import { TrendIndicator } from '@appilico/shared-ui'

// isPositive controls colour (for inverse metrics like TRIFR)
<TrendIndicator direction="down" percent={12.5} isPositive={true} />
```

### MiniSparkline
Tiny sparkline chart using Recharts.

```tsx
import { MiniSparkline } from '@appilico/shared-ui'

<MiniSparkline data={[1, 2, 3, 4, 5]} height={48} colour="#1F3864" />
```

### SectionHeader
Header component for chart sections.

```tsx
import { SectionHeader } from '@appilico/shared-ui'

<SectionHeader 
  title="Production Overview" 
  subtitle="Last 7 days"
  action={<button>Export</button>}
/>
```

## License

MIT © Appilico
