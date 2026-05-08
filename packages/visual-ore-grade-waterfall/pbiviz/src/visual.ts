// Ore Grade Waterfall - Power BI Visual Implementation

import powerbi from 'powerbi-visuals-api'
import * as d3 from 'd3'
import { VisualSettings } from './settings'
import { GradeStageData, VisualViewModel } from './types'

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions
import IVisual = powerbi.extensibility.visual.IVisual
import IVisualHost = powerbi.extensibility.visual.IVisualHost
import DataView = powerbi.DataView

export class OreGradeWaterfallVisual implements IVisual {
  private host: IVisualHost
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  private container: d3.Selection<SVGGElement, unknown, null, undefined>
  private settings: VisualSettings

  private readonly margin = { top: 68, right: 30, bottom: 50, left: 60 }

  constructor(options: VisualConstructorOptions) {
    this.host = options.host
    this.settings = new VisualSettings()

    this.svg = d3.select(options.element)
      .append('svg')
      .classed('ore-grade-waterfall', true)

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

    this.container.attr('transform', `translate(${this.margin.left},${this.margin.top})`)

    this.render(viewModel, width - this.margin.left - this.margin.right, height - this.margin.top - this.margin.bottom)
  }

  private createViewModel(dataView: DataView): VisualViewModel {
    const defaultModel: VisualViewModel = {
      stages: [],
      settings: {
        general: {
          showTarget: this.settings.general.showTarget,
          showVariance: this.settings.general.showVariance,
          unit: this.settings.general.unit
        },
        colors: {
          positive: this.settings.colors.positive,
          negative: this.settings.colors.negative,
          neutral: this.settings.colors.neutral
        }
      },
      isValid: false
    }

    const categorical = dataView.categorical
    if (!categorical?.categories?.[0] || !categorical?.values) {
      return defaultModel
    }

    const stageCategory = categorical.categories[0]
    const actualValues = categorical.values.find(v => v.source.roles?.['actualGrade'])
    const targetValues = categorical.values.find(v => v.source.roles?.['targetGrade'])
    const orderValues = categorical.values.find(v => v.source.roles?.['stageOrder'])

    if (!actualValues) return defaultModel

    const stages: GradeStageData[] = []
    
    for (let i = 0; i < stageCategory.values.length; i++) {
      const name = String(stageCategory.values[i])
      const actualGrade = Number(actualValues.values[i]) || 0
      const targetGrade = targetValues ? Number(targetValues.values[i]) : undefined
      const order = orderValues ? Number(orderValues.values[i]) : i

      let variance: number | undefined
      if (targetGrade !== undefined && targetGrade !== 0) {
        variance = ((actualGrade - targetGrade) / targetGrade) * 100
      }

      stages.push({
        id: `stage-${i}`,
        name,
        order,
        actualGrade,
        targetGrade,
        variance
      })
    }

    // Sort by order
    stages.sort((a, b) => a.order - b.order)

    // Calculate delta from previous
    for (let i = 1; i < stages.length; i++) {
      stages[i].deltaFromPrevious = stages[i].actualGrade - stages[i - 1].actualGrade
    }

    return { ...defaultModel, stages, isValid: stages.length > 0 }
  }

  private renderHeader(width: number): void {
    this.svg.selectAll('.header').remove()
    const header = this.svg.append('g').classed('header', true)

    const defs = this.svg.selectAll('defs').data([0]).join('defs')
    const grad = defs.selectAll('#oreHeaderGrad').data([0]).join('linearGradient').attr('id', 'oreHeaderGrad').attr('x1', '0%').attr('x2', '100%')
    grad.selectAll('stop').data([{ o: '0%', c: '#0A2540' }, { o: '100%', c: '#1a3a5c' }]).join('stop').attr('offset', d => d.o).attr('stop-color', d => d.c)

    header.append('rect').attr('width', width).attr('height', 48).attr('fill', 'url(#oreHeaderGrad)')

    const iconGrad = defs.selectAll('#oreIconGrad').data([0]).join('linearGradient').attr('id', 'oreIconGrad').attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '100%')
    iconGrad.selectAll('stop').data([{ o: '0%', c: '#00D4FF' }, { o: '100%', c: '#7B61FF' }]).join('stop').attr('offset', d => d.o).attr('stop-color', d => d.c)

    header.append('rect').attr('x', 12).attr('y', 8).attr('width', 32).attr('height', 32).attr('rx', 8).attr('fill', 'url(#oreIconGrad)')
    header.append('text').attr('x', 28).attr('y', 30).attr('text-anchor', 'middle').attr('font-size', '16px').attr('fill', '#fff').text('◆')

    header.append('text').attr('x', 52).attr('y', 22).attr('font-size', '14px').attr('font-weight', '800').attr('fill', '#FFFFFF').attr('letter-spacing', '0.5').text('APPILICO')
    header.append('text').attr('x', 52).attr('y', 38).attr('font-size', '10px').attr('fill', '#00D4FF').attr('letter-spacing', '2').text('ORE GRADE & RECOVERY')
  }

  private render(viewModel: VisualViewModel, width: number, height: number): void {
    this.container.selectAll('*').remove()

    const stages = viewModel.stages

    // Create scales
    const xScale = d3.scaleBand()
      .domain(stages.map(s => s.name))
      .range([0, width])
      .padding(0.3)

    const allGrades = stages.flatMap(s => [s.actualGrade, s.targetGrade].filter((v): v is number => v !== undefined))
    const yMin = Math.min(...allGrades) * 0.95
    const yMax = Math.max(...allGrades) * 1.05

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([height, 0])

    // Draw axes
    this.container.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '11px')

    this.container.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => `${d}%`))
      .selectAll('text')
      .style('font-size', '11px')

    // Y-axis label
    this.container.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -45)
      .attr('x', -height / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(viewModel.settings.general.unit)

    // Draw bars
    this.container.selectAll('.bar')
      .data(stages)
      .enter()
      .append('rect')
      .classed('bar', true)
      .attr('x', d => xScale((d as GradeStageData).name)!)
      .attr('y', d => yScale((d as GradeStageData).actualGrade))
      .attr('width', xScale.bandwidth())
      .attr('height', d => height - yScale((d as GradeStageData).actualGrade))
      .attr('rx', 4)
      .attr('fill', d => {
        const stage = d as GradeStageData
        if (stage.targetGrade === undefined) return viewModel.settings.colors.neutral
        return stage.actualGrade >= stage.targetGrade 
          ? viewModel.settings.colors.positive 
          : viewModel.settings.colors.negative
      })

    // Value labels
    this.container.selectAll('.value-label')
      .data(stages)
      .enter()
      .append('text')
      .classed('value-label', true)
      .attr('x', d => xScale((d as GradeStageData).name)! + xScale.bandwidth() / 2)
      .attr('y', d => yScale((d as GradeStageData).actualGrade) - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('font-weight', '600')
      .text(d => `${(d as GradeStageData).actualGrade.toFixed(2)}%`)

    // Target line
    if (viewModel.settings.general.showTarget) {
      stages.forEach(stage => {
        if (stage.targetGrade !== undefined) {
          this.container.append('line')
            .attr('x1', xScale(stage.name)! - 5)
            .attr('x2', xScale(stage.name)! + xScale.bandwidth() + 5)
            .attr('y1', yScale(stage.targetGrade))
            .attr('y2', yScale(stage.targetGrade))
            .attr('stroke', this.settings.colors.target)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,4')
        }
      })
    }

    // Variance labels
    if (viewModel.settings.general.showVariance) {
      this.container.selectAll('.variance-label')
        .data(stages.filter(s => s.variance !== undefined))
        .enter()
        .append('text')
        .classed('variance-label', true)
        .attr('x', d => xScale((d as GradeStageData).name)! + xScale.bandwidth() / 2)
        .attr('y', d => yScale((d as GradeStageData).actualGrade) - 18)
        .attr('text-anchor', 'middle')
        .style('font-size', '9px')
        .style('fill', d => ((d as GradeStageData).variance ?? 0) >= 0 ? viewModel.settings.colors.positive : viewModel.settings.colors.negative)
        .text(d => `${((d as GradeStageData).variance ?? 0) >= 0 ? '+' : ''}${((d as GradeStageData).variance ?? 0).toFixed(1)}%`)
    }

    // Recovery flow connectors between stages
    this.renderFlowConnectors(stages, xScale, yScale)

    // Cumulative recovery line
    this.renderRecoveryLine(stages, xScale, yScale, width, height)
  }

  private renderFlowConnectors(
    stages: GradeStageData[],
    xScale: d3.ScaleBand<string>,
    yScale: d3.ScaleLinear<number, number>
  ): void {
    if (stages.length < 2) return

    for (let i = 0; i < stages.length - 1; i++) {
      const from = stages[i]
      const to = stages[i + 1]
      const x1 = xScale(from.name)! + xScale.bandwidth()
      const x2 = xScale(to.name)!
      const y1 = yScale(from.actualGrade)
      const y2 = yScale(to.actualGrade)
      const midX = (x1 + x2) / 2

      // Curved connector
      const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`

      this.container.append('path')
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', '#00D4FF')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.6)

      // Arrow head
      this.container.append('polygon')
        .attr('points', `${x2},${y2} ${x2 - 5},${y2 - 3} ${x2 - 5},${y2 + 3}`)
        .attr('fill', '#00D4FF')
        .attr('opacity', 0.6)

      // Delta label on connector
      if (from.actualGrade > 0) {
        const delta = to.actualGrade - from.actualGrade
        const deltaCol = delta >= 0 ? '#00B050' : '#C00000'
        this.container.append('text')
          .attr('x', midX).attr('y', (y1 + y2) / 2 - 6)
          .attr('text-anchor', 'middle')
          .style('font-size', '8px').style('font-weight', '600').style('fill', deltaCol)
          .text(`${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%`)
      }
    }
  }

  private renderRecoveryLine(
    stages: GradeStageData[],
    xScale: d3.ScaleBand<string>,
    yScale: d3.ScaleLinear<number, number>,
    width: number,
    height: number
  ): void {
    if (stages.length < 2 || stages[0].actualGrade === 0) return

    // Calculate cumulative recovery (grade retention from first stage)
    const baseline = stages[0].actualGrade
    const recoveryData = stages.map(s => ({
      name: s.name,
      recovery: (s.actualGrade / baseline) * 100,
    }))

    // Summary label
    const finalRecovery = recoveryData[recoveryData.length - 1].recovery
    this.container.append('text')
      .attr('x', width - 10).attr('y', -4)
      .attr('text-anchor', 'end')
      .style('font-size', '10px').style('font-weight', '700')
      .style('fill', finalRecovery >= 80 ? '#00B050' : finalRecovery >= 60 ? '#E07A1F' : '#C00000')
      .text(`Overall Recovery: ${finalRecovery.toFixed(1)}%`)
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return { cards: [] }
  }
}
