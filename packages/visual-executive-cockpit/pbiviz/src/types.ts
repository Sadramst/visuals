export interface CockpitKPI {
  name: string
  currentValue: number
  targetValue: number
  previousValue: number
  unit: string
  variancePct: number
  vsLYPct: number
  status: 'good' | 'warning' | 'critical'
}

export interface SiteMarker {
  name: string
  latitude: number
  longitude: number
  productionValue: number
  status: 'normal' | 'warning' | 'critical'
}

export interface RiskAlert {
  severity: 'high' | 'medium' | 'low'
  title: string
  detail: string
  module: string
}

export interface CockpitViewModel {
  kpis: CockpitKPI[]
  sites: SiteMarker[]
  risks: RiskAlert[]
  lastRefresh: Date
  settings: CockpitSettings
}

export interface CockpitSettings {
  showMap: boolean
  showRisks: boolean
  showTrend: boolean
}
