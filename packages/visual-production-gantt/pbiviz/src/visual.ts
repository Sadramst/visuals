// Mine Production Gantt Visual - Power BI Custom Visual
// Displays production shift performance with actual vs target tonnes

import powerbi from 'powerbi-visuals-api'
import * as d3 from 'd3'

import IVisual = powerbi.extensibility.IVisual
import IVisualHost = powerbi.extensibility.visual.IVisualHost
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions
import ISelectionManager = powerbi.extensibility.ISelectionManager
import IViewport = powerbi.IViewport
import DataView = powerbi.DataView
import DataViewCategorical = powerbi.DataViewCategorical
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem
import ITooltipService = powerbi.extensibility.ITooltipService

import { VisualSettings } from './settings.js'
import { ParsedData, ParsedShiftDataPoint, Margins, BarColourType } from './types.js'

export class MineProductionGanttVisual implements IVisual {
  private host: IVisualHost
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  private mainGroup: d3.Selection<SVGGElement, unknown, null, undefined>
  private tooltipService: ITooltipService
  private selectionManager: ISelectionManager
  private settings: VisualSettings
  private data: ParsedData | null = null
  private isFirstRender: boolean = true

  private readonly MARGINS: Margins = { top: 68, right: 24, bottom: 70, left: 75 }

  constructor(options: VisualConstructorOptions) {
    this.host = options.host
    this.selectionManager = options.host.createSelectionManager()
    this.tooltipService = options.host.tooltipService

    this.svg = d3.select(options.element)
      .append('svg')
      .attr('role', 'img')
      .attr('aria-label', 'Mine Production Gantt Chart')
      .classed('production-gantt', true)

    this.mainGroup = this.svg.append('g').classed('main-group', true)

    // Default settings
    this.settings = new VisualSettings()
  }

  public update(options: VisualUpdateOptions): void {
    if (!options.dataViews || !options.dataViews[0]) {
      this.renderEmptyState(options.viewport)
      return
    }

    this.settings = VisualSettings.parse(options.dataViews[0])
    this.data = this.parseDataView(options.dataViews[0])
    this.render(options.viewport)
  }

  private parseDataView(dataView: DataView): ParsedData {
    const points: ParsedShiftDataPoint[] = []
    let hasTarget = false
    let maxTonnes = 0
    let targetSum = 0
    let targetCount = 0

    if (!dataView.categorical) {
      return { points, hasTarget, maxTonnes, avgTarget: undefined }
    }

    const categorical: DataViewCategorical = dataView.categorical
    const categories = categorical.categories || []
    const values = categorical.values || []

    // Find category indices
    const dateCategory = categories.find(c => c.source.roles?.['date'])
    const shiftCategory = categories.find(c => c.source.roles?.['shift'])
    const crewCategory = categories.find(c => c.source.roles?.['crewName'])
    const locationCategory = categories.find(c => c.source.roles?.['location'])

    // Find value indices
    const actualValues = values.find(v => v.source.roles?.['actualTonnes'])
    const targetValues = values.find(v => v.source.roles?.['targetTonnes'])
    const equipmentValues = values.find(v => v.source.roles?.['equipmentCount'])

    if (!dateCategory || !actualValues) {
      return { points, hasTarget, maxTonnes, avgTarget: undefined }
    }

    const rowCount = dateCategory.values.length

    for (let i = 0; i < rowCount; i++) {
      const dateVal = dateCategory.values[i]
      const date = dateVal instanceof Date ? dateVal : new Date(String(dateVal))

      const shiftVal = shiftCategory?.values[i]
      const shiftType = this.parseShiftType(String(shiftVal || 'AM'))

      const actualTonnes = Number(actualValues.values[i]) || 0
      const targetTonnes = targetValues ? Number(targetValues.values[i]) : undefined

      if (targetTonnes !== undefined && !isNaN(targetTonnes)) {
        hasTarget = true
        targetSum += targetTonnes
        targetCount++
      }

      maxTonnes = Math.max(maxTonnes, actualTonnes, targetTonnes || 0)

      const crewName = crewCategory?.values[i] ? String(crewCategory.values[i]) : undefined
      const equipmentCount = equipmentValues ? Number(equipmentValues.values[i]) : undefined
      const location = locationCategory?.values[i] ? String(locationCategory.values[i]) : undefined

      const variance = targetTonnes
        ? ((actualTonnes - targetTonnes) / targetTonnes) * 100
        : undefined

      const colourType = this.getBarColourType(actualTonnes, targetTonnes)
      const colour = this.getColourFromType(colourType)

      const shiftLabel = this.formatShiftLabel(date, shiftType)

      const selectionId = this.host.createSelectionIdBuilder()
        .withCategory(dateCategory, i)
        .createSelectionId()

      points.push({
        id: `shift-${i}`,
        date,
        shiftType,
        shiftLabel,
        actualTonnes,
        targetTonnes,
        crewName,
        equipmentCount,
        location,
        variance: variance ? Math.round(variance * 10) / 10 : undefined,
        colour,
        selectionId,
      })
    }

    // Sort by date then shift order
    points.sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime()
      if (dateDiff !== 0) return dateDiff
      const shiftOrder = { AM: 0, PM: 1, Night: 2 }
      return shiftOrder[a.shiftType] - shiftOrder[b.shiftType]
    })

    const avgTarget = targetCount > 0 ? targetSum / targetCount : undefined

    return { points, hasTarget, maxTonnes, avgTarget }
  }

  private parseShiftType(value: string): 'AM' | 'PM' | 'Night' {
    const upper = value.toUpperCase()
    if (upper.includes('NIGHT') || upper === 'N') return 'Night'
    if (upper.includes('PM') || upper === 'P') return 'PM'
    return 'AM'
  }

  private formatShiftLabel(date: Date, shiftType: string): string {
    const day = date.getDate()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    return `${day} ${month} ${shiftType}`
  }

  private getBarColourType(actual: number, target: number | undefined): BarColourType {
    if (target === undefined || isNaN(target) || target === 0) return 'neutral'
    const ratio = actual / target
    if (ratio >= 1.0) return 'above'
    if (ratio >= 0.9) return 'near'
    return 'below'
  }

  private getColourFromType(type: BarColourType): string {
    switch (type) {
      case 'above': return this.settings.colours.aboveTarget
      case 'near': return this.settings.colours.nearTarget
      case 'below': return this.settings.colours.belowTarget
      default: return '#1F3864' // Navy - neutral
    }
  }

  private render(viewport: IViewport): void {
    const width = viewport.width - this.MARGINS.left - this.MARGINS.right
    const height = viewport.height - this.MARGINS.top - this.MARGINS.bottom

    if (width <= 0 || height <= 0 || !this.data?.points?.length) {
      this.renderEmptyState(viewport)
      return
    }

    this.svg
      .attr('width', viewport.width)
      .attr('height', viewport.height)

    // Render header with branding
    this.renderHeader(viewport.width)

    this.mainGroup
      .attr('transform', `translate(${this.MARGINS.left},${this.MARGINS.top})`)

    // Clear previous elements
    this.mainGroup.selectAll('*').remove()

    // X scale: band scale over shift labels
    const xScale = d3.scaleBand<string>()
      .domain(this.data.points.map(d => d.shiftLabel))
      .range([0, width])
      .paddingInner(0.2)
      .paddingOuter(0.1)

    // Y scale: 0 to max with 10% headroom
    const yMax = Math.max(
      this.data.maxTonnes,
      this.data.avgTarget || 0
    ) * 1.1
    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([height, 0])

    this.renderGridLines(width, height, yScale)
    this.renderBars(xScale, yScale, height)
    this.renderTargetLine(xScale, yScale, width)
    this.renderDataLabels(xScale, yScale)
    this.renderXAxis(xScale, height)
    this.renderYAxis(yScale)

    if (this.settings.general.showLegend) {
      this.renderLegend(width)
    }

    this.attachTooltips()
    this.applyTransitions()
  }

  private renderHeader(width: number): void {
    const header = this.svg.append('g').classed('header', true)

    // Background
    header.append('rect')
      .attr('width', width)
      .attr('height', 28)
      .attr('fill', '#1F3864')

    // Appilico branding
    header.append('text')
      .attr('x', 12)
      .attr('y', 18)
      .attr('font-size', '16px')
      .attr('font-weight', '700')
      .attr('fill', '#00D4FF')
      .text('▥ Appilico')

    // Title
    header.append('text')
      .attr('x', 120)
      .attr('y', 18)
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('fill', '#FFFFFF')
      .text('Mine Production Schedule')
  }

  private renderGridLines(
    width: number,
    height: number,
    yScale: d3.ScaleLinear<number, number>
  ): void {
    if (!this.settings.axis.showGridLines) return

    const gridGroup = this.mainGroup.append('g').classed('grid-lines', true)
    const ticks = yScale.ticks(5)

    gridGroup.selectAll('line')
      .data(ticks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#E5E5E5')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-width', 1)
  }

  private renderBars(
    xScale: d3.ScaleBand<string>,
    yScale: d3.ScaleLinear<number, number>,
    height: number
  ): void {
    if (!this.data) return

    const barsGroup = this.mainGroup.append('g').classed('bars', true)
    const barWidth = xScale.bandwidth()

    barsGroup.selectAll('rect')
      .data(this.data.points)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale((d as ParsedShiftDataPoint).shiftLabel) || 0)
      .attr('y', d => yScale((d as ParsedShiftDataPoint).actualTonnes))
      .attr('width', barWidth)
      .attr('height', d => height - yScale((d as ParsedShiftDataPoint).actualTonnes))
      .attr('fill', d => (d as ParsedShiftDataPoint).colour)
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        const multiSelect = event.ctrlKey || event.metaKey
        this.selectionManager.select((d as ParsedShiftDataPoint).selectionId, multiSelect).then(ids => {
          this.updateBarOpacity(ids as powerbi.visuals.ISelectionId[])
        })
      })

    // Click outside to clear selection
    this.svg.on('click', (event) => {
      if (event.target === this.svg.node()) {
        this.selectionManager.clear().then(() => {
          this.updateBarOpacity([])
        })
      }
    })
  }

  private updateBarOpacity(selectedIds: powerbi.visuals.ISelectionId[]): void {
    const hasSelection = selectedIds.length > 0

    this.mainGroup.selectAll('.bar')
      .attr('opacity', (d: ParsedShiftDataPoint) => {
        if (!hasSelection) return 1
        const isSelected = selectedIds.some(id => id.equals(d.selectionId))
        return isSelected ? 1 : 0.3
      })
  }

  private renderTargetLine(
    xScale: d3.ScaleBand<string>,
    yScale: d3.ScaleLinear<number, number>,
    width: number
  ): void {
    if (!this.settings.general.showTarget || !this.data?.hasTarget || !this.data.avgTarget) {
      return
    }

    const targetGroup = this.mainGroup.append('g').classed('target-line', true)
    const y = yScale(this.data.avgTarget)

    targetGroup.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', y)
      .attr('y2', y)
      .attr('stroke', this.settings.colours.targetLine)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,4')

    targetGroup.append('text')
      .attr('x', width - 5)
      .attr('y', y - 5)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('fill', this.settings.colours.targetLine)
      .text(`Target: ${this.data.avgTarget.toLocaleString()}t`)
  }

  private renderDataLabels(
    xScale: d3.ScaleBand<string>,
    yScale: d3.ScaleLinear<number, number>
  ): void {
    if (!this.settings.labels.showDataLabels || !this.data) return

    const labelsGroup = this.mainGroup.append('g').classed('data-labels', true)
    const barWidth = xScale.bandwidth()
    const minBarWidthForLabels = 50

    // Group data by shift label to avoid duplicate labels
    const labelMap = new Map<string, number>()
    this.data.points.forEach(d => {
      if (!labelMap.has(d.shiftLabel)) {
        labelMap.set(d.shiftLabel, d.actualTonnes)
      }
    })

    // Render one label per unique shift
    labelMap.forEach((value, label) => {
      const idx = this.data!.points.findIndex(p => p.shiftLabel === label)
      if (idx < 0) return

      const d = this.data!.points[idx]
      const x = (xScale(d.shiftLabel) || 0) + barWidth / 2
      const y = yScale(d.actualTonnes) - 35

      if (barWidth < minBarWidthForLabels) return

      labelsGroup.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', '700')
        .attr('fill', '#00B050')
        .attr('pointer-events', 'none')
        .text(`${(value / 1000).toFixed(1)}kt`)
    })
  }

  private renderXAxis(
    xScale: d3.ScaleBand<string>,
    height: number
  ): void {
    if (!this.settings.axis.showXAxis) return

    const xAxisGroup = this.mainGroup.append('g')
      .classed('x-axis', true)
      .attr('transform', `translate(0,${height})`)

    const xAxis = d3.axisBottom(xScale)

    xAxisGroup.call(xAxis)
      .select('.domain').remove()

    xAxisGroup.selectAll('.tick line')
      .attr('stroke', '#E5E5E5')

    // Rotate labels if many data points
    if (this.data && this.data.points.length > 5) {
      xAxisGroup.selectAll('.tick text')
        .attr('transform', 'rotate(-45)')
        .attr('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em')
        .attr('font-size', '9px')
    } else {
      xAxisGroup.selectAll('.tick text')
        .attr('font-size', '10px')
    }
  }

  private renderYAxis(yScale: d3.ScaleLinear<number, number>): void {
    if (!this.settings.axis.showYAxis) return

    const yAxisGroup = this.mainGroup.append('g').classed('y-axis', true)

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => `${d3.format(',')(d as number)}t`)

    yAxisGroup.call(yAxis)
      .select('.domain').remove()

    yAxisGroup.selectAll('.tick line')
      .attr('stroke', '#E5E5E5')

    // Y axis label
    if (this.settings.axis.yLabel) {
      yAxisGroup.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -yScale.range()[0] / 2)
        .attr('y', -60)
        .attr('text-anchor', 'middle')
        .attr('fill', '#666')
        .attr('font-size', '12px')
        .text(this.settings.axis.yLabel)
    }
  }

  private renderLegend(width: number): void {
    const legendGroup = this.mainGroup.append('g')
      .classed('legend', true)
      .attr('transform', `translate(${width - 200}, -30)`)

    const items = [
      { label: 'Above Target', colour: this.settings.colours.aboveTarget },
      { label: 'Near Target', colour: this.settings.colours.nearTarget },
      { label: 'Below Target', colour: this.settings.colours.belowTarget },
    ]

    items.forEach((item, i) => {
      const itemGroup = legendGroup.append('g')
        .attr('transform', `translate(${i * 85}, 0)`)

      itemGroup.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', item.colour)
        .attr('rx', 2)

      itemGroup.append('text')
        .attr('x', 16)
        .attr('y', 10)
        .attr('font-size', '10px')
        .attr('fill', '#666')
        .text(item.label)
    })
  }

  private attachTooltips(): void {
    if (!this.data) return

    const bars = this.mainGroup.selectAll<SVGRectElement, ParsedShiftDataPoint>('.bar')
    const tooltipService = this.tooltipService

    bars.on('mouseover', function(_event: MouseEvent, d: ParsedShiftDataPoint) {
      const items: VisualTooltipDataItem[] = [
        { displayName: 'Shift', value: d.shiftLabel },
        { displayName: 'Actual', value: `${d.actualTonnes.toLocaleString()}t` },
      ]

      if (d.targetTonnes !== undefined) {
        items.push({ displayName: 'Target', value: `${d.targetTonnes.toLocaleString()}t` })
      }

      if (d.variance !== undefined) {
        items.push({
          displayName: 'Variance',
          value: `${d.variance >= 0 ? '+' : ''}${d.variance.toFixed(1)}%`,
        })
      }

      if (d.crewName) {
        items.push({ displayName: 'Crew', value: d.crewName })
      }

      if (d.equipmentCount !== undefined) {
        items.push({ displayName: 'Equipment', value: `${d.equipmentCount} units` })
      }

      if (d.location) {
        items.push({ displayName: 'Location', value: d.location })
      }

      const rect = (this as SVGRectElement).getBoundingClientRect()
      tooltipService.show({
        coordinates: [rect.left + rect.width / 2, rect.top],
        isTouchEvent: false,
        dataItems: items,
        identities: []
      })
    })

    bars.on('mouseout', () => {
      tooltipService.hide({ immediately: true, isTouchEvent: false })
    })
  }

  private applyTransitions(): void {
    if (this.isFirstRender) {
      this.isFirstRender = false

      // Animate bars from bottom
      this.mainGroup.selectAll('.bar')
        .attr('y', (d: ParsedShiftDataPoint) => this.MARGINS.top + 300) // Start at bottom
        .attr('height', 0)
        .transition()
        .duration(400)
        .ease(d3.easeQuadOut)
        .attr('y', (d: ParsedShiftDataPoint) => {
          const yMax = this.data!.maxTonnes * 1.1
          const height = this.svg.attr('height') as unknown as number - this.MARGINS.top - this.MARGINS.bottom
          const yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0])
          return yScale(d.actualTonnes)
        })
        .attr('height', (d: ParsedShiftDataPoint) => {
          const yMax = this.data!.maxTonnes * 1.1
          const height = this.svg.attr('height') as unknown as number - this.MARGINS.top - this.MARGINS.bottom
          const yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0])
          return height - yScale(d.actualTonnes)
        })
    }
  }

  private renderEmptyState(viewport: IViewport): void {
    this.svg
      .attr('width', viewport.width)
      .attr('height', viewport.height)

    this.mainGroup.selectAll('*').remove()

    this.mainGroup.append('text')
      .attr('x', viewport.width / 2)
      .attr('y', viewport.height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#999')
      .attr('font-size', '14px')
      .text('Add data fields to display the Production Gantt')
  }

  public destroy(): void {
    this.svg.remove()
  }
}

// Export for Power BI
export default MineProductionGanttVisual
