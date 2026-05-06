// Internal type definitions for Mine Production Gantt Visual

import powerbi from 'powerbi-visuals-api'
import ISelectionId = powerbi.visuals.ISelectionId

/**
 * Parsed shift data point for rendering
 */
export interface ParsedShiftDataPoint {
  id: string
  date: Date
  shiftType: 'AM' | 'PM' | 'Night'
  shiftLabel: string
  actualTonnes: number
  targetTonnes: number | undefined
  crewName: string | undefined
  equipmentCount: number | undefined
  location: string | undefined
  variance: number | undefined
  colour: string
  selectionId: ISelectionId
}

/**
 * Parsed data from DataView
 */
export interface ParsedData {
  points: ParsedShiftDataPoint[]
  hasTarget: boolean
  maxTonnes: number
  avgTarget: number | undefined
}

/**
 * Visual margins
 */
export interface Margins {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Bar colour classification
 */
export type BarColourType = 'above' | 'near' | 'below' | 'neutral'
