// Safety KPI - Settings

import powerbi from 'powerbi-visuals-api'
import DataView = powerbi.DataView

export class GeneralSettings {
  public columns: number = 2
  public showSparkline: boolean = true
  public showTrend: boolean = true
}

export class ColorSettings {
  public good: string = '#107C10'
  public warning: string = '#FFB900'
  public bad: string = '#D13438'
}

export class VisualSettings {
  public general: GeneralSettings = new GeneralSettings()
  public colors: ColorSettings = new ColorSettings()

  public static parse(_dataView: DataView): VisualSettings {
    return new VisualSettings()
  }
}
