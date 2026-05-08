// Cost Tracker - Power BI Visual Implementation

import powerbi from 'powerbi-visuals-api'
import * as d3 from 'd3'
import { VisualSettings } from './settings'
import { CostDataPoint, VisualViewModel } from './types'

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions
import IVisual = powerbi.extensibility.visual.IVisual
import IVisualHost = powerbi.extensibility.visual.IVisualHost
import DataView = powerbi.DataView

export class CostTrackerVisual implements IVisual {
  private host: IVisualHost
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  private container: d3.Selection<SVGGElement, unknown, null, undefined>
  private settings: VisualSettings

  private readonly margin = { top: 75, right: 60, bottom: 50, left: 70 }

  constructor(options: VisualConstructorOptions) {
    this.host = options.host
    this.settings = new VisualSettings()

    this.svg = d3.select(options.element)
      .append('svg')
      .classed('cost-tracker', true)

    this.container = this.svg.append('g')
      .classed('container', true)
  }

  public update(options: VisualUpdateOptions): void {
    if (!options.dataViews?.[0]) return

    const dataView = options.dataViews[0]
    this.settings = VisualSettings.parse(dataView)

    const viewModel = this.createViewModel(dataView)
    if (!viewModel.isValid) return

    const width = options.viewport.width
    const height = options.viewport.height

    this.svg
      .attr('width', width)
      .attr('height', height)

    // Render header
    this.renderHeader(width)

    this.container.attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    this.render(viewModel, width - this.margin.left - this.margin.right, height - this.margin.top - this.margin.bottom)
  }

  private createViewModel(dataView: DataView): VisualViewModel {
    const defaultModel: VisualViewModel = {
      dataPoints: [],
      totals: { actualTotal: 0, budgetTotal: 0, varianceTotal: 0, avgCostPerTonne: 0 },
      settings: {
        general: {
          showCumulative: this.settings.general.showCumulative,
          showAnomalies: this.settings.general.showAnomalies,
          anomalyThreshold: this.settings.general.anomalyThreshold
        },
        colors: {
          actual: this.settings.colors.actual,
          budget: this.settings.colors.budget,
          overBudget: this.settings.colors.overBudget,
          underBudget: this.settings.colors.underBudget
        }
      },
      isValid: false
    }

    const categorical = dataView.categorical
    if (!categorical?.categories?.[0] || !categorical?.values) {
      return defaultModel
    }

    const monthCategory = categorical.categories[0]
    const categoryColumn = categorical.categories.length > 1 ? categorical.categories[1] : null
    const actualValues = categorical.values.find(v => v.source.roles?.['actualAmount'])
    const budgetValues = categorical.values.find(v => v.source.roles?.['budgetAmount'])
    const costPerTonneValues = categorical.values.find(v => v.source.roles?.['costPerTonne'])

    if (!actualValues) return defaultModel

    // Aggregate by month
    const monthMap = new Map<string, { actual: number; budget: number; costPerTonne: number; count: number }>()
    const monthOrder: string[] = []
    
    for (let i = 0; i < monthCategory.values.length; i++) {
      const month = String(monthCategory.values[i])
      const actualAmount = Number(actualValues.values[i]) || 0
      const budgetAmount = budgetValues ? Number(budgetValues.values[i]) || 0 : 0
      const costPerTonne = costPerTonneValues ? Number(costPerTonneValues.values[i]) || 0 : 0

      if (!monthMap.has(month)) {
        monthMap.set(month, { actual: 0, budget: 0, costPerTonne: 0, count: 0 })
        monthOrder.push(month)
      }
      const entry = monthMap.get(month)!
      entry.actual += actualAmount
      entry.budget += budgetAmount
      entry.costPerTonne += costPerTonne
      entry.count++
    }

    const dataPoints: CostDataPoint[] = []
    let actualTotal = 0
    let budgetTotal = 0
    let costPerTonneSum = 0
    
    for (const month of monthOrder) {
      const entry = monthMap.get(month)!
      const actualAmount = entry.actual
      const budgetAmount = entry.budget
      const costPerTonne = entry.count > 0 ? entry.costPerTonne / entry.count : 0

      actualTotal += actualAmount
      budgetTotal += budgetAmount
      costPerTonneSum += costPerTonne

      let variance: number | undefined
      let variancePercent: number | undefined
      let isAnomaly = false

      if (budgetAmount > 0) {
        variance = actualAmount - budgetAmount
        variancePercent = (variance / budgetAmount) * 100
        isAnomaly = Math.abs(variancePercent) > this.settings.general.anomalyThreshold
      }

      dataPoints.push({
        month,
        actualAmount,
        budgetAmount,
        variance,
        variancePercent,
        costPerTonne,
        isAnomaly
      })
    }

    const avgCostPerTonne = dataPoints.length > 0 ? costPerTonneSum / dataPoints.length : 0

    return {
      dataPoints,
      totals: {
        actualTotal,
        budgetTotal,
        varianceTotal: actualTotal - budgetTotal,
        avgCostPerTonne
      },
      settings: defaultModel.settings,
      isValid: dataPoints.length > 0
    }
  }

  private formatCurrency(value: number): string {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
  }

  private renderHeader(width: number): void {
    this.svg.selectAll('.header').remove()
    const header = this.svg.append('g').classed('header', true)

    const defs = this.svg.selectAll('defs').data([0]).join('defs')
    const grad = defs.selectAll('#costHeaderGrad').data([0]).join('linearGradient').attr('id', 'costHeaderGrad').attr('x1', '0%').attr('x2', '100%')
    grad.selectAll('stop').data([{ o: '0%', c: '#0A2540' }, { o: '100%', c: '#1a3a5c' }]).join('stop').attr('offset', d => d.o).attr('stop-color', d => d.c)

    header.append('rect').attr('width', width).attr('height', 48).attr('fill', 'url(#costHeaderGrad)')

    const iconGrad = defs.selectAll('#costIconGrad').data([0]).join('linearGradient').attr('id', 'costIconGrad').attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '100%')
    iconGrad.selectAll('stop').data([{ o: '0%', c: '#00D4FF' }, { o: '100%', c: '#7B61FF' }]).join('stop').attr('offset', d => d.o).attr('stop-color', d => d.c)

    header.append('rect').attr('x', 12).attr('y', 8).attr('width', 32).attr('height', 32).attr('rx', 8).attr('fill', 'url(#costIconGrad)')
    header.append('text').attr('x', 28).attr('y', 30).attr('text-anchor', 'middle').attr('font-size', '16px').attr('fill', '#fff').text('$')

    header.append('text').attr('x', 52).attr('y', 22).attr('font-size', '14px').attr('font-weight', '800').attr('fill', '#FFFFFF').attr('letter-spacing', '0.5').text('APPILICO')
    header.append('text').attr('x', 52).attr('y', 38).attr('font-size', '10px').attr('fill', '#00D4FF').attr('letter-spacing', '2').text('COST & BUDGET VARIANCE')
  }

  private render(viewModel: VisualViewModel, width: number, height: number): void {
    this.container.selectAll('*').remove()

    const dataPoints = viewModel.dataPoints

    // Create scales
    const xScale = d3.scaleBand()
      .domain(dataPoints.map(d => d.month))
      .range([0, width])
      .padding(0.3)

    const maxValue = Math.max(
      ...dataPoints.map(d => d.actualAmount),
      ...dataPoints.map(d => d.budgetAmount || 0)
    )

    const yScale = d3.scaleLinear()
      .domain([0, maxValue * 1.1])
      .range([height, 0])

    // Draw summary cards
    this.renderSummary(viewModel, width)

    // Draw axes
    this.container.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '10px')

    this.container.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => this.formatCurrency(Number(d))))
      .selectAll('text')
      .style('font-size', '10px')

    // Draw bars
    this.container.selectAll('.bar')
      .data(dataPoints)
      .enter()
      .append('rect')
      .classed('bar', true)
      .attr('x', d => xScale((d as CostDataPoint).month)!)
      .attr('y', d => yScale((d as CostDataPoint).actualAmount))
      .attr('width', xScale.bandwidth())
      .attr('height', d => height - yScale((d as CostDataPoint).actualAmount))
      .attr('rx', 4)
      .attr('fill', d => {
        const point = d as CostDataPoint
        if (point.isAnomaly && point.variancePercent && point.variancePercent > 0) {
          return viewModel.settings.colors.overBudget
        }
        if (point.variancePercent && point.variancePercent < -this.settings.general.anomalyThreshold) {
          return viewModel.settings.colors.underBudget
        }
        return viewModel.settings.colors.actual
      })

    // Budget line
    const budgetLine = d3.line<CostDataPoint>()
      .defined(d => d.budgetAmount !== undefined)
      .x(d => xScale(d.month)! + xScale.bandwidth() / 2)
      .y(d => yScale(d.budgetAmount || 0))

    this.container.append('path')
      .datum(dataPoints)
      .attr('fill', 'none')
      .attr('stroke', viewModel.settings.colors.budget)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('d', budgetLine)

    // Budget dots
    this.container.selectAll('.budget-dot')
      .data(dataPoints.filter(d => (d as CostDataPoint).budgetAmount !== undefined))
      .enter()
      .append('circle')
      .classed('budget-dot', true)
      .attr('cx', d => xScale((d as CostDataPoint).month)! + xScale.bandwidth() / 2)
      .attr('cy', d => yScale((d as CostDataPoint).budgetAmount!))
      .attr('r', 4)
      .attr('fill', viewModel.settings.colors.budget)

    // Anomaly markers
    if (viewModel.settings.general.showAnomalies) {
      this.container.selectAll('.anomaly-marker')
        .data(dataPoints.filter(d => (d as CostDataPoint).isAnomaly))
        .enter()
        .append('text')
        .classed('anomaly-marker', true)
        .attr('x', d => xScale((d as CostDataPoint).month)! + xScale.bandwidth() / 2)
        .attr('y', d => yScale((d as CostDataPoint).actualAmount) - 8)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', viewModel.settings.colors.overBudget)
        .text('!')
    }

    // Cost-per-tonne trend line on secondary Y axis
    this.renderCostPerTonneLine(dataPoints, xScale, width, height)

    // Variance indicators on bars
    this.renderVarianceIndicators(dataPoints, xScale, yScale, height)

    // Legend
    this.renderLegend(viewModel, width)
  }

  private renderCostPerTonneLine(
    dataPoints: CostDataPoint[],
    xScale: d3.ScaleBand<string>,
    width: number,
    height: number
  ): void {
    const cptData = dataPoints.filter(d => d.costPerTonne > 0)
    if (cptData.length < 2) return

    const cptMax = Math.max(...cptData.map(d => d.costPerTonne)) * 1.2
    const cptScale = d3.scaleLinear().domain([0, cptMax]).range([height, 0])

    // Right Y axis
    const rightAxis = this.container.append('g')
      .attr('transform', `translate(${width}, 0)`)
      .call(d3.axisRight(cptScale).ticks(4).tickFormat(d => `$${(d as number).toFixed(0)}/t`))
    rightAxis.selectAll('text').style('font-size', '8px').style('fill', '#7B61FF')
    rightAxis.select('.domain').attr('stroke', '#7B61FF').attr('opacity', 0.3)

    // Trend line
    const trendLine = d3.line<CostDataPoint>()
      .x(d => xScale(d.month)! + xScale.bandwidth() / 2)
      .y(d => cptScale(d.costPerTonne))
      .curve(d3.curveMonotoneX)

    this.container.append('path')
      .datum(cptData)
      .attr('fill', 'none')
      .attr('stroke', '#7B61FF')
      .attr('stroke-width', 2)
      .attr('d', trendLine)

    // Dots
    cptData.forEach(d => {
      this.container.append('circle')
        .attr('cx', xScale(d.month)! + xScale.bandwidth() / 2)
        .attr('cy', cptScale(d.costPerTonne))
        .attr('r', 3).attr('fill', '#7B61FF').attr('stroke', '#fff').attr('stroke-width', 1.5)
    })
  }

  private renderVarianceIndicators(
    dataPoints: CostDataPoint[],
    xScale: d3.ScaleBand<string>,
    yScale: d3.ScaleLinear<number, number>,
    height: number
  ): void {
    // Small variance bars below the x-axis
    const varMax = Math.max(...dataPoints.filter(d => d.variancePercent !== undefined).map(d => Math.abs(d.variancePercent!)), 1)
    const varScale = d3.scaleLinear().domain([0, varMax]).range([0, 20])

    dataPoints.forEach(d => {
      if (d.variancePercent === undefined) return
      const barH = varScale(Math.abs(d.variancePercent))
      const isOver = d.variancePercent > 0
      const color = isOver ? '#C00000' : '#00B050'
      const x = xScale(d.month)!

      this.container.append('rect')
        .attr('x', x).attr('y', height + 20)
        .attr('width', xScale.bandwidth()).attr('height', barH)
        .attr('fill', color).attr('opacity', 0.6).attr('rx', 2)

      this.container.append('text')
        .attr('x', x + xScale.bandwidth() / 2).attr('y', height + 20 + barH + 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '7px').style('fill', color).style('font-weight', '600')
        .text(`${isOver ? '+' : ''}${d.variancePercent.toFixed(0)}%`)
    })
  }

  private renderSummary(viewModel: VisualViewModel, width: number): void {
    const summaryGroup = this.container.append('g')
      .attr('transform', 'translate(0, -50)')

    const items = [
      { label: 'Total Spend', value: this.formatCurrency(viewModel.totals.actualTotal), color: viewModel.settings.colors.actual },
      { label: 'Budget', value: this.formatCurrency(viewModel.totals.budgetTotal), color: viewModel.settings.colors.budget },
      { label: 'Variance', value: this.formatCurrency(viewModel.totals.varianceTotal), color: viewModel.totals.varianceTotal > 0 ? viewModel.settings.colors.overBudget : viewModel.settings.colors.underBudget },
      { label: 'Avg $/t', value: `$${viewModel.totals.avgCostPerTonne.toFixed(2)}`, color: '#333' }
    ]

    const itemWidth = width / items.length

    items.forEach((item, i) => {
      const g = summaryGroup.append('g')
        .attr('transform', `translate(${i * itemWidth}, 0)`)

      g.append('text')
        .attr('y', 0)
        .style('font-size', '10px')
        .style('fill', '#666')
        .text(item.label)

      g.append('text')
        .attr('y', 18)
        .style('font-size', '16px')
        .style('font-weight', '600')
        .style('fill', item.color)
        .text(item.value)
    })
  }

  private renderLegend(viewModel: VisualViewModel, width: number): void {
    const legend = this.container.append('g')
      .attr('transform', `translate(${width - 200}, -30)`)

    const items = [
      { label: 'Actual', color: viewModel.settings.colors.actual },
      { label: 'Budget', color: viewModel.settings.colors.budget }
    ]

    items.forEach((item, i) => {
      const g = legend.append('g')
        .attr('transform', `translate(${i * 80}, 0)`)

      g.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('rx', 2)
        .attr('fill', item.color)

      g.append('text')
        .attr('x', 16)
        .attr('y', 10)
        .style('font-size', '10px')
        .text(item.label)
    })
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return { cards: [] }
  }
}
