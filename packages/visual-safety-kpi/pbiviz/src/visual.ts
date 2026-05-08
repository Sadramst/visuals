// Safety KPI - Power BI Visual Implementation

import powerbi from 'powerbi-visuals-api'
import * as d3 from 'd3'
import { VisualSettings } from './settings'
import { SafetyKPIData, KPIStatus, VisualViewModel } from './types'

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions
import IVisual = powerbi.extensibility.visual.IVisual
import IVisualHost = powerbi.extensibility.visual.IVisualHost
import DataView = powerbi.DataView

export class SafetyKPIVisual implements IVisual {
  private host: IVisualHost
  private container: d3.Selection<HTMLDivElement, unknown, null, undefined>
  private settings: VisualSettings

  constructor(options: VisualConstructorOptions) {
    this.host = options.host
    this.settings = new VisualSettings()

    this.container = d3.select(options.element)
      .append('div')
      .classed('safety-kpi-container', true)
      .style('width', '100%')
      .style('height', '100%')
      .style('overflow', 'auto')
      .style('font-family', 'Segoe UI, sans-serif')
  }

  public update(options: VisualUpdateOptions): void {
    if (!options.dataViews?.[0]) return

    const dataView = options.dataViews[0]
    this.settings = VisualSettings.parse(dataView)

    const viewModel = this.createViewModel(dataView)
    if (!viewModel.isValid) return

    this.render(viewModel, options.viewport.width, options.viewport.height)
  }

  private createViewModel(dataView: DataView): VisualViewModel {
    const defaultModel: VisualViewModel = {
      kpis: [],
      settings: {
        general: {
          columns: this.settings.general.columns,
          showSparkline: this.settings.general.showSparkline
        },
        colors: {
          good: this.settings.colors.good,
          warning: this.settings.colors.warning,
          bad: this.settings.colors.bad
        }
      },
      isValid: false
    }

    const categorical = dataView.categorical
    if (!categorical?.categories?.[0]) return defaultModel

    const kpiCategory = categorical.categories[0]
    const unitCategory = categorical.categories?.find(c => c.source.roles?.['unit'])
    const currentValues = categorical.values?.find(v => v.source.roles?.['currentValue'])
    const targetValues = categorical.values?.find(v => v.source.roles?.['targetValue'])
    const previousValues = categorical.values?.find(v => v.source.roles?.['previousValue'])
    const isLeadingValues = categorical.values?.find(v => v.source.roles?.['isLeading'])

    if (!currentValues) return defaultModel

    const kpis: SafetyKPIData[] = []
    
    for (let i = 0; i < kpiCategory.values.length; i++) {
      const name = String(kpiCategory.values[i])
      const currentValue = Number(currentValues.values[i]) || 0
      const targetValue = targetValues ? Number(targetValues.values[i]) : undefined
      const previousValue = previousValues ? Number(previousValues.values[i]) : undefined
      const isLeadingRaw = isLeadingValues ? isLeadingValues.values[i] : false
      const isLeading = isLeadingRaw === 1 || isLeadingRaw === true || isLeadingRaw === '1' || isLeadingRaw === 'true'
      const unit = unitCategory ? String(unitCategory.values[i] || '') : ''

      // Calculate status based on target
      let status: KPIStatus = 'good'
      if (targetValue !== undefined) {
        const variance = ((currentValue - targetValue) / targetValue) * 100
        if (Math.abs(variance) <= 5) status = 'good'
        else if (Math.abs(variance) <= 15) status = 'warning'
        else status = 'bad'
      }

      // Calculate trend
      let trendDirection: 'up' | 'down' | 'flat' = 'flat'
      let trendPercent = 0
      if (previousValue !== undefined && previousValue !== 0) {
        trendPercent = ((currentValue - previousValue) / previousValue) * 100
        if (trendPercent > 1) trendDirection = 'up'
        else if (trendPercent < -1) trendDirection = 'down'
      }

      kpis.push({
        id: `kpi-${i}`,
        name,
        currentValue,
        targetValue,
        previousValue,
        isLeading,
        unit: '',
        status,
        trendDirection,
        trendPercent
      })
    }

    return { ...defaultModel, kpis, isValid: kpis.length > 0 }
  }

  private render(viewModel: VisualViewModel, width: number, height: number): void {
    this.container.selectAll('*').remove()

    const columns = viewModel.settings.general.columns
    const cardWidth = Math.floor(width / columns) - 16
    const cardHeight = Math.min(120, height / Math.ceil(viewModel.kpis.length / columns) - 16)

    const grid = this.container
      .append('div')
      .style('display', 'grid')
      .style('grid-template-columns', `repeat(${columns}, 1fr)`)
      .style('gap', '12px')
      .style('padding', '8px')

    viewModel.kpis.forEach(kpi => {
      const statusColor = viewModel.settings.colors[kpi.status]
      
      const card = grid.append('div')
        .style('background', '#fff')
        .style('border-radius', '8px')
        .style('border-left', `4px solid ${statusColor}`)
        .style('box-shadow', '0 1px 3px rgba(0,0,0,0.1)')
        .style('padding', '12px')
        .style('min-height', `${cardHeight}px`)

      // Badge
      card.append('span')
        .style('font-size', '10px')
        .style('padding', '2px 8px')
        .style('border-radius', '10px')
        .style('background', kpi.isLeading ? '#E8F4FD' : '#F3F2F1')
        .style('color', kpi.isLeading ? '#0078D4' : '#605E5C')
        .text(kpi.isLeading ? 'LEADING' : 'LAGGING')

      // Name
      card.append('p')
        .style('margin', '8px 0 4px')
        .style('font-size', '11px')
        .style('color', '#605E5C')
        .style('text-transform', 'uppercase')
        .text(kpi.name)

      // Value
      card.append('div')
        .style('font-size', '28px')
        .style('font-weight', '600')
        .style('color', statusColor)
        .text(kpi.currentValue.toFixed(1))

      // Trend
      if (kpi.previousValue !== undefined) {
        const trendColor = kpi.trendDirection === 'up' ? '#107C10' : 
                          kpi.trendDirection === 'down' ? '#D13438' : '#605E5C'
        const trendIcon = kpi.trendDirection === 'up' ? '▲' : 
                         kpi.trendDirection === 'down' ? '▼' : '▶'
        
        card.append('div')
          .style('margin-top', '4px')
          .style('font-size', '12px')
          .style('color', trendColor)
          .text(`${trendIcon} ${Math.abs(kpi.trendPercent).toFixed(1)}%`)
      }

      // Target
      if (kpi.targetValue !== undefined) {
        card.append('p')
          .style('margin-top', '4px')
          .style('font-size', '11px')
          .style('color', '#8A8886')
          .text(`Target: ${kpi.targetValue}`)
      }
    })
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return { cards: [] }
  }
}
