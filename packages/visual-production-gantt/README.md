# @appilico/visual-production-gantt

Mine Production Gantt Chart - Power BI Custom Visual & React Component

Visualises production shift performance showing actual vs target tonnes moved per shift with colour-coded performance indicators.

## Features

- **Shift-level granularity**: AM, PM, and Night shifts displayed separately
- **Target comparison**: Visual comparison against target with colour coding
- **Interactive**: Click to select shifts and view details
- **Tooltips**: Rich tooltips showing all shift details
- **Responsive**: Adapts to container size

## Installation

### Power BI Visual

1. Download the `.pbiviz` file from [appilico.com/visuals/production-gantt](https://www.appilico.com/visuals/production-gantt)
2. Open Power BI Desktop
3. Click "..." in the Visualizations pane
4. Select "Import a visual from a file"
5. Select the downloaded `.pbiviz` file
6. The visual appears in your Visualizations pane

### Data Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Shift Date | Date | Yes | Date of the shift |
| Shift (AM/PM/Night) | Text | Yes | Shift type identifier |
| Actual Tonnes | Number | Yes | Actual tonnes moved |
| Target Tonnes | Number | No | Target tonnes for comparison |
| Crew Name | Text | No | Crew working the shift |
| Equipment Count | Number | No | Number of equipment units |
| Location/Pit | Text | No | Location or pit name |

### React Component

```bash
npm install @appilico/visual-production-gantt
```

```tsx
import { ProductionGanttChart } from '@appilico/visual-production-gantt/react'
import { generateShiftData } from '@appilico/shared-mock-data'

const data = generateShiftData({ siteId: 'pit3', dateRange: '7d' })

function MyComponent() {
  return (
    <ProductionGanttChart
      data={data}
      height={400}
      showTarget={true}
      onBarClick={(point) => console.log('Clicked:', point)}
    />
  )
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| data | ShiftDataPoint[] | required | Array of shift data |
| height | number | 400 | Chart height in pixels |
| showTarget | boolean | true | Show target reference line |
| colourAboveTarget | string | #00B050 | Bar colour when above target |
| colourNearTarget | string | #ED7D31 | Bar colour when within 10% of target |
| colourBelowTarget | string | #C00000 | Bar colour when below target |
| onBarClick | function | - | Callback when bar is clicked |
| isLoading | boolean | false | Show loading skeleton |
| className | string | - | Additional CSS classes |

## Colour Coding

- **Green**: Actual >= Target (meeting or exceeding goal)
- **Amber**: Actual is 90-99% of Target (near target)
- **Red**: Actual < 90% of Target (significantly below)
- **Navy**: No target defined

## License

MIT © Appilico
