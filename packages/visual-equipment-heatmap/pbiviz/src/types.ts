// Equipment Heatmap - Type Definitions

export interface EquipmentDataPoint {
  equipmentId: string
  equipmentName: string
  hour: number
  status: EquipmentStatus
  oee: number
  tooltipData?: TooltipData
}

export type EquipmentStatus = 'operating' | 'idle' | 'maintenance' | 'breakdown' | 'standby'

export interface TooltipData {
  equipmentId: string
  equipmentName: string
  hour: number
  status: EquipmentStatus
  oee: number
  details?: string
}

export interface VisualViewModel {
  equipment: EquipmentRow[]
  hours: number[]
  settings: VisualSettings
  isValid: boolean
}

export interface EquipmentRow {
  id: string
  name: string
  cells: CellData[]
}

export interface CellData {
  hour: number
  status: EquipmentStatus
  oee: number
  color: string
}

export interface VisualSettings {
  general: {
    cellSize: number
    showLabels: boolean
    showLegend: boolean
  }
  colors: {
    operating: string
    idle: string
    maintenance: string
    breakdown: string
    standby: string
  }
}
