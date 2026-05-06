// Visual Settings for Mine Production Gantt

import powerbi from 'powerbi-visuals-api'
import DataView = powerbi.DataView

/**
 * General settings
 */
export class GeneralSettings {
  public showTarget: boolean = true
  public showLegend: boolean = true
}

/**
 * Colour settings
 */
export class ColourSettings {
  public aboveTarget: string = '#00B050' // Green
  public nearTarget: string = '#ED7D31' // Amber
  public belowTarget: string = '#C00000' // Red
  public targetLine: string = '#1F3864' // Navy
}

/**
 * Label settings
 */
export class LabelSettings {
  public showDataLabels: boolean = true
  public showVariance: boolean = true
  public fontSize: number = 11
}

/**
 * Axis settings
 */
export class AxisSettings {
  public showXAxis: boolean = true
  public showYAxis: boolean = true
  public yLabel: string = 'Tonnes'
  public showGridLines: boolean = true
}

/**
 * All visual settings combined
 */
export class VisualSettings {
  public general: GeneralSettings = new GeneralSettings()
  public colours: ColourSettings = new ColourSettings()
  public labels: LabelSettings = new LabelSettings()
  public axis: AxisSettings = new AxisSettings()

  public static parse(_dataView: DataView): VisualSettings {
    return new VisualSettings()
  }
}
