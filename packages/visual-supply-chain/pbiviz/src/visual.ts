// Supply Chain & Haulage Visual — Appilico Intelligence Suite
// Cycle time waterfall, payload distribution, route efficiency, queue analysis

import powerbi from 'powerbi-visuals-api'
import * as d3 from 'd3'

import IVisual = powerbi.extensibility.IVisual
import IVisualHost = powerbi.extensibility.visual.IVisualHost
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions
import DataView = powerbi.DataView
import DataViewCategorical = powerbi.DataViewCategorical

import { VisualSettings } from './settings'
import { HaulageDataPoint, CycleBreakdown, RouteSummary, HaulageViewModel } from './types'

const BRAND = {
  navy: '#0A2540', cyan: '#00D4FF', ochre: '#E07A1F',
  green: '#00B050', red: '#C00000', grey: '#5A6978',
  lightGrey: '#F4F6F8', white: '#FFFFFF', purple: '#7B61FF',
}

const SEGMENT_COLOURS: Record<string, string> = {
  Queue: '#C00000', Load: '#E07A1F', Haul: '#0A2540', Dump: '#00D4FF', Return: '#7B61FF',
}

export class SupplyChainVisual implements IVisual {
  private host: IVisualHost
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  private mainGroup: d3.Selection<SVGGElement, unknown, null, undefined>
  private settings: VisualSettings
  private readonly MARGINS = { top: 60, right: 24, bottom: 50, left: 65 }

  constructor(options: VisualConstructorOptions) {
    this.host = options.host
    this.settings = new VisualSettings()
    this.svg = d3.select(options.element)
      .append('svg').classed('supply-chain', true)
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
    this.renderSummaryRow(vm, plotW)

    if (this.settings.general.showCycleBreakdown) {
      this.renderCycleWaterfall(vm, plotW, plotH)
    }

    this.renderRouteTable(vm, plotW, plotH)
  }

  private parseDataView(dataView: DataView): HaulageViewModel {
    const dataPoints: HaulageDataPoint[] = []
    if (!dataView.categorical) {
      return { dataPoints, routeSummaries: [], cycleBreakdown: [], overallCycleTime: 0, overallPayloadEff: 0, totalTrips: 0, avgQueueTime: 0, settings: this.settings.general }
    }
    const cat: DataViewCategorical = dataView.categorical
    const categories = cat.categories || []
    const values = cat.values || []

    const dateCat = categories.find(c => c.source.roles?.['date'])
    const routeCat = categories.find(c => c.source.roles?.['routeName'])
    const truckCat = categories.find(c => c.source.roles?.['truckId'])
    const siteCat = categories.find(c => c.source.roles?.['siteName'])
    const cycleVal = values.find(v => v.source.roles?.['cycleTimeMin'])
    const payloadVal = values.find(v => v.source.roles?.['payloadT'])
    const targetVal = values.find(v => v.source.roles?.['targetPayload'])
    const queueVal = values.find(v => v.source.roles?.['queueTimeMin'])
    const loadVal = values.find(v => v.source.roles?.['loadTimeMin'])
    const haulVal = values.find(v => v.source.roles?.['haulTimeMin'])
    const dumpVal = values.find(v => v.source.roles?.['dumpTimeMin'])
    const returnVal = values.find(v => v.source.roles?.['returnTimeMin'])
    const tripsVal = values.find(v => v.source.roles?.['trips'])

    const count = dateCat?.values.length || 0
    for (let i = 0; i < count; i++) {
      dataPoints.push({
        date: String(dateCat?.values[i] || ''),
        routeName: String(routeCat?.values[i] || ''),
        truckId: String(truckCat?.values[i] || ''),
        siteName: String(siteCat?.values[i] || ''),
        cycleTimeMin: Number(cycleVal?.values[i]) || 0,
        payloadT: Number(payloadVal?.values[i]) || 0,
        targetPayload: Number(targetVal?.values[i]) || 0,
        queueTimeMin: Number(queueVal?.values[i]) || 0,
        loadTimeMin: Number(loadVal?.values[i]) || 0,
        haulTimeMin: Number(haulVal?.values[i]) || 0,
        dumpTimeMin: Number(dumpVal?.values[i]) || 0,
        returnTimeMin: Number(returnVal?.values[i]) || 0,
        trips: Number(tripsVal?.values[i]) || 0,
      })
    }

    // Cycle breakdown
    const cycleBreakdown: CycleBreakdown[] = ['Queue', 'Load', 'Haul', 'Dump', 'Return'].map(seg => {
      const key = `${seg.toLowerCase()}TimeMin` as keyof HaulageDataPoint
      return {
        segment: seg,
        avgMinutes: d3.mean(dataPoints, d => Number(d[key])) || 0,
        colour: SEGMENT_COLOURS[seg],
      }
    })

    // Route summaries
    const routes = [...new Set(dataPoints.map(d => d.routeName))]
    const routeSummaries: RouteSummary[] = routes.map(r => {
      const rows = dataPoints.filter(d => d.routeName === r)
      const avgPayload = d3.mean(rows, d => d.payloadT) || 0
      const avgTarget = d3.mean(rows, d => d.targetPayload) || 1
      return {
        routeName: r,
        avgCycleTime: d3.mean(rows, d => d.cycleTimeMin) || 0,
        avgPayload,
        payloadEfficiency: avgTarget > 0 ? (avgPayload / avgTarget) * 100 : 0,
        totalTrips: d3.sum(rows, d => d.trips),
        avgQueueTime: d3.mean(rows, d => d.queueTimeMin) || 0,
      }
    })

    const overallCycleTime = d3.mean(dataPoints, d => d.cycleTimeMin) || 0
    const avgPayload = d3.mean(dataPoints, d => d.payloadT) || 0
    const avgTarget = d3.mean(dataPoints, d => d.targetPayload) || 1
    const overallPayloadEff = avgTarget > 0 ? (avgPayload / avgTarget) * 100 : 0

    return {
      dataPoints, routeSummaries, cycleBreakdown, overallCycleTime, overallPayloadEff,
      totalTrips: d3.sum(dataPoints, d => d.trips),
      avgQueueTime: d3.mean(dataPoints, d => d.queueTimeMin) || 0,
      settings: this.settings.general,
    }
  }

  private renderTitle(w: number): void {
    this.svg.append('text')
      .attr('x', this.MARGINS.left).attr('y', 28)
      .style('font-size', '15px').style('font-weight', '700').style('fill', BRAND.navy)
      .text('Supply Chain & Haulage')
    this.svg.append('text')
      .attr('x', this.MARGINS.left).attr('y', 44)
      .style('font-size', '10px').style('fill', BRAND.grey)
      .text('Cycle Time • Payload • Queue Analysis • Routes')
  }

  private renderSummaryRow(vm: HaulageViewModel, plotW: number): void {
    const cards = [
      { label: 'Avg Cycle', value: `${vm.overallCycleTime.toFixed(1)} min`, colour: BRAND.navy },
      { label: 'Payload Eff', value: `${vm.overallPayloadEff.toFixed(0)}%`, colour: vm.overallPayloadEff >= 90 ? BRAND.green : BRAND.ochre },
      { label: 'Total Trips', value: vm.totalTrips.toLocaleString(), colour: BRAND.cyan },
      { label: 'Avg Queue', value: `${vm.avgQueueTime.toFixed(1)} min`, colour: vm.avgQueueTime > 10 ? BRAND.red : BRAND.green },
    ]

    const cardW = plotW / cards.length - 6
    cards.forEach((c, i) => {
      const x = i * (cardW + 8)
      const g = this.mainGroup.append('g').attr('transform', `translate(${x}, 0)`)

      g.append('rect').attr('width', cardW).attr('height', 40).attr('rx', 6).attr('fill', BRAND.white)
      g.append('rect').attr('width', 3).attr('height', 40).attr('rx', 1.5).attr('fill', c.colour)

      g.append('text').attr('x', 12).attr('y', 14)
        .style('font-size', '8px').style('fill', BRAND.grey).style('text-transform', 'uppercase').style('letter-spacing', '0.5px')
        .text(c.label)
      g.append('text').attr('x', 12).attr('y', 32)
        .style('font-size', '16px').style('font-weight', '800').style('fill', c.colour)
        .text(c.value)
    })
  }

  private renderCycleWaterfall(vm: HaulageViewModel, plotW: number, plotH: number): void {
    const segments = vm.cycleBreakdown
    if (segments.length === 0) return

    const wfTop = 55
    const wfH = Math.min(plotH * 0.35, 120)
    const total = d3.sum(segments, s => s.avgMinutes)

    const x = d3.scaleBand<string>().domain(segments.map(s => s.segment)).range([0, plotW * 0.9]).padding(0.15)
    const y = d3.scaleLinear().domain([0, total]).range([wfH, 0])

    const g = this.mainGroup.append('g').attr('transform', `translate(0, ${wfTop})`)

    // Waterfall bars (stacked from left, cumulative)
    let cumulative = 0
    segments.forEach(seg => {
      const barH = (seg.avgMinutes / total) * wfH
      g.append('rect')
        .attr('x', x(seg.segment) || 0)
        .attr('y', y(cumulative + seg.avgMinutes))
        .attr('width', x.bandwidth())
        .attr('height', barH)
        .attr('fill', seg.colour).attr('rx', 3)

      g.append('text')
        .attr('x', (x(seg.segment) || 0) + x.bandwidth() / 2)
        .attr('y', y(cumulative + seg.avgMinutes) - 4)
        .attr('text-anchor', 'middle')
        .style('font-size', '9px').style('font-weight', '700').style('fill', seg.colour)
        .text(`${seg.avgMinutes.toFixed(1)}m`)

      cumulative += seg.avgMinutes
    })

    // Labels
    segments.forEach(seg => {
      g.append('text')
        .attr('x', (x(seg.segment) || 0) + x.bandwidth() / 2)
        .attr('y', wfH + 14).attr('text-anchor', 'middle')
        .style('font-size', '8px').style('fill', BRAND.grey)
        .text(seg.segment)
    })

    // Total bar
    g.append('rect')
      .attr('x', plotW * 0.9 + 8).attr('y', 0)
      .attr('width', plotW * 0.08).attr('height', wfH)
      .attr('fill', BRAND.navy).attr('rx', 3).attr('opacity', 0.15)
    g.append('text')
      .attr('x', plotW * 0.94).attr('y', wfH / 2)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .style('font-size', '12px').style('font-weight', '800').style('fill', BRAND.navy)
      .text(`${total.toFixed(1)}m`)
    g.append('text')
      .attr('x', plotW * 0.94).attr('y', wfH + 14).attr('text-anchor', 'middle')
      .style('font-size', '8px').style('fill', BRAND.grey)
      .text('Total')
  }

  private renderRouteTable(vm: HaulageViewModel, plotW: number, plotH: number): void {
    if (vm.routeSummaries.length === 0) return

    const tableTop = Math.min(plotH * 0.5, 200)
    const g = this.mainGroup.append('g').attr('transform', `translate(0, ${tableTop})`)

    g.append('text').attr('y', -8)
      .style('font-size', '11px').style('font-weight', '700').style('fill', BRAND.navy)
      .text('Route Performance')

    const cols = ['Route', 'Avg Cycle', 'Payload Eff', 'Queue', 'Trips']
    const colW = plotW / cols.length

    // Header
    cols.forEach((col, i) => {
      g.append('text').attr('x', i * colW).attr('y', 10)
        .style('font-size', '8px').style('font-weight', '700').style('fill', BRAND.grey)
        .style('text-transform', 'uppercase').style('letter-spacing', '0.5px')
        .text(col)
    })

    g.append('line').attr('x1', 0).attr('x2', plotW).attr('y1', 16).attr('y2', 16).attr('stroke', '#e0e0e0')

    // Rows
    vm.routeSummaries.slice(0, 8).forEach((route, i) => {
      const y = 30 + i * 18
      const effCol = route.payloadEfficiency >= 90 ? BRAND.green : route.payloadEfficiency >= 75 ? BRAND.ochre : BRAND.red
      const qCol = route.avgQueueTime > 10 ? BRAND.red : BRAND.grey

      g.append('text').attr('x', 0 * colW).attr('y', y).style('font-size', '9px').style('fill', BRAND.navy).style('font-weight', '600').text(route.routeName)
      g.append('text').attr('x', 1 * colW).attr('y', y).style('font-size', '9px').style('fill', BRAND.grey).text(`${route.avgCycleTime.toFixed(1)} min`)
      g.append('text').attr('x', 2 * colW).attr('y', y).style('font-size', '9px').style('fill', effCol).style('font-weight', '600').text(`${route.payloadEfficiency.toFixed(0)}%`)
      g.append('text').attr('x', 3 * colW).attr('y', y).style('font-size', '9px').style('fill', qCol).text(`${route.avgQueueTime.toFixed(1)} min`)
      g.append('text').attr('x', 4 * colW).attr('y', y).style('font-size', '9px').style('fill', BRAND.grey).text(route.totalTrips.toLocaleString())
    })
  }

  private renderEmptyState(w: number, h: number): void {
    this.svg.attr('width', w).attr('height', h)
    this.svg.append('text')
      .attr('x', w / 2).attr('y', h / 2).attr('text-anchor', 'middle')
      .style('font-size', '13px').style('fill', BRAND.grey)
      .text('Add haulage data to get started')
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return { cards: [] }
  }
}
