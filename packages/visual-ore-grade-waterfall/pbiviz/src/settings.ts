// Ore Grade Waterfall - Settings

import powerbi from 'powerbi-visuals-api'
import DataView = powerbi.DataView

export class GeneralSettings {
  public showTarget: boolean = true
  public showVariance: boolean = true
  public unit: string = 'Fe%'
}

export class ColorSettings {
  public positive: string = '#0078D4'
  public negative: string = '#D13438'
  public neutral: string = '#1B365D'
  public target: string = '#FFB900'
}

export class VisualSettings {
  public general: GeneralSettings = new GeneralSettings()
  public colors: ColorSettings = new ColorSettings()

  public static parse(_dataView: DataView): VisualSettings {
    return new VisualSettings()
  }
}
