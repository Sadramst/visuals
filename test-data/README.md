# Appilico Power BI Custom Visuals - Test Data

This folder contains CSV test data files for testing each Appilico Power BI custom visual.

## Visual Files Location

All `.pbiviz` files are located in each visual's `dist` folder:

| Visual | File Location |
|--------|---------------|
| Equipment Heatmap | `packages/visual-equipment-heatmap/pbiviz/dist/appilicoEquipmentHeatmap.1.0.0.0.pbiviz` |
| Safety KPI | `packages/visual-safety-kpi/pbiviz/dist/appilicoSafetyKPI.1.0.0.0.pbiviz` |
| Ore Grade Waterfall | `packages/visual-ore-grade-waterfall/pbiviz/dist/appilicoOreGradeWaterfall.1.0.0.0.pbiviz` |
| Cost Tracker | `packages/visual-cost-tracker/pbiviz/dist/appilicoCostTracker.1.0.0.0.pbiviz` |
| Production Gantt | `packages/visual-production-gantt/pbiviz/dist/appilicoProductionGantt.1.0.0.0.pbiviz` |

---

## How to Import a Custom Visual into Power BI

1. Open Power BI Desktop
2. Click the three dots (...) in the Visualizations pane
3. Select "Import a visual from a file"
4. Navigate to the `.pbiviz` file and click Open
5. The visual icon will appear in the Visualizations pane

---

## Test Data Files & Field Mappings

### 1. Equipment Heatmap (`equipment-heatmap-data.csv`)

Shows equipment utilization status across 24 hours for mining equipment.

**Import CSV:** Get Data → Text/CSV → Select `equipment-heatmap-data.csv`

**Field Mappings:**
| Power BI Field | CSV Column |
|----------------|------------|
| Equipment ID | `EquipmentID` |
| Equipment Type | `EquipmentType` |
| Hour (0-23) | `Hour` |
| Status | `Status` |
| Duration | `Duration` |
| OEE % | `OEEPercent` |
| Reason Code | `ReasonCode` |

**Sample Data Preview:**
- 8 equipment units (dozers, trucks, excavators, drill rig, grader)
- 24 hours × 8 units = 192 data points
- Status values: Operating, Standby, Breakdown, Maintenance

---

### 2. Safety KPI Dashboard (`safety-kpi-data.csv`)

Displays safety key performance indicators with targets and trends.

**Import CSV:** Get Data → Text/CSV → Select `safety-kpi-data.csv`

**Field Mappings:**
| Power BI Field | CSV Column |
|----------------|------------|
| KPI Name | `KPIName` |
| Current Value | `CurrentValue` |
| Target Value | `TargetValue` |
| Previous Value | `PreviousValue` |
| Is Leading Indicator | `IsLeading` (1=Leading, 0=Lagging) |
| Unit | `Unit` |

**KPIs Included:**
- TRIFR (Total Recordable Injury Frequency Rate)
- LTIFR (Lost Time Injury Frequency Rate)
- Near Miss Reports
- Safety Observations
- Toolbox Talks
- Critical Risk Controls
- Hazard Identifications
- And more...

---

### 3. Ore Grade Waterfall (`ore-grade-waterfall-data.csv`)

Visualizes grade changes through processing stages for different materials.

**Import CSV:** Get Data → Text/CSV → Select `ore-grade-waterfall-data.csv`

**Field Mappings:**
| Power BI Field | CSV Column |
|----------------|------------|
| Stage Name | `StageName` |
| Actual Grade | `ActualGrade` |
| Target Grade | `TargetGrade` |
| Stage Order | `StageOrder` |
| Material | `Material` |

**Materials Included:**
- Iron Ore (6 processing stages)
- Copper (5 processing stages)
- Gold (6 processing stages)

**Filter by Material:** Use a slicer on the `Material` column to view different ore types.

---

### 4. Cost Tracker (`cost-tracker-data.csv`)

Tracks actual vs budget costs with anomaly detection.

**Import CSV:** Get Data → Text/CSV → Select `cost-tracker-data.csv`

**Field Mappings:**
| Power BI Field | CSV Column |
|----------------|------------|
| Month | `Month` |
| Actual Amount | `ActualAmount` |
| Budget Amount | `BudgetAmount` |
| Cost per Tonne | `CostPerTonne` |
| Category | `Category` |

**Cost Categories:**
- Operations
- Maintenance
- Labor
- Fuel
- Consumables

**Date Range:** January 2026 - May 2026

---

### 5. Production Gantt (`production-gantt-data.csv`)

Shows production shift performance with actual vs target tonnes.

**Import CSV:** Get Data → Text/CSV → Select `production-gantt-data.csv`

**Field Mappings:**
| Power BI Field | CSV Column |
|----------------|------------|
| Shift Date | `Date` |
| Shift (AM/PM/Night) | `Shift` |
| Actual Tonnes | `ActualTonnes` |
| Target Tonnes | `TargetTonnes` |
| Crew Name | `CrewName` |
| Equipment Count | `EquipmentCount` |
| Location/Pit | `Location` |

**Data Coverage:**
- 10 days of shift data (April 27 - May 6, 2026)
- 3 shifts per day (AM, PM, Night)
- 3 crews (Alpha, Bravo, Charlie)
- 3 pit locations (North, South, East)

---

## Quick Start Guide

### Step 1: Import Test Data
1. Open Power BI Desktop
2. Click "Get Data" → "Text/CSV"
3. Select the CSV file for the visual you want to test
4. Click "Load"

### Step 2: Import Custom Visual
1. Click the three dots in the Visualizations pane
2. Select "Import a visual from a file"
3. Navigate to the corresponding `.pbiviz` file
4. Click Open

### Step 3: Create the Visual
1. Click on the custom visual icon in the Visualizations pane
2. Drag and drop the fields from your data to the appropriate field wells
3. Resize and position the visual as needed

### Step 4: Configure Settings (Optional)
1. Click on the visual to select it
2. Click the Format pane (paint roller icon)
3. Adjust colors, labels, and other settings

---

## Troubleshooting

**Visual not loading?**
- Ensure you're using Power BI Desktop (not Power BI Service web)
- Check that the CSV data has been loaded correctly
- Verify all required fields are mapped

**Data not appearing correctly?**
- Check that column data types are correct (numeric fields should be numbers)
- Ensure date columns are recognized as dates
- For Month fields, you may need to change the data type to Date

**Colors not as expected?**
- Use the Format pane to customize status colors
- Different visuals have different color configuration options

---

## Support

For issues or feature requests, please contact the Appilico team.
