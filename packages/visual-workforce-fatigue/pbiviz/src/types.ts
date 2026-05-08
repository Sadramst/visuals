export interface RosterDataPoint {
  date: string
  crewName: string
  shiftType: string    // 'Day' | 'Night' | 'Off' | 'Travel'
  siteName: string
  headcount: number
  hoursWorked: number
  fatigueScore: number  // 0–100, higher = more fatigued
  absentPct: number
  utilPct: number
}

export interface CrewSummary {
  crewName: string
  avgFatigue: number
  avgUtil: number
  totalHours: number
  avgAbsent: number
  status: 'normal' | 'warning' | 'critical'
}

export interface FatigueHeatmapCell {
  date: string
  crew: string
  score: number
}

export interface WorkforceViewModel {
  dataPoints: RosterDataPoint[]
  crewSummaries: CrewSummary[]
  heatmapCells: FatigueHeatmapCell[]
  overallFatigue: number
  overallUtil: number
  totalHeadcount: number
  settings: WorkforceSettings
}

export interface WorkforceSettings {
  showFatigueHeatmap: boolean
  fatigueThreshold: number
}
