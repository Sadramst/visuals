// Equipment Heatmap - Power BI Visual Implementation

import powerbi from 'powerbi-visuals-api'
import * as d3 from 'd3'
import { VisualSettings } from './settings'
import { EquipmentStatus, VisualViewModel, EquipmentRow, CellData } from './types'

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions
import IVisual = powerbi.extensibility.visual.IVisual
import IVisualHost = powerbi.extensibility.visual.IVisualHost
import DataView = powerbi.DataView

export class EquipmentHeatmapVisual implements IVisual {
  private host: IVisualHost
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  private container: d3.Selection<SVGGElement, unknown, null, undefined>
  private settings: VisualSettings

  private readonly margin = { top: 68, right: 20, bottom: 30, left: 100 }

  constructor(options: VisualConstructorOptions) {
    this.host = options.host
    this.settings = new VisualSettings()

    this.svg = d3.select(options.element)
      .append('svg')
      .classed('equipment-heatmap', true)

    this.container = this.svg.append('g')
      .classed('container', true)
  }

  public update(options: VisualUpdateOptions): void {
    if (!options.dataViews?.[0]) return

    const dataView = options.dataViews[0]
    this.settings = VisualSettings.parse(dataView)

    const viewModel = this.createViewModel(dataView)
    if (!viewModel.isValid) return

    const viewWidth = options.viewport.width
    const height = options.viewport.height

    this.svg
      .attr('width', viewWidth)
      .attr('height', height)

    // Render header
    this.renderHeader(viewWidth)

    this.render(viewModel, viewWidth - this.margin.left - this.margin.right, height - this.margin.top - this.margin.bottom)
  }

  private createViewModel(dataView: DataView): VisualViewModel {
    const defaultModel: VisualViewModel = {
      equipment: [],
      hours: Array.from({ length: 24 }, (_, i) => i),
      settings: {
        general: {
          cellSize: this.settings.general.cellSize,
          showLabels: this.settings.general.showLabels,
          showLegend: this.settings.general.showLegend
        },
        colors: {
          operating: this.settings.colors.operating,
          idle: this.settings.colors.idle,
          maintenance: this.settings.colors.maintenance,
          breakdown: this.settings.colors.breakdown,
          standby: this.settings.colors.standby
        }
      },
      isValid: false
    }

    // Validate data structure
    if (!dataView?.categorical?.categories) {
      return defaultModel
    }

    const categories = dataView.categorical.categories
    if (categories.length < 4) {
      // Need at least: equipmentId, equipmentType, hour, status
      return defaultModel
    }

    // Extract required categories by index
    const equipmentCategory = categories[0]
    const equipmentTypeCategory = categories[1]
    const hourCategory = categories[2]
    const statusCategory = categories[3]
    const reasonCodeCategory = categories[4]

    // Extract measure values
    const values = dataView.categorical.values
    const durationValues = values?.find(v => v.source.roles?.['duration'])
    const oeeValues = values?.find(v => v.source.roles?.['oeePercent'])

    // Validate that we have all required data
    if (!equipmentCategory?.values || !hourCategory?.values || !statusCategory?.values) {
      return defaultModel
    }

    // Group data by equipment
    const equipmentMap = new Map<string, CellData[]>()
    
    for (let i = 0; i < equipmentCategory.values.length; i++) {
      const equipmentId = String(equipmentCategory.values[i] || `Equip-${i}`)
      const hour = Math.floor(Number(hourCategory.values[i]) || 0)
      const rawStatus = String(statusCategory.values[i] || 'idle').toLowerCase()
      const status = rawStatus as EquipmentStatus
      const oee = Math.round(Number(oeeValues?.values[i]) || 75)
      
      // Validate hour is in valid range
      if (hour < 0 || hour > 23) {
        continue
      }

      if (!equipmentMap.has(equipmentId)) {
        equipmentMap.set(equipmentId, Array(24).fill(null).map((_, idx) => ({
          hour: idx,
          status: 'idle' as EquipmentStatus,
          oee: 0,
          color: this.getStatusColor('idle')
        })))
      }

      const cells = equipmentMap.get(equipmentId)!
      if (cells[hour]) {
        cells[hour] = {
          hour,
          status,
          oee,
          color: this.getStatusColor(status)
        }
      }
    }

    const equipment: EquipmentRow[] = Array.from(equipmentMap.entries()).map(([id, cells]) => ({
      id,
      name: id,
      cells: cells
    }))

    return {
      ...defaultModel,
      equipment,
      isValid: equipment.length > 0 && equipment.some(e => e.cells.length > 0)
    }
  }

  private getStatusColor(status: EquipmentStatus): string {
    const s = String(status).toLowerCase()
    switch (s) {
      case 'operating': return this.settings.colors.operating
      case 'idle': return this.settings.colors.idle
      case 'maintenance': return this.settings.colors.maintenance
      case 'breakdown': return this.settings.colors.breakdown
      case 'standby': return this.settings.colors.standby
      default: return '#CCCCCC'
    }
  }

  private render(viewModel: VisualViewModel, width: number, height: number): void {
    const cellSize = Math.min(
      viewModel.settings.general.cellSize,
      width / 24,
      (height - 60) / viewModel.equipment.length  // reserve space for OEE cards
    )

    // Set container position
    this.container.attr('transform', `translate(${this.margin.left},${this.margin.top})`)

    // Clear existing content
    this.container.selectAll('*').remove()

    // Render OEE summary cards
    this.renderOEECards(viewModel, width)

    // Draw hour labels
    if (viewModel.settings.general.showLabels) {
      this.container.selectAll('.hour-label')
        .data(viewModel.hours)
        .enter()
        .append('text')
        .classed('hour-label', true)
        .attr('x', (d) => (d as number) * cellSize + cellSize / 2)
        .attr('y', 50)  // shifted down for OEE cards
        .attr('text-anchor', 'middle')
        .style('font-size', `${this.settings.labels.fontSize}px`)
        .style('fill', this.settings.labels.fontColor)
        .text(d => `${d}:00`)
    }

    // Draw equipment rows (shifted down for OEE cards)
    const rows = this.container.selectAll('.equipment-row')
      .data(viewModel.equipment)
      .enter()
      .append('g')
      .classed('equipment-row', true)
      .attr('transform', (_, i) => `translate(0, ${60 + i * cellSize})`)

    // Equipment labels
    if (viewModel.settings.general.showLabels) {
      rows.append('text')
        .classed('equipment-label', true)
        .attr('x', -10)
        .attr('y', cellSize / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .style('font-size', `${this.settings.labels.fontSize}px`)
        .style('fill', this.settings.labels.fontColor)
        .text(d => (d as EquipmentRow).name)

      // Per-row utilisation percentage
      rows.append('text')
        .classed('util-label', true)
        .attr('x', 24 * cellSize + 8)
        .attr('y', cellSize / 2)
        .attr('dominant-baseline', 'middle')
        .style('font-size', '9px')
        .style('font-weight', '700')
        .text(d => {
          const row = d as EquipmentRow
          const opCells = row.cells.filter(c => c.status === 'operating').length
          const pct = (opCells / 24 * 100)
          return `${pct.toFixed(0)}%`
        })
        .style('fill', d => {
          const row = d as EquipmentRow
          const opCells = row.cells.filter(c => c.status === 'operating').length
          const pct = opCells / 24 * 100
          return pct >= 80 ? '#00B050' : pct >= 60 ? '#E07A1F' : '#C00000'
        })
    }

    // Draw cells
    rows.selectAll('.cell')
      .data(d => (d as EquipmentRow).cells)
      .enter()
      .append('rect')
      .classed('cell', true)
      .attr('x', d => (d as CellData).hour * cellSize)
      .attr('y', 0)
      .attr('width', cellSize - 1)
      .attr('height', cellSize - 1)
      .attr('rx', 2)
      .attr('fill', d => (d as CellData).color)
      .style('cursor', 'pointer')
      .on('mouseover', function() {
        d3.select(this).style('opacity', 0.8)
      })
      .on('mouseout', function() {
        d3.select(this).style('opacity', 1)
      })

    // Draw legend
    if (viewModel.settings.general.showLegend) {
      this.renderLegend(viewModel)
    }
  }

  private renderHeader(width: number): void {
    this.svg.selectAll('.header').remove()
    const header = this.svg.append('g').classed('header', true)

    // Gradient bg
    const defs = this.svg.selectAll('defs').data([0]).join('defs')
    const grad = defs.selectAll('#heatmapHeaderGrad').data([0]).join('linearGradient').attr('id', 'heatmapHeaderGrad').attr('x1', '0%').attr('x2', '100%')
    grad.selectAll('stop').data([{ o: '0%', c: '#0A2540' }, { o: '100%', c: '#1a3a5c' }]).join('stop').attr('offset', d => d.o).attr('stop-color', d => d.c)

    header.append('rect').attr('width', width).attr('height', 48).attr('fill', 'url(#heatmapHeaderGrad)')

    const iconGrad = defs.selectAll('#heatmapIconGrad').data([0]).join('linearGradient').attr('id', 'heatmapIconGrad').attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '100%')
    iconGrad.selectAll('stop').data([{ o: '0%', c: '#00D4FF' }, { o: '100%', c: '#7B61FF' }]).join('stop').attr('offset', d => d.o).attr('stop-color', d => d.c)

    header.append('rect').attr('x', 12).attr('y', 8).attr('width', 32).attr('height', 32).attr('rx', 8).attr('fill', 'url(#heatmapIconGrad)')
    header.append('text').attr('x', 28).attr('y', 30).attr('text-anchor', 'middle').attr('font-size', '16px').attr('fill', '#fff').text('⚙')

    header.append('text').attr('x', 52).attr('y', 22).attr('font-size', '14px').attr('font-weight', '800').attr('fill', '#FFFFFF').attr('letter-spacing', '0.5').text('APPILICO')
    header.append('text').attr('x', 52).attr('y', 38).attr('font-size', '10px').attr('fill', '#00D4FF').attr('letter-spacing', '2').text('EQUIPMENT OEE')
  }

  private renderOEECards(viewModel: VisualViewModel, width: number): void {
    const allCells = viewModel.equipment.flatMap(e => e.cells)
    const totalCells = allCells.length || 1
    const operating = allCells.filter(c => c.status === 'operating').length
    const idle = allCells.filter(c => c.status === 'idle').length
    const maint = allCells.filter(c => c.status === 'maintenance').length
    const breakdown = allCells.filter(c => c.status === 'breakdown').length

    const availability = ((totalCells - breakdown - maint) / totalCells * 100)
    const utilisation = (operating / totalCells * 100)
    const avgOEE = allCells.reduce((s, c) => s + c.oee, 0) / totalCells

    const cards = [
      { label: 'OEE', value: `${avgOEE.toFixed(0)}%`, colour: avgOEE >= 75 ? '#00B050' : avgOEE >= 55 ? '#E07A1F' : '#C00000' },
      { label: 'AVAILABILITY', value: `${availability.toFixed(0)}%`, colour: availability >= 85 ? '#00B050' : '#E07A1F' },
      { label: 'UTILISATION', value: `${utilisation.toFixed(0)}%`, colour: utilisation >= 70 ? '#00B050' : '#E07A1F' },
      { label: 'BREAKDOWNS', value: `${breakdown}`, colour: breakdown === 0 ? '#00B050' : '#C00000' },
    ]

    const cardW = (width - 30) / cards.length
    cards.forEach((card, i) => {
      const x = i * (cardW + 6)
      const g = this.container.append('g').attr('transform', `translate(${x}, -8)`)

      g.append('rect').attr('width', cardW).attr('height', 38).attr('rx', 6).attr('fill', '#FFFFFF').attr('stroke', '#e0e0e0').attr('stroke-width', 0.5)
      g.append('rect').attr('width', 3).attr('height', 38).attr('rx', 1.5).attr('fill', card.colour)
      g.append('text').attr('x', 12).attr('y', 14).style('font-size', '8px').style('fill', '#5A6978').style('text-transform', 'uppercase').style('letter-spacing', '0.5px').style('font-weight', '600').text(card.label)
      g.append('text').attr('x', 12).attr('y', 32).style('font-size', '16px').style('font-weight', '800').style('fill', card.colour).text(card.value)
    })
  }

  private renderLegend(viewModel: VisualViewModel): void {
    const legendData = [
      { status: 'Operating', color: viewModel.settings.colors.operating },
      { status: 'Idle', color: viewModel.settings.colors.idle },
      { status: 'Maintenance', color: viewModel.settings.colors.maintenance },
      { status: 'Breakdown', color: viewModel.settings.colors.breakdown },
      { status: 'Standby', color: viewModel.settings.colors.standby }
    ]

    const legend = this.container.append('g')
      .classed('legend', true)
      .attr('transform', `translate(0, ${-this.margin.top + 5})`)

    const items = legend.selectAll('.legend-item')
      .data(legendData)
      .enter()
      .append('g')
      .classed('legend-item', true)
      .attr('transform', (_, i) => `translate(${i * 90}, 0)`)

    items.append('rect')
      .attr('width', 12)
      .attr('height', 12)
      .attr('rx', 2)
      .attr('fill', d => d.color)

    items.append('text')
      .attr('x', 16)
      .attr('y', 10)
      .style('font-size', '10px')
      .style('fill', this.settings.labels.fontColor)
      .text(d => d.status)
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return { cards: [] }
  }
}
