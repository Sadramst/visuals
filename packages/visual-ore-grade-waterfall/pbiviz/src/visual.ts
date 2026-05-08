// Ore Grade Waterfall - Power BI Visual Implementation

import powerbi from 'powerbi-visuals-api'
import * as d3 from 'd3'
import { VisualSettings } from './settings.js'
import { GradeStageData, VisualViewModel } from './types.js'

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
    // Remove old header if exists
    this.svg.selectAll('.header').remove()

    const header = this.svg.append('g').classed('header', true)

    // Background
    header.append('rect')
      .attr('width', width)
      .attr('height', 32)
      .attr('fill', '#0F2847')

    // Logo - BOLD and PROMINENT
    header.append('text')
      .attr('x', 10)
      .attr('y', 22)
      .attr('font-size', '20px')
      .attr('font-weight', '900')
      .attr('letter-spacing', '2')
      .attr('fill', '#00D4FF')
      .text('◆ APPILICO')

    // Title
    header.append('text')
      .attr('x', 160)
      .attr('y', 22)
      .attr('font-size', '15px')
      .attr('font-weight', '700')
      .attr('fill', '#FFFFFF')
      .text('Ore Grade Evolution')
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
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return { cards: [] }
  }
}
