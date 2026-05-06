# @appilico/shared-mock-data

Realistic WA iron ore mine operational data generators for Appilico visuals.

## Installation

```bash
npm install @appilico/shared-mock-data
```

## Usage

```typescript
import { generateAllData, MockDataOptions } from '@appilico/shared-mock-data'

const options: MockDataOptions = {
  siteId: 'pit3',   // 'pit3' | 'pit7' | 'rompad'
  dateRange: '7d',  // '7d' | '30d' | '90d'
}

const data = generateAllData(options)

console.log(data.shifts)      // Production shift data
console.log(data.equipment)   // Equipment utilisation
console.log(data.safetyKPIs)  // Safety KPIs
console.log(data.gradeStages) // Ore grade waterfall
console.log(data.costData)    // Cost per tonne
console.log(data.summary)     // Operational summary
```

## Features

### Deterministic Data Generation
All data is generated using seeded random numbers, ensuring:
- Consistent data across page refreshes
- Same data for same site + date range combination
- Repeatable demos and testing

### Built-in Scenarios
The mock data includes realistic operational scenarios:
- **Tuesday underperformance**: Pit 3 AM shift on Tuesday shows 28% below target (haul truck issue)
- **Equipment faults**: D11-001 has hydraulic fault hours 8-14
- **Scheduled maintenance**: CAT793-002 has PM during hours 6-8
- **April wet season**: Cost anomaly showing 21% over budget

### Sites
- `pit3` - Pit 3 Southern Operations
- `pit7` - Pit 7 Northern Expansion
- `rompad` - ROM Pad Processing Plant

### Generators
- `generateShiftData()` - Production data by shift
- `generateEquipmentData()` - Equipment utilisation heatmap
- `generateSafetyKPIs()` - Safety metrics with trends
- `generateGradeStages()` - Ore grade waterfall
- `generateCostData()` - Cost per tonne with anomaly detection
- `generateSummary()` - Operational KPI summary
- `generateAllData()` - All data in one call

## License

MIT © Appilico
