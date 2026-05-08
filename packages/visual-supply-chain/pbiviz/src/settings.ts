import powerbi from 'powerbi-visuals-api'
import DataView = powerbi.DataView

export class HaulageGeneralSettings {
  public showCycleBreakdown: boolean = true
  public showPayloadDist: boolean = true
}

export class VisualSettings {
  public general: HaulageGeneralSettings = new HaulageGeneralSettings()
  public static parse(_dataView: DataView): VisualSettings { return new VisualSettings() }
}
