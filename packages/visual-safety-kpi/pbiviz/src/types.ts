// Safety KPI - Type Definitions

export interface SafetyKPIData {
  id: string
  name: string
  currentValue: number
  targetValue?: number
  previousValue?: number
  isLeading: boolean
  unit: string
  status: KPIStatus
  trendDirection: 'up' | 'down' | 'flat'
  trendPercent: number
}

export type KPIStatus = 'good' | 'warning' | 'bad'

export interface VisualViewModel {
  kpis: SafetyKPIData[]
  settings: VisualSettings
  isValid: boolean
}

export interface VisualSettings {
  general: {
    columns: number
    showSparkline: boolean
  }
  colors: {
    good: string
    warning: string
    bad: string
  }
}
