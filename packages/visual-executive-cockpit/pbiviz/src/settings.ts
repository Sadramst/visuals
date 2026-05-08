import powerbi from 'powerbi-visuals-api'
import DataView = powerbi.DataView

export class CockpitGeneralSettings {
  public showMap: boolean = true
  public showRisks: boolean = true
  public showTrend: boolean = true
}

export class VisualSettings {
  public general: CockpitGeneralSettings = new CockpitGeneralSettings()
  public static parse(_dataView: DataView): VisualSettings { return new VisualSettings() }
}
