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
      height / viewModel.equipment.length
    )

    // Set container position
    this.container.attr('transform', `translate(${this.margin.left},${this.margin.top})`)

    // Clear existing content
    this.container.selectAll('*').remove()

    // Draw hour labels
    if (viewModel.settings.general.showLabels) {
      this.container.selectAll('.hour-label')
        .data(viewModel.hours)
        .enter()
        .append('text')
        .classed('hour-label', true)
        .attr('x', (d) => d * cellSize + cellSize / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', `${this.settings.labels.fontSize}px`)
        .style('fill', this.settings.labels.fontColor)
        .text(d => `${d}:00`)
    }

    // Draw equipment rows
    const rows = this.container.selectAll('.equipment-row')
      .data(viewModel.equipment)
      .enter()
      .append('g')
      .classed('equipment-row', true)
      .attr('transform', (_, i) => `translate(0, ${i * cellSize})`)

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
        .text(d => d.name)
    }

    // Draw cells
    rows.selectAll('.cell')
      .data(d => d.cells)
      .enter()
      .append('rect')
      .classed('cell', true)
      .attr('x', d => d.hour * cellSize)
      .attr('y', 0)
      .attr('width', cellSize - 1)
      .attr('height', cellSize - 1)
      .attr('rx', 2)
      .attr('fill', d => d.color)
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
    // Remove old header if exists
    this.svg.selectAll('.header').remove()

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
      .attr('font-size', '14px')
      .attr('font-weight', '700')
      .attr('fill', '#00D4FF')
      .text('♦ Appilico')

    // Title
    header.append('text')
      .attr('x', 120)
      .attr('y', 18)
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('fill', '#FFFFFF')
      .text('Equipment Status Monitor')
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
