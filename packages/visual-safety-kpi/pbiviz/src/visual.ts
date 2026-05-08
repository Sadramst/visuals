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

    // Enhanced header with gradient
    const headerDiv = d3.select(options.element)
      .append('div')
      .classed('safety-kpi-header', true)
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('padding', '10px 16px')
      .style('background', 'linear-gradient(90deg, #0A2540 0%, #1a3a5c 100%)')
      .style('color', '#FFFFFF')
      .style('gap', '12px')
      .style('min-height', '48px')

    // Icon box
    headerDiv.append('div')
      .style('width', '32px').style('height', '32px')
      .style('border-radius', '8px')
      .style('background', 'linear-gradient(135deg, #00D4FF 0%, #7B61FF 100%)')
      .style('display', 'flex').style('align-items', 'center').style('justify-content', 'center')
      .style('font-size', '16px').style('flex-shrink', '0')
      .text('⚠')

    const titleBlock = headerDiv.append('div')
    titleBlock.append('div')
      .style('font-size', '14px').style('font-weight', '800').style('letter-spacing', '0.5px')
      .text('APPILICO')
    titleBlock.append('div')
      .style('font-size', '10px').style('color', '#00D4FF').style('letter-spacing', '2px')
      .text('SAFETY PERFORMANCE')

    this.container = d3.select(options.element)
      .append('div')
      .classed('safety-kpi-container', true)
      .style('width', '100%')
      .style('height', 'calc(100% - 48px)')
      .style('overflow', 'auto')
      .style('font-family', 'Segoe UI, sans-serif')
      .style('background', '#f5f5f5')
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

    // Summary bar
    const summaryBar = this.container.append('div')
      .style('display', 'flex').style('gap', '8px').style('padding', '10px 12px')
      .style('background', '#FFFFFF').style('border-bottom', '1px solid #e0e0e0')

    const goodCount = viewModel.kpis.filter(k => k.status === 'good').length
    const warningCount = viewModel.kpis.filter(k => k.status === 'warning').length
    const badCount = viewModel.kpis.filter(k => k.status === 'bad').length

    const summaryItems = [
      { label: 'ON TRACK', count: goodCount, color: viewModel.settings.colors.good },
      { label: 'AT RISK', count: warningCount, color: viewModel.settings.colors.warning },
      { label: 'CRITICAL', count: badCount, color: viewModel.settings.colors.bad },
    ]

    summaryItems.forEach(item => {
      const pill = summaryBar.append('div')
        .style('display', 'flex').style('align-items', 'center').style('gap', '6px')
        .style('padding', '4px 12px').style('border-radius', '16px')
        .style('background', `${item.color}15`).style('font-size', '11px')

      pill.append('div')
        .style('width', '8px').style('height', '8px').style('border-radius', '50%')
        .style('background', item.color)
      pill.append('span').style('font-weight', '700').style('color', item.color).text(`${item.count}`)
      pill.append('span').style('color', '#5A6978').text(item.label)
    })

    // Severity strip
    const stripContainer = this.container.append('div')
      .style('display', 'flex').style('height', '4px')

    const total = viewModel.kpis.length || 1
    const goodPct = (goodCount / total) * 100
    const warnPct = (warningCount / total) * 100
    const badPct = (badCount / total) * 100

    stripContainer.append('div').style('width', `${goodPct}%`).style('background', viewModel.settings.colors.good)
    stripContainer.append('div').style('width', `${warnPct}%`).style('background', viewModel.settings.colors.warning)
    stripContainer.append('div').style('width', `${badPct}%`).style('background', viewModel.settings.colors.bad)

    // Card grid
    const columns = viewModel.settings.general.columns

    const grid = this.container
      .append('div')
      .style('display', 'grid')
      .style('grid-template-columns', `repeat(${columns}, 1fr)`)
      .style('gap', '12px')
      .style('padding', '12px')

    viewModel.kpis.forEach(kpi => {
      const statusColor = viewModel.settings.colors[kpi.status]
      
      const card = grid.append('div')
        .style('background', '#FFFFFF')
        .style('border-radius', '10px')
        .style('border-left', `4px solid ${statusColor}`)
        .style('box-shadow', '0 2px 8px rgba(0,0,0,0.06)')
        .style('padding', '14px')
        .style('position', 'relative')
        .style('overflow', 'hidden')
        .style('transition', 'box-shadow 0.2s')

      // Status glow at top
      card.append('div')
        .style('position', 'absolute').style('top', '0').style('left', '0').style('right', '0')
        .style('height', '2px').style('background', statusColor)

      // Header row: badge + trend
      const headerRow = card.append('div')
        .style('display', 'flex').style('justify-content', 'space-between').style('align-items', 'center')

      headerRow.append('span')
        .style('font-size', '9px').style('font-weight', '700')
        .style('padding', '2px 8px').style('border-radius', '10px')
        .style('background', kpi.isLeading ? '#E8F4FD' : '#F3F2F1')
        .style('color', kpi.isLeading ? '#0078D4' : '#605E5C')
        .style('text-transform', 'uppercase').style('letter-spacing', '0.5px')
        .text(kpi.isLeading ? 'LEADING' : 'LAGGING')

      // Trend badge
      if (kpi.previousValue !== undefined) {
        const trendColor = kpi.trendDirection === 'up' ? '#107C10' : 
                          kpi.trendDirection === 'down' ? '#D13438' : '#605E5C'
        const trendIcon = kpi.trendDirection === 'up' ? '↑' : 
                         kpi.trendDirection === 'down' ? '↓' : '→'
        
        headerRow.append('span')
          .style('font-size', '11px').style('font-weight', '700')
          .style('color', trendColor)
          .text(`${trendIcon} ${Math.abs(kpi.trendPercent).toFixed(1)}%`)
      }

      // Name
      card.append('div')
        .style('margin', '8px 0 4px')
        .style('font-size', '10px').style('font-weight', '600')
        .style('color', '#5A6978')
        .style('text-transform', 'uppercase').style('letter-spacing', '0.5px')
        .text(kpi.name)

      // Value row
      const valueRow = card.append('div')
        .style('display', 'flex').style('align-items', 'baseline').style('gap', '8px')

      valueRow.append('span')
        .style('font-size', '32px').style('font-weight', '800')
        .style('color', statusColor).style('line-height', '1')
        .text(kpi.currentValue.toFixed(1))

      // Sparkline SVG (simulated trend from previous → current)
      if (viewModel.settings.general.showSparkline && kpi.previousValue !== undefined) {
        const sparkW = 60
        const sparkH = 20
        const sparkSvg = valueRow.append('svg')
          .attr('width', sparkW).attr('height', sparkH)
          .style('flex-shrink', '0')

        // Generate mini sparkline (5 points interpolated)
        const prev = kpi.previousValue
        const curr = kpi.currentValue
        const mid1 = prev + (curr - prev) * 0.3 + (curr - prev) * 0.1
        const mid2 = prev + (curr - prev) * 0.5 - (curr - prev) * 0.05
        const mid3 = prev + (curr - prev) * 0.75 + (curr - prev) * 0.08
        const sparkData = [prev, mid1, mid2, mid3, curr]

        const sparkX = d3.scaleLinear().domain([0, sparkData.length - 1]).range([2, sparkW - 2])
        const sparkExtent = d3.extent(sparkData) as [number, number]
        const sparkY = d3.scaleLinear().domain(sparkExtent).range([sparkH - 2, 2])

        const sparkLine = d3.line<number>()
          .x((_, i) => sparkX(i))
          .y(d => sparkY(d))
          .curve(d3.curveMonotoneX)

        // Area fill
        const sparkArea = d3.area<number>()
          .x((_, i) => sparkX(i))
          .y0(sparkH)
          .y1(d => sparkY(d))
          .curve(d3.curveMonotoneX)

        sparkSvg.append('path')
          .datum(sparkData)
          .attr('d', sparkArea as any)
          .attr('fill', statusColor).attr('opacity', 0.1)

        sparkSvg.append('path')
          .datum(sparkData)
          .attr('d', sparkLine as any)
          .attr('fill', 'none').attr('stroke', statusColor).attr('stroke-width', 1.5)

        // End dot
        sparkSvg.append('circle')
          .attr('cx', sparkX(sparkData.length - 1)).attr('cy', sparkY(curr))
          .attr('r', 2).attr('fill', statusColor)
      }

      // Target bar
      if (kpi.targetValue !== undefined) {
        const targetRow = card.append('div')
          .style('margin-top', '8px')

        targetRow.append('div')
          .style('display', 'flex').style('justify-content', 'space-between')
          .style('font-size', '9px').style('color', '#8A8886').style('margin-bottom', '3px')
          .html(`<span>Target: ${kpi.targetValue}</span><span>${((kpi.currentValue / kpi.targetValue) * 100).toFixed(0)}%</span>`)

        // Progress bar
        const barBg = targetRow.append('div')
          .style('height', '4px').style('background', '#f0f0f0').style('border-radius', '2px')
          .style('overflow', 'hidden')

        const pct = Math.min((kpi.currentValue / kpi.targetValue) * 100, 100)
        barBg.append('div')
          .style('height', '100%').style('width', `${pct}%`)
          .style('background', statusColor).style('border-radius', '2px')
          .style('transition', 'width 0.5s ease')
      }
    })
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return { cards: [] }
  }
}
