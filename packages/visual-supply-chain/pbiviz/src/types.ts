export interface HaulageDataPoint {
  date: string
  routeName: string
  truckId: string
  siteName: string
  cycleTimeMin: number
  payloadT: number
  targetPayload: number
  queueTimeMin: number
  loadTimeMin: number
  haulTimeMin: number
  dumpTimeMin: number
  returnTimeMin: number
  trips: number
}

export interface CycleBreakdown {
  segment: string       // Queue | Load | Haul | Dump | Return
  avgMinutes: number
  colour: string
}

export interface RouteSummary {
  routeName: string
  avgCycleTime: number
  avgPayload: number
  payloadEfficiency: number  // actual / target %
  totalTrips: number
  avgQueueTime: number
}

export interface HaulageViewModel {
  dataPoints: HaulageDataPoint[]
  routeSummaries: RouteSummary[]
  cycleBreakdown: CycleBreakdown[]
  overallCycleTime: number
  overallPayloadEff: number
  totalTrips: number
  avgQueueTime: number
  settings: HaulageSettings
}

export interface HaulageSettings {
  showCycleBreakdown: boolean
  showPayloadDist: boolean
}
