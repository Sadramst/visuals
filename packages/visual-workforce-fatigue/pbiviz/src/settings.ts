import powerbi from 'powerbi-visuals-api'
import DataView = powerbi.DataView

export class WorkforceGeneralSettings {
  public showFatigueHeatmap: boolean = true
  public fatigueThreshold: number = 70
}

export class VisualSettings {
  public general: WorkforceGeneralSettings = new WorkforceGeneralSettings()
  public static parse(_dataView: DataView): VisualSettings { return new VisualSettings() }
}
