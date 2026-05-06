// Equipment Heatmap - Settings

import powerbi from 'powerbi-visuals-api'
import DataView = powerbi.DataView

export class GeneralSettings {
  public cellSize: number = 30
  public showLabels: boolean = true
  public showLegend: boolean = true
  public showTooltips: boolean = true
}

export class ColorSettings {
  public operating: string = '#107C10'
  public idle: string = '#FFB900'
  public maintenance: string = '#0078D4'
  public breakdown: string = '#D13438'
  public standby: string = '#8A8886'
}

export class LabelSettings {
  public fontSize: number = 11
  public fontFamily: string = 'Segoe UI'
  public fontColor: string = '#333333'
  public showHourLabels: boolean = true
  public showEquipmentLabels: boolean = true
}

export class VisualSettings {
  public general: GeneralSettings = new GeneralSettings()
  public colors: ColorSettings = new ColorSettings()
  public labels: LabelSettings = new LabelSettings()

  public static parse(_dataView: DataView): VisualSettings {
    return new VisualSettings()
  }
}
