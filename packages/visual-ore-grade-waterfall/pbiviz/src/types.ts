// Ore Grade Waterfall - Type Definitions

export interface GradeStageData {
  id: string
  name: string
  order: number
  actualGrade: number
  targetGrade?: number
  variance?: number
  deltaFromPrevious?: number
  material?: string
}

export interface VisualViewModel {
  stages: GradeStageData[]
  settings: VisualSettings
  isValid: boolean
}

export interface VisualSettings {
  general: {
    showTarget: boolean
    showVariance: boolean
    unit: string
  }
  colors: {
    positive: string
    negative: string
    neutral: string
  }
}
