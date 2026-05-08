// Workforce & Fatigue Visual — Appilico Intelligence Suite
// Roster heatmap, crew fatigue scores, FIFO rotation patterns

import powerbi from 'powerbi-visuals-api'
import * as d3 from 'd3'

import IVisual = powerbi.extensibility.IVisual
import IVisualHost = powerbi.extensibility.visual.IVisualHost
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions
import DataView = powerbi.DataView
import DataViewCategorical = powerbi.DataViewCategorical

import { VisualSettings } from './settings'
import { RosterDataPoint, CrewSummary, FatigueHeatmapCell, WorkforceViewModel } from './types'

const BRAND = {
  navy: '#0A2540', cyan: '#00D4FF', ochre: '#E07A1F',
  green: '#00B050', red: '#C00000', grey: '#5A6978',
  lightGrey: '#F4F6F8', white: '#FFFFFF', purple: '#7B61FF',
}

export class WorkforceFatigueVisual implements IVisual {
  private host: IVisualHost
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  private mainGroup: d3.Selection<SVGGElement, unknown, null, undefined>
  private settings: VisualSettings
  private readonly MARGINS = { top: 60, right: 20, bottom: 40, left: 80 }

  constructor(options: VisualConstructorOptions) {
    this.host = options.host
    this.settings = new VisualSettings()
    this.svg = d3.select(options.element)
      .append('svg').classed('workforce-fatigue', true)
    this.mainGroup = this.svg.append('g').classed('main-group', true)
  }

  public update(options: VisualUpdateOptions): void {
    this.svg.selectAll('*').remove()
    this.mainGroup = this.svg.append('g').classed('main-group', true)

    const w = options.viewport.width
    const h = options.viewport.height
    this.svg.attr('width', w).attr('height', h)
    this.mainGroup.attr('transform', `translate(${this.MARGINS.left},${this.MARGINS.top})`)

    if (!options.dataViews || !options.dataViews[0]) {
      this.renderEmptyState(w, h)
      return
    }

    this.settings = VisualSettings.parse(options.dataViews[0])
    const vm = this.parseDataView(options.dataViews[0])
    const plotW = w - this.MARGINS.left - this.MARGINS.right
    const plotH = h - this.MARGINS.top - this.MARGINS.bottom

    this.renderTitle(w)
    this.renderCrewCards(vm, plotW)

    if (this.settings.general.showFatigueHeatmap && vm.heatmapCells.length > 0) {
      this.renderFatigueHeatmap(vm, plotW, plotH)
    }
  }

  private parseDataView(dataView: DataView): WorkforceViewModel {
    const dataPoints: RosterDataPoint[] = []
    if (!dataView.categorical) {
      return { dataPoints, crewSummaries: [], heatmapCells: [], overallFatigue: 0, overallUtil: 0, totalHeadcount: 0, settings: this.settings.general }
    }
    const cat: DataViewCategorical = dataView.categorical
    const categories = cat.categories || []
    const values = cat.values || []

    const dateCat = categories.find(c => c.source.roles?.['date'])
    const crewCat = categories.find(c => c.source.roles?.['crewName'])
    const shiftCat = categories.find(c => c.source.roles?.['shiftType'])
    const siteCat = categories.find(c => c.source.roles?.['siteName'])
    const headVal = values.find(v => v.source.roles?.['headcount'])
    const hoursVal = values.find(v => v.source.roles?.['hoursWorked'])
    const fatVal = values.find(v => v.source.roles?.['fatigueScore'])
    const absVal = values.find(v => v.source.roles?.['absentPct'])
    const utilVal = values.find(v => v.source.roles?.['utilPct'])

    const count = dateCat?.values.length || 0
    for (let i = 0; i < count; i++) {
      dataPoints.push({
        date: String(dateCat?.values[i] || ''),
        crewName: String(crewCat?.values[i] || ''),
        shiftType: String(shiftCat?.values[i] || 'Day'),
        siteName: String(siteCat?.values[i] || ''),
        headcount: Number(headVal?.values[i]) || 0,
        hoursWorked: Number(hoursVal?.values[i]) || 0,
        fatigueScore: Number(fatVal?.values[i]) || 0,
        absentPct: Number(absVal?.values[i]) || 0,
        utilPct: Number(utilVal?.values[i]) || 0,
      })
    }

    const crews = [...new Set(dataPoints.map(d => d.crewName))]
    const crewSummaries: CrewSummary[] = crews.map(c => {
      const rows = dataPoints.filter(d => d.crewName === c)
      const avgFat = d3.mean(rows, r => r.fatigueScore) || 0
      const avgUtil = d3.mean(rows, r => r.utilPct) || 0
      const totalHrs = d3.sum(rows, r => r.hoursWorked)
      const avgAbs = d3.mean(rows, r => r.absentPct) || 0
      const threshold = this.settings.general.fatigueThreshold
      return {
        crewName: c, avgFatigue: avgFat, avgUtil, totalHours: totalHrs, avgAbsent: avgAbs,
        status: avgFat >= threshold ? 'critical' : avgFat >= threshold * 0.7 ? 'warning' : 'normal' as any,
      }
    })

    const heatmapCells: FatigueHeatmapCell[] = dataPoints.map(d => ({
      date: d.date, crew: d.crewName, score: d.fatigueScore,
    }))

    return {
      dataPoints, crewSummaries, heatmapCells,
      overallFatigue: d3.mean(dataPoints, d => d.fatigueScore) || 0,
      overallUtil: d3.mean(dataPoints, d => d.utilPct) || 0,
      totalHeadcount: d3.max(dataPoints, d => d.headcount) || 0,
      settings: this.settings.general,
    }
  }

  private renderTitle(w: number): void {
    this.svg.append('text')
      .attr('x', this.MARGINS.left).attr('y', 28)
      .style('font-size', '15px').style('font-weight', '700').style('fill', BRAND.navy)
      .text('Workforce & Fatigue')
    this.svg.append('text')
      .attr('x', this.MARGINS.left).attr('y', 44)
      .style('font-size', '10px').style('fill', BRAND.grey)
      .text('Roster Heatmap • Crew Fatigue • FIFO Patterns')
  }

  private renderCrewCards(vm: WorkforceViewModel, plotW: number): void {
    const cardW = Math.min(plotW / vm.crewSummaries.length - 8, 160)
    const g = this.mainGroup.append('g').attr('transform', 'translate(0, 0)')

    vm.crewSummaries.forEach((crew, i) => {
      const x = i * (cardW + 8)
      const statusCol = crew.status === 'critical' ? BRAND.red : crew.status === 'warning' ? BRAND.ochre : BRAND.green

      const cg = g.append('g').attr('transform', `translate(${x}, 0)`)

      cg.append('rect')
        .attr('width', cardW).attr('height', 60)
        .attr('rx', 8).attr('fill', BRAND.white)
        .attr('stroke', statusCol).attr('stroke-width', 0.5)

      // Left colour accent
      cg.append('rect').attr('width', 3).attr('height', 60).attr('rx', 1.5).attr('fill', statusCol)

      cg.append('text').attr('x', 12).attr('y', 16)
        .style('font-size', '10px').style('font-weight', '700').style('fill', BRAND.navy)
        .text(crew.crewName)

      cg.append('text').attr('x', 12).attr('y', 30)
        .style('font-size', '9px').style('fill', BRAND.grey)
        .text(`Fatigue: ${crew.avgFatigue.toFixed(0)}`)

      cg.append('text').attr('x', 12).attr('y', 42)
        .style('font-size', '9px').style('fill', BRAND.grey)
        .text(`Util: ${crew.avgUtil.toFixed(0)}%`)

      cg.append('text').attr('x', 12).attr('y', 54)
        .style('font-size', '9px').style('fill', BRAND.grey)
        .text(`Absent: ${crew.avgAbsent.toFixed(1)}%`)
    })
  }

  private renderFatigueHeatmap(vm: WorkforceViewModel, plotW: number, plotH: number): void {
    const dates = [...new Set(vm.heatmapCells.map(c => c.date))].sort()
    const crews = [...new Set(vm.heatmapCells.map(c => c.crew))]

    const hmTop = 80
    const hmH = plotH - hmTop - 10
    const cellW = Math.max(plotW / dates.length, 3)
    const cellH = Math.max(hmH / crews.length, 12)

    const colourScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([100, 0]) // high fatigue = red

    const g = this.mainGroup.append('g').attr('transform', `translate(0, ${hmTop})`)

    // Crew labels
    crews.forEach((crew, i) => {
      g.append('text')
        .attr('x', -8).attr('y', i * cellH + cellH / 2)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .style('font-size', '8px').style('fill', BRAND.grey)
        .text(crew)
    })

    // Heatmap cells
    vm.heatmapCells.forEach(cell => {
      const di = dates.indexOf(cell.date)
      const ci = crews.indexOf(cell.crew)
      if (di < 0 || ci < 0) return

      g.append('rect')
        .attr('x', di * cellW).attr('y', ci * cellH)
        .attr('width', cellW - 1).attr('height', cellH - 1)
        .attr('rx', 2).attr('fill', colourScale(cell.score))
        .append('title').text(`${cell.crew} | ${cell.date} | Fatigue: ${cell.score.toFixed(0)}`)
    })

    // Legend
    const legendW = 100
    const legendG = g.append('g').attr('transform', `translate(${plotW - legendW - 10}, ${-16})`)
    const defs = this.svg.append('defs')
    const grad = defs.append('linearGradient').attr('id', 'fatigue-gradient')
    grad.append('stop').attr('offset', '0%').attr('stop-color', colourScale(0))
    grad.append('stop').attr('offset', '100%').attr('stop-color', colourScale(100))
    legendG.append('rect').attr('width', legendW).attr('height', 8).attr('rx', 4).style('fill', 'url(#fatigue-gradient)')
    legendG.append('text').attr('x', 0).attr('y', -3).style('font-size', '7px').style('fill', BRAND.grey).text('Low')
    legendG.append('text').attr('x', legendW).attr('y', -3).attr('text-anchor', 'end').style('font-size', '7px').style('fill', BRAND.grey).text('High')
  }

  private renderEmptyState(w: number, h: number): void {
    this.svg.attr('width', w).attr('height', h)
    this.svg.append('text')
      .attr('x', w / 2).attr('y', h / 2).attr('text-anchor', 'middle')
      .style('font-size', '13px').style('fill', BRAND.grey)
      .text('Add roster data to get started')
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return { cards: [] }
  }
}
