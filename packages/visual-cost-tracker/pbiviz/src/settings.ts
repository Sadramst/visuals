// Cost Tracker - Settings

import powerbi from 'powerbi-visuals-api'
import DataView = powerbi.DataView

export class GeneralSettings {
  public showCumulative: boolean = true
  public showAnomalies: boolean = true
  public anomalyThreshold: number = 15
}

export class ColorSettings {
  public actual: string = '#0078D4'
  public budget: string = '#FFB900'
  public overBudget: string = '#D13438'
  public underBudget: string = '#107C10'
}

export class VisualSettings {
  public general: GeneralSettings = new GeneralSettings()
  public colors: ColorSettings = new ColorSettings()

  public static parse(_dataView: DataView): VisualSettings {
    return new VisualSettings()
  }
}
