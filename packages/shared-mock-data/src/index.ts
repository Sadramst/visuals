// ══════════════════════════════════════════════════════════════════════════════
// @appilico/shared-mock-data
// Realistic WA iron ore mine operational data generators
// All data is deterministic based on seed parameters for consistency
// ══════════════════════════════════════════════════════════════════════════════

import {
  ShiftDataPoint,
  EquipmentUnit,
  HourlyStatus,
  EquipmentStatus,
  SafetyKPI,
  TrendPoint,
  KPIStatus,
  GradeStage,
  CostDataPoint,
  CostCategory,
  COST_CATEGORY_COLOURS,
} from '@appilico/shared-types'

// ── Seeded Random Generator ──────────────────────────────────────────────────

/**
 * Creates a seeded pseudo-random number generator for deterministic data
 * @param seed - Seed value for reproducibility
 * @returns Function that returns numbers between 0 and 1
 */
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

/**
 * Generate a hash from a string for seeding
 */
function stringToSeed(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

// ── Type Definitions ─────────────────────────────────────────────────────────

export type SiteId = 'pit3' | 'pit7' | 'rompad'
export type DateRange = '7d' | '30d' | '90d'

export interface MockDataOptions {
  siteId: SiteId
  dateRange: DateRange
}

interface SiteConfig {
  name: string
  baseTargetTonnes: number
  oeeBase: number
  gradeBase: number
  costBase: number
}

// ── Site Configurations ──────────────────────────────────────────────────────

const SITE_CONFIG: Record<SiteId, SiteConfig> = {
  pit3: {
    name: 'Pit 3 — Southern Operations',
    baseTargetTonnes: 12000,
    oeeBase: 82,
    gradeBase: 62.1,
    costBase: 12.5,
  },
  pit7: {
    name: 'Pit 7 — Northern Expansion',
    baseTargetTonnes: 9500,
    oeeBase: 75,
    gradeBase: 61.5,
    costBase: 13.8,
  },
  rompad: {
    name: 'ROM Pad — Processing Plant',
    baseTargetTonnes: 15000,
    oeeBase: 88,
    gradeBase: 63.2,
    costBase: 11.2,
  },
}

const DAYS_MAP: Record<DateRange, number> = { '7d': 7, '30d': 30, '90d': 90 }

const SHIFT_TYPES: Array<'AM' | 'PM' | 'Night'> = ['AM', 'PM', 'Night']

const CREW_NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta']

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ── Shift Data Generator ─────────────────────────────────────────────────────

/**
 * Generate shift production data
 * - Tuesday of the most recent week has significant underperformance
 * - Night shifts average 8% lower than day shifts
 */
export function generateShiftData(opts: MockDataOptions): ShiftDataPoint[] {
  const config = SITE_CONFIG[opts.siteId]
  const days = DAYS_MAP[opts.dateRange]
  const seed = stringToSeed(`${opts.siteId}-shifts`)
  const random = seededRandom(seed)

  const points: ShiftDataPoint[] = []
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days + 1)

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + dayOffset)

    const dayOfWeek = currentDate.getDay()
    const isRecentTuesday = dayOfWeek === 2 && dayOffset >= days - 7 // Tuesday in last week

    for (let shiftIndex = 0; shiftIndex < 3; shiftIndex++) {
      const shiftType = SHIFT_TYPES[shiftIndex]
      const isNightShift = shiftType === 'Night'

      // Base variance: ±15% random
      let varianceMultiplier = 0.85 + random() * 0.30

      // Night shift penalty: average 8% lower
      if (isNightShift) {
        varianceMultiplier *= 0.92
      }

      // Tuesday anomaly: 28% below target (haul truck issue)
      if (isRecentTuesday && shiftType === 'AM') {
        varianceMultiplier = 0.72
      }

      const targetTonnes = config.baseTargetTonnes
      const actualTonnes = Math.round(targetTonnes * varianceMultiplier)

      const day = currentDate.getDate()
      const month = MONTHS[currentDate.getMonth()]
      const shiftLabel = `${day} ${month} ${shiftType}`

      const variance = ((actualTonnes - targetTonnes) / targetTonnes) * 100

      const crewIndex = (dayOffset + shiftIndex) % CREW_NAMES.length
      const equipmentCount = 6 + Math.floor(random() * 4) // 6-9 units

      points.push({
        id: `shift-${dayOffset}-${shiftIndex}`,
        date: new Date(currentDate),
        shiftType,
        shiftLabel,
        actualTonnes,
        targetTonnes,
        crewName: `${CREW_NAMES[crewIndex]} Crew`,
        equipmentCount,
        location: opts.siteId === 'pit3' ? 'Pit 3 South' : opts.siteId === 'pit7' ? 'Pit 7 North' : 'ROM Pad',
        variance: Math.round(variance * 10) / 10,
      })
    }
  }

  return points.sort((a, b) => a.date.getTime() - b.date.getTime())
}

// ── Equipment Data Generator ─────────────────────────────────────────────────

/**
 * Generate equipment utilisation data for 8 units
 * - D11-001 has hydraulic fault: hours 8-14 = UnplannedDown
 * - CAT793-002 has scheduled maintenance: hours 6-8 = Maintenance
 */
export function generateEquipmentData(opts: MockDataOptions): EquipmentUnit[] {
  const seed = stringToSeed(`${opts.siteId}-equipment`)
  const random = seededRandom(seed)

  const equipment: EquipmentUnit[] = []

  // Equipment definitions
  const units = [
    { id: 'D11-001', name: 'CAT D11 Dozer #1', type: 'Dozer' as const },
    { id: 'D11-002', name: 'CAT D11 Dozer #2', type: 'Dozer' as const },
    { id: 'D11-003', name: 'CAT D11 Dozer #3', type: 'Dozer' as const },
    { id: 'D11-004', name: 'CAT D11 Dozer #4', type: 'Dozer' as const },
    { id: 'CAT793-001', name: 'CAT 793 Haul Truck #1', type: 'Truck' as const },
    { id: 'CAT793-002', name: 'CAT 793 Haul Truck #2', type: 'Truck' as const },
    { id: 'CAT793-003', name: 'CAT 793 Haul Truck #3', type: 'Truck' as const },
    { id: 'CAT793-004', name: 'CAT 793 Haul Truck #4', type: 'Truck' as const },
  ]

  for (const unit of units) {
    const hourlyStatus: HourlyStatus[] = []
    let operatingHours = 0

    for (let hour = 0; hour < 24; hour++) {
      let status: EquipmentStatus = 'Operating'
      let reasonCode: string | undefined = undefined
      let duration = 1.0

      // D11-001 hydraulic fault: hours 8-14
      if (unit.id === 'D11-001' && hour >= 8 && hour < 14) {
        status = 'UnplannedDown'
        reasonCode = 'HYD-FAULT-007'
      }
      // CAT793-002 scheduled maintenance: hours 6-8
      else if (unit.id === 'CAT793-002' && hour >= 6 && hour < 8) {
        status = 'Maintenance'
        reasonCode = 'SCHED-PM-500H'
      }
      // Shift change standby (hours 6, 14, 22)
      else if (hour === 6 || hour === 14 || hour === 22) {
        status = 'Standby'
        duration = 0.5 + random() * 0.5
        if (random() > 0.5) {
          status = 'Operating'
        }
      }
      // Random standby periods
      else if (random() < 0.08) {
        status = 'Standby'
        duration = 0.5 + random() * 0.5
      }
      // Rare unplanned downtime
      else if (random() < 0.03) {
        status = 'UnplannedDown'
        duration = 0.5 + random() * 0.5
        reasonCode = `FAULT-${Math.floor(random() * 100).toString().padStart(3, '0')}`
      }

      if (status === 'Operating') {
        operatingHours += duration
      }

      hourlyStatus.push({
        hour,
        status,
        durationHours: Math.round(duration * 100) / 100,
        reasonCode,
      })
    }

    const oeePercent = Math.round((operatingHours / 24) * 100)

    equipment.push({
      id: unit.id,
      name: unit.name,
      type: unit.type,
      hourlyStatus,
      oeePercent,
    })
  }

  return equipment
}

// ── Safety KPI Generator ─────────────────────────────────────────────────────

/**
 * Generate safety KPIs with realistic WA mining industry values
 */
export function generateSafetyKPIs(opts: MockDataOptions): SafetyKPI[] {
  const seed = stringToSeed(`${opts.siteId}-safety`)
  const random = seededRandom(seed)

  const siteMultiplier = opts.siteId === 'pit3' ? 1.0 : opts.siteId === 'pit7' ? 1.1 : 0.9

  // Generate 12-month TRIFR trend (declining from 6.1 to 4.2)
  const trifrHistory: TrendPoint[] = []
  const baseMonth = new Date().getMonth()
  for (let i = 11; i >= 0; i--) {
    const monthIndex = (baseMonth - i + 12) % 12
    const monthName = MONTHS[monthIndex]
    const year = i > baseMonth ? 2025 : 2026
    const value = 6.1 - (11 - i) * 0.17 + (random() - 0.5) * 0.3
    trifrHistory.push({
      period: `${monthName} ${year}`,
      value: Math.round(value * 10) / 10,
    })
  }

  const calculateStatus = (
    current: number,
    target: number | undefined,
    isLowerBetter: boolean
  ): KPIStatus => {
    if (target === undefined) return 'neutral'
    if (isLowerBetter) {
      if (current <= target) return 'good'
      if (current <= target * 1.2) return 'warning'
      return 'bad'
    } else {
      if (current >= target) return 'good'
      if (current >= target * 0.8) return 'warning'
      return 'bad'
    }
  }

  const calculateTrend = (
    current: number,
    previous: number
  ): { direction: 'up' | 'down' | 'flat'; percent: number } => {
    const diff = current - previous
    const percent = previous !== 0 ? (diff / previous) * 100 : 0
    if (Math.abs(percent) < 1) return { direction: 'flat', percent: 0 }
    return {
      direction: diff > 0 ? 'up' : 'down',
      percent: Math.round(Math.abs(percent) * 10) / 10,
    }
  }

  const kpis: SafetyKPI[] = []

  // 1. TRIFR (Total Recordable Injury Frequency Rate)
  const trifrCurrent = 4.2 * siteMultiplier
  const trifrPrevious = 4.8 * siteMultiplier
  const trifrTrend = calculateTrend(trifrCurrent, trifrPrevious)
  kpis.push({
    id: 'trifr',
    name: 'trifr',
    displayName: 'TRIFR',
    currentValue: Math.round(trifrCurrent * 10) / 10,
    targetValue: 3.0,
    previousValue: Math.round(trifrPrevious * 10) / 10,
    trendHistory: trifrHistory,
    unit: '',
    isLeading: false,
    isLowerBetter: true,
    status: calculateStatus(trifrCurrent, 3.0, true),
    trendDirection: trifrTrend.direction,
    trendPercent: trifrTrend.percent,
  })

  // 2. Days Since Last LTI
  const ltiCurrent = 127 + Math.floor(random() * 20)
  const ltiPrevious = ltiCurrent - 30
  const ltiTrend = calculateTrend(ltiCurrent, ltiPrevious)
  kpis.push({
    id: 'lti-days',
    name: 'lti_days',
    displayName: 'Days Since Last LTI',
    currentValue: ltiCurrent,
    targetValue: 180,
    previousValue: ltiPrevious,
    trendHistory: [],
    unit: 'days',
    isLeading: false,
    isLowerBetter: false,
    status: calculateStatus(ltiCurrent, 180, false),
    trendDirection: ltiTrend.direction,
    trendPercent: ltiTrend.percent,
  })

  // 3. Near Miss Reports MTD
  const nearMissCurrent = 12 + Math.floor(random() * 5)
  const nearMissPrevious = 8
  const nearMissTrend = calculateTrend(nearMissCurrent, nearMissPrevious)
  kpis.push({
    id: 'near-miss',
    name: 'near_miss_reports',
    displayName: 'Near Miss Reports MTD',
    currentValue: nearMissCurrent,
    targetValue: 8,
    previousValue: nearMissPrevious,
    trendHistory: [],
    unit: 'reports',
    isLeading: true,
    isLowerBetter: false, // More reports = better safety culture
    status: 'good', // Above target is good
    trendDirection: nearMissTrend.direction,
    trendPercent: nearMissTrend.percent,
  })

  // 4. Safety Observations Completed
  const obsCurrent = 87 + Math.floor(random() * 10)
  const obsPrevious = 82
  const obsTrend = calculateTrend(obsCurrent, obsPrevious)
  kpis.push({
    id: 'safety-obs',
    name: 'safety_observations',
    displayName: 'Safety Observations Completed',
    currentValue: Math.min(obsCurrent, 100),
    targetValue: 100,
    previousValue: obsPrevious,
    trendHistory: [],
    unit: '%',
    isLeading: true,
    isLowerBetter: false,
    status: calculateStatus(obsCurrent, 100, false),
    trendDirection: obsTrend.direction,
    trendPercent: obsTrend.percent,
  })

  // 5. High Potential Incidents MTD
  const hpiCurrent = random() < 0.7 ? 1 : 0
  const hpiPrevious = 2
  const hpiTrend = calculateTrend(hpiCurrent, hpiPrevious)
  kpis.push({
    id: 'hpi',
    name: 'high_potential_incidents',
    displayName: 'High Potential Incidents MTD',
    currentValue: hpiCurrent,
    targetValue: 0,
    previousValue: hpiPrevious,
    trendHistory: [],
    unit: 'incidents',
    isLeading: false,
    isLowerBetter: true,
    status: hpiCurrent === 0 ? 'good' : 'bad',
    trendDirection: hpiTrend.direction,
    trendPercent: hpiTrend.percent,
  })

  // 6. Training Completion Rate
  const trainingCurrent = 94 + Math.floor(random() * 6)
  const trainingPrevious = 91
  const trainingTrend = calculateTrend(trainingCurrent, trainingPrevious)
  kpis.push({
    id: 'training',
    name: 'training_completion',
    displayName: 'Training Completion Rate',
    currentValue: Math.min(trainingCurrent, 100),
    targetValue: 90,
    previousValue: trainingPrevious,
    trendHistory: [],
    unit: '%',
    isLeading: true,
    isLowerBetter: false,
    status: calculateStatus(trainingCurrent, 90, false),
    trendDirection: trainingTrend.direction,
    trendPercent: trainingTrend.percent,
  })

  return kpis
}

// ── Grade Stages Generator ───────────────────────────────────────────────────

/**
 * Generate ore grade waterfall stages
 */
export function generateGradeStages(opts: MockDataOptions): GradeStage[] {
  const config = SITE_CONFIG[opts.siteId]
  const seed = stringToSeed(`${opts.siteId}-grades`)
  const random = seededRandom(seed)

  const baseGrade = config.gradeBase
  const variance = () => (random() - 0.5) * 0.4

  const stages: GradeStage[] = [
    {
      id: 'stage-1',
      name: 'Bench Sample',
      order: 1,
      actualGrade: baseGrade + variance(),
      targetGrade: baseGrade,
      material: 'High Grade Ore',
      variance: undefined,
      deltaFromPrevious: undefined,
    },
    {
      id: 'stage-2',
      name: 'ROM Stockpile',
      order: 2,
      actualGrade: baseGrade - 0.3 + variance(),
      targetGrade: baseGrade,
      material: 'Blended ROM',
      variance: undefined,
      deltaFromPrevious: undefined,
    },
    {
      id: 'stage-3',
      name: 'Mill Feed',
      order: 3,
      actualGrade: baseGrade - 0.6 + variance(),
      targetGrade: baseGrade - 0.3,
      material: 'Crushed Ore',
      variance: undefined,
      deltaFromPrevious: undefined,
    },
    {
      id: 'stage-4',
      name: 'Concentrate',
      order: 4,
      actualGrade: baseGrade + 2.1 + variance(),
      targetGrade: baseGrade + 2.0,
      material: 'Iron Concentrate',
      variance: undefined,
      deltaFromPrevious: undefined,
    },
    {
      id: 'stage-5',
      name: 'Final Product',
      order: 5,
      actualGrade: baseGrade + 1.7 + variance(),
      targetGrade: baseGrade + 2.0,
      material: 'Lump/Fines',
      variance: undefined,
      deltaFromPrevious: undefined,
    },
  ]

  // Round grades and calculate variances
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i]
    stage.actualGrade = Math.round(stage.actualGrade * 100) / 100

    if (stage.targetGrade !== undefined) {
      stage.variance =
        Math.round(((stage.actualGrade - stage.targetGrade) / stage.targetGrade) * 10000) / 100
    }

    if (i > 0) {
      stage.deltaFromPrevious =
        Math.round((stage.actualGrade - stages[i - 1].actualGrade) * 100) / 100
    }
  }

  return stages
}

// ── Cost Data Generator ──────────────────────────────────────────────────────

/**
 * Generate cost per tonne data with anomaly detection
 * - April has wet season anomaly (21% over budget)
 */
export function generateCostData(opts: MockDataOptions): CostDataPoint[] {
  const config = SITE_CONFIG[opts.siteId]
  const days = DAYS_MAP[opts.dateRange]
  const monthCount = Math.ceil(days / 30)
  const seed = stringToSeed(`${opts.siteId}-cost`)
  const random = seededRandom(seed)

  const data: CostDataPoint[] = []
  const currentMonth = new Date().getMonth()

  for (let i = monthCount - 1; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12
    const monthName = MONTHS[monthIndex]
    const year = i > currentMonth ? 2025 : 2026
    const period = `${monthName} ${year}`

    // Base cost with ±8% variance
    let costPerTonne = config.costBase * (0.92 + random() * 0.16)

    // Budget is base × 1.04
    const budgetCostPerTonne = config.costBase * 1.04

    // April anomaly: 21% over budget (wet season)
    const isApril = monthName === 'Apr'
    let isAnomaly = false
    let anomalyReason: string | undefined = undefined

    if (isApril) {
      costPerTonne = budgetCostPerTonne * 1.21
      isAnomaly = true
      anomalyReason = 'Wet season delays — reduced tonnes by 18%, fixed costs unchanged'
    } else if (costPerTonne > budgetCostPerTonne * 1.15) {
      isAnomaly = true
      anomalyReason = 'Higher than expected maintenance costs'
    }

    costPerTonne = Math.round(costPerTonne * 100) / 100

    // Cost categories (sum to costPerTonne)
    const labourPct = 0.42 + random() * 0.04
    const fuelPct = 0.24 + random() * 0.04
    const maintenancePct = 0.15 + random() * 0.04
    const otherPct = 1 - labourPct - fuelPct - maintenancePct

    const categories: CostCategory[] = [
      { name: 'Labour', amount: Math.round(costPerTonne * labourPct * 100) / 100, colour: COST_CATEGORY_COLOURS.Labour },
      { name: 'Fuel', amount: Math.round(costPerTonne * fuelPct * 100) / 100, colour: COST_CATEGORY_COLOURS.Fuel },
      { name: 'Maintenance', amount: Math.round(costPerTonne * maintenancePct * 100) / 100, colour: COST_CATEGORY_COLOURS.Maintenance },
      { name: 'Other', amount: Math.round(costPerTonne * otherPct * 100) / 100, colour: COST_CATEGORY_COLOURS.Other },
    ]

    const tonnesMoved = Math.round(config.baseTargetTonnes * 30 * (0.85 + random() * 0.2))
    const actualAmount = Math.round(costPerTonne * tonnesMoved)
    const budgetAmount = Math.round(budgetCostPerTonne * tonnesMoved)

    data.push({
      period,
      month: period,
      actualAmount,
      budgetAmount,
      costPerTonne,
      budgetCostPerTonne,
      tonnesMoved,
      isAnomaly,
      anomalyReason,
      categories,
      movingAverage: undefined, // Will calculate below
    })
  }

  // Calculate 3-month moving average
  for (let i = 0; i < data.length; i++) {
    if (i >= 2) {
      const avg = (data[i].costPerTonne + data[i - 1].costPerTonne + data[i - 2].costPerTonne) / 3
      data[i].movingAverage = Math.round(avg * 100) / 100
    } else if (i === 1) {
      const avg = (data[i].costPerTonne + data[i - 1].costPerTonne) / 2
      data[i].movingAverage = Math.round(avg * 100) / 100
    } else {
      data[i].movingAverage = data[i].costPerTonne
    }
  }

  return data
}

// ── Operational Summary ──────────────────────────────────────────────────────

export interface OperationalSummary {
  site: string
  dateRange: string
  totalTonnes: number
  avgOEE: number
  activeIncidents: number
  costPerTonne: number
  tonneTrend: number
  oeeTrend: number
  incidentTrend: number
  costTrend: number
}

/**
 * Generate operational summary from other data
 */
export function generateSummary(opts: MockDataOptions): OperationalSummary {
  const config = SITE_CONFIG[opts.siteId]
  const shifts = generateShiftData(opts)
  const equipment = generateEquipmentData(opts)
  const safetyKPIs = generateSafetyKPIs(opts)
  const costData = generateCostData(opts)

  const totalTonnes = shifts.reduce((sum, s) => sum + s.actualTonnes, 0)
  const avgOEE = Math.round(equipment.reduce((sum, e) => sum + e.oeePercent, 0) / equipment.length)
  const hpiKpi = safetyKPIs.find(k => k.name === 'high_potential_incidents')
  const activeIncidents = hpiKpi?.currentValue ?? 0
  const latestCost = costData.length > 0 ? costData[costData.length - 1].costPerTonne : config.costBase

  // Calculate trends (simulated vs previous period)
  const seed = stringToSeed(`${opts.siteId}-trends`)
  const random = seededRandom(seed)

  return {
    site: config.name,
    dateRange: opts.dateRange,
    totalTonnes,
    avgOEE,
    activeIncidents,
    costPerTonne: Math.round(latestCost * 100) / 100,
    tonneTrend: Math.round((random() - 0.3) * 20 * 10) / 10, // -6% to +14%
    oeeTrend: Math.round((random() - 0.5) * 10 * 10) / 10, // -5% to +5%
    incidentTrend: Math.round((random() - 0.7) * -40), // Usually improving
    costTrend: Math.round((random() - 0.4) * 10 * 10) / 10, // -4% to +6%
  }
}

// ── All Data Generator ───────────────────────────────────────────────────────

export interface AllMockData {
  shifts: ShiftDataPoint[]
  equipment: EquipmentUnit[]
  safetyKPIs: SafetyKPI[]
  gradeStages: GradeStage[]
  costData: CostDataPoint[]
  summary: OperationalSummary
}

/**
 * Generate all mock data in one call
 */
export function generateAllData(opts: MockDataOptions): AllMockData {
  return {
    shifts: generateShiftData(opts),
    equipment: generateEquipmentData(opts),
    safetyKPIs: generateSafetyKPIs(opts),
    gradeStages: generateGradeStages(opts),
    costData: generateCostData(opts),
    summary: generateSummary(opts),
  }
}

// ── Exports ──────────────────────────────────────────────────────────────────

export { SITE_CONFIG, DAYS_MAP }
