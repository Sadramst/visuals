// Cost Tracker - Type Definitions

export interface CostDataPoint {
  month: string
  actualAmount: number
  budgetAmount?: number
  variance?: number
  variancePercent?: number
  costPerTonne?: number
  isAnomaly: boolean
}

export interface VisualViewModel {
  dataPoints: CostDataPoint[]
  totals: {
    actualTotal: number
    budgetTotal: number
    varianceTotal: number
    avgCostPerTonne: number
  }
  settings: VisualSettings
  isValid: boolean
}

export interface VisualSettings {
  general: {
    showCumulative: boolean
    showAnomalies: boolean
    anomalyThreshold: number
  }
  colors: {
    actual: string
    budget: string
    overBudget: string
    underBudget: string
  }
}
