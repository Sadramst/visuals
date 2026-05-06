# @appilico/shared-types

Shared TypeScript interfaces for Appilico mining operations visuals.

## Installation

```bash
npm install @appilico/shared-types
```

## Usage

```typescript
import { 
  ShiftDataPoint, 
  EquipmentUnit, 
  SafetyKPI,
  APPILICO_COLOURS 
} from '@appilico/shared-types'

// Use types for type-safe mining operations data
const shift: ShiftDataPoint = {
  id: 'shift-001',
  date: new Date(),
  shiftType: 'AM',
  shiftLabel: '12 May AM',
  actualTonnes: 11500,
  targetTonnes: 12000,
  crewName: 'Alpha Crew',
  equipmentCount: 8,
  location: 'Pit 3',
  variance: -4.17
}
```

## Exports

### Mining Domain Types
- `ShiftDataPoint` - Production shift data
- `EquipmentUnit` - Equipment with hourly status
- `HourlyStatus` - Hour-by-hour equipment status
- `EquipmentStatus` - Status type enum
- `SafetyKPI` - Safety metric data
- `TrendPoint` - Historical trend point
- `KPIStatus` - Status classification
- `GradeStage` - Ore grade processing stage
- `CostDataPoint` - Cost per tonne data
- `CostCategory` - Cost breakdown category

### AI Query Types
- `IntentType` - Query intent classification
- `ChartType` - Suggested visualisation type
- `ConfidenceLevel` - AI response confidence
- `AIQueryRequest` - Query input
- `AIQueryResponse` - Query response
- `DataPoint` - Supporting data point
- `ConversationMessage` - Chat message

### Colour Palettes
- `APPILICO_COLOURS` - Brand colours
- `CATEGORY_COLOURS` - Category-specific colours
- `STATUS_COLOURS` - Equipment status colours
- `KPI_STATUS_COLOURS` - KPI status colours
- `COST_CATEGORY_COLOURS` - Cost category colours
- `PLAN_COLOURS` - Subscription plan colours

## License

MIT © Appilico
