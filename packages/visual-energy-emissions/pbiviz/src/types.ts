export interface EmissionDataPoint {
  period: string
  source: string
  scope: number          // 1 | 2 | 3
  siteName: string
  emissionsTCO2: number  // tonnes CO₂ equivalent
  energyGJ: number       // gigajoules
  intensityRate: number  // kgCO₂ per tonne ore
  ngerTarget: number
  renewablePct: number
}

export interface ScopeSummary {
  scope: number
  totalTCO2: number
  pctOfTotal: number
  colour: string
}

export interface EmissionsViewModel {
  dataPoints: EmissionDataPoint[]
  scopeSummaries: ScopeSummary[]
  totalEmissions: number
  avgIntensity: number
  renewableShare: number
  ngerCompliant: boolean
  settings: EmissionsSettings
}

export interface EmissionsSettings {
  showIntensity: boolean
  showNGER: boolean
}
