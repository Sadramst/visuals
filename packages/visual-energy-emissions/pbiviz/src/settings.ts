import powerbi from 'powerbi-visuals-api'
import DataView = powerbi.DataView

export class EmissionsGeneralSettings {
  public showIntensity: boolean = true
  public showNGER: boolean = true
}

export class VisualSettings {
  public general: EmissionsGeneralSettings = new EmissionsGeneralSettings()
  public static parse(_dataView: DataView): VisualSettings { return new VisualSettings() }
}
