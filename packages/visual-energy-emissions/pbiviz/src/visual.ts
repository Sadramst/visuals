// Energy & Emissions Visual — Appilico Intelligence Suite
// Scope 1/2/3 stacked area, intensity trend line, NGER compliance gauge

import powerbi from 'powerbi-visuals-api'
import * as d3 from 'd3'

import IVisual = powerbi.extensibility.IVisual
import IVisualHost = powerbi.extensibility.visual.IVisualHost
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions
import DataView = powerbi.DataView
import DataViewCategorical = powerbi.DataViewCategorical

import { VisualSettings } from './settings'
import { EmissionDataPoint, ScopeSummary, EmissionsViewModel } from './types'

const BRAND = {
  navy: '#0A2540', cyan: '#00D4FF', ochre: '#E07A1F',
  green: '#00B050', red: '#C00000', grey: '#5A6978',
  lightGrey: '#F4F6F8', white: '#FFFFFF', purple: '#7B61FF',
}

const SCOPE_COLOURS = {
  1: '#C00000',  // Scope 1 – direct
  2: '#E07A1F',  // Scope 2 – electricity
  3: '#7B61FF',  // Scope 3 – value chain
}

export class EnergyEmissionsVisual implements IVisual {
  private host: IVisualHost
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  private mainGroup: d3.Selection<SVGGElement, unknown, null, undefined>
  private settings: VisualSettings
  private readonly MARGINS = { top: 60, right: 24, bottom: 50, left: 65 }

  constructor(options: VisualConstructorOptions) {
    this.host = options.host
    this.settings = new VisualSettings()
    this.svg = d3.select(options.element)
      .append('svg').classed('energy-emissions', true)
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
    this.renderScopeDonut(vm, plotW, plotH)
    this.renderStackedBars(vm, plotW, plotH)
    if (this.settings.general.showIntensity) {
      this.renderIntensityLine(vm, plotW, plotH)
    }
    this.renderSummaryCards(vm, w)
  }

  private parseDataView(dataView: DataView): EmissionsViewModel {
    const dataPoints: EmissionDataPoint[] = []
    if (!dataView.categorical) {
      return { dataPoints, scopeSummaries: [], totalEmissions: 0, avgIntensity: 0, renewableShare: 0, ngerCompliant: true, settings: this.settings.general }
    }
    const cat: DataViewCategorical = dataView.categorical
    const categories = cat.categories || []
    const values = cat.values || []

    const periodCat = categories.find(c => c.source.roles?.['period'])
    const sourceCat = categories.find(c => c.source.roles?.['source'])
    const scopeCat = categories.find(c => c.source.roles?.['scope'])
    const siteCat = categories.find(c => c.source.roles?.['siteName'])
    const emVal = values.find(v => v.source.roles?.['emissionsTCO2'])
    const enVal = values.find(v => v.source.roles?.['energyGJ'])
    const intVal = values.find(v => v.source.roles?.['intensityRate'])
    const ngerVal = values.find(v => v.source.roles?.['ngerTarget'])
    const renVal = values.find(v => v.source.roles?.['renewablePct'])

    const count = periodCat?.values.length || 0
    for (let i = 0; i < count; i++) {
      dataPoints.push({
        period: String(periodCat?.values[i] || ''),
        source: String(sourceCat?.values[i] || ''),
        scope: Number(scopeCat?.values[i]) || 1,
        siteName: String(siteCat?.values[i] || ''),
        emissionsTCO2: Number(emVal?.values[i]) || 0,
        energyGJ: Number(enVal?.values[i]) || 0,
        intensityRate: Number(intVal?.values[i]) || 0,
        ngerTarget: Number(ngerVal?.values[i]) || 0,
        renewablePct: Number(renVal?.values[i]) || 0,
      })
    }

    const totalEmissions = d3.sum(dataPoints, d => d.emissionsTCO2)
    const avgIntensity = d3.mean(dataPoints, d => d.intensityRate) || 0
    const renewableShare = d3.mean(dataPoints, d => d.renewablePct) || 0

    const scopeSummaries: ScopeSummary[] = [1, 2, 3].map(s => {
      const total = d3.sum(dataPoints.filter(d => d.scope === s), d => d.emissionsTCO2)
      return {
        scope: s,
        totalTCO2: total,
        pctOfTotal: totalEmissions > 0 ? (total / totalEmissions) * 100 : 0,
        colour: (SCOPE_COLOURS as any)[s] || BRAND.grey,
      }
    })

    const avgNger = d3.mean(dataPoints, d => d.ngerTarget) || 0
    const ngerCompliant = avgIntensity <= avgNger || avgNger === 0

    return { dataPoints, scopeSummaries, totalEmissions, avgIntensity, renewableShare, ngerCompliant, settings: this.settings.general }
  }

  private renderTitle(w: number): void {
    this.svg.append('text')
      .attr('x', this.MARGINS.left).attr('y', 28)
      .style('font-size', '15px').style('font-weight', '700')
      .style('fill', BRAND.navy)
      .text('Energy & Emissions')
    this.svg.append('text')
      .attr('x', this.MARGINS.left).attr('y', 44)
      .style('font-size', '10px').style('fill', BRAND.grey)
      .text('Scope 1 / 2 / 3 • Intensity • NGER Compliance')
  }

  private renderScopeDonut(vm: EmissionsViewModel, plotW: number, plotH: number): void {
    const r = Math.min(plotW * 0.15, plotH * 0.35, 60)
    const cx = plotW * 0.12
    const cy = plotH * 0.4

    const pie = d3.pie<ScopeSummary>().value(d => d.totalTCO2).sort(null)
    const arc = d3.arc<d3.PieArcDatum<ScopeSummary>>().innerRadius(r * 0.55).outerRadius(r)

    const g = this.mainGroup.append('g').attr('transform', `translate(${cx},${cy})`)

    g.selectAll('path')
      .data(pie(vm.scopeSummaries))
      .join('path')
      .attr('d', arc as any)
      .attr('fill', d => (d.data as ScopeSummary).colour)
      .attr('stroke', BRAND.white).attr('stroke-width', 2)

    // Centre label
    g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.3em')
      .style('font-size', '14px').style('font-weight', '800').style('fill', BRAND.navy)
      .text(vm.totalEmissions >= 1000 ? `${(vm.totalEmissions / 1000).toFixed(0)}k` : vm.totalEmissions.toFixed(0))
    g.append('text').attr('text-anchor', 'middle').attr('dy', '1em')
      .style('font-size', '8px').style('fill', BRAND.grey)
      .text('tCO₂e')

    // Legend
    vm.scopeSummaries.forEach((s, i) => {
      const lg = g.append('g').attr('transform', `translate(${-r}, ${r + 16 + i * 14})`)
      lg.append('rect').attr('width', 8).attr('height', 8).attr('rx', 2).attr('fill', s.colour)
      lg.append('text').attr('x', 12).attr('y', 8)
        .style('font-size', '9px').style('fill', BRAND.grey)
        .text(`Scope ${s.scope}: ${s.pctOfTotal.toFixed(0)}%`)
    })
  }

  private renderStackedBars(vm: EmissionsViewModel, plotW: number, plotH: number): void {
    const periods = [...new Set(vm.dataPoints.map(d => d.period))].sort()
    if (periods.length === 0) return

    const barAreaX = plotW * 0.3
    const barAreaW = plotW * 0.65
    const barAreaH = plotH * 0.7

    const periodData = periods.map(p => {
      const rows = vm.dataPoints.filter(d => d.period === p)
      return {
        period: p,
        scope1: d3.sum(rows.filter(r => r.scope === 1), r => r.emissionsTCO2),
        scope2: d3.sum(rows.filter(r => r.scope === 2), r => r.emissionsTCO2),
        scope3: d3.sum(rows.filter(r => r.scope === 3), r => r.emissionsTCO2),
      }
    })

    const x = d3.scaleBand().domain(periods).range([0, barAreaW]).padding(0.25)
    const maxY = d3.max(periodData, d => d.scope1 + d.scope2 + d.scope3) || 1
    const y = d3.scaleLinear().domain([0, maxY]).range([barAreaH, 0])

    const g = this.mainGroup.append('g').attr('transform', `translate(${barAreaX},0)`)

    // Axes
    const xAxis = g.append('g').attr('transform', `translate(0,${barAreaH})`).call(d3.axisBottom(x).tickSize(0))
    xAxis.selectAll('text').style('font-size', '8px').style('fill', BRAND.grey).attr('transform', 'rotate(-40)').attr('text-anchor', 'end')
    xAxis.select('.domain').attr('stroke', '#e0e0e0')

    const yAxis = g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d => `${(d as number) / 1000}k`).tickSize(-barAreaW))
    yAxis.selectAll('text').style('font-size', '8px').style('fill', BRAND.grey)
    yAxis.selectAll('line').attr('stroke', '#f0f0f0')
    yAxis.select('.domain').remove()

    // Stacked bars
    periodData.forEach(d => {
      const xPos = x(d.period) || 0
      const bw = x.bandwidth()
      let cumY = barAreaH

      ;[
        { val: d.scope1, col: SCOPE_COLOURS[1] },
        { val: d.scope2, col: SCOPE_COLOURS[2] },
        { val: d.scope3, col: SCOPE_COLOURS[3] },
      ].forEach(seg => {
        const segH = (seg.val / maxY) * barAreaH
        cumY -= segH
        g.append('rect')
          .attr('x', xPos).attr('y', cumY)
          .attr('width', bw).attr('height', segH)
          .attr('fill', seg.col).attr('rx', 2)
      })
    })
  }

  private renderIntensityLine(vm: EmissionsViewModel, plotW: number, plotH: number): void {
    const periods = [...new Set(vm.dataPoints.map(d => d.period))].sort()
    if (periods.length < 2) return

    const barAreaX = plotW * 0.3
    const barAreaW = plotW * 0.65
    const barAreaH = plotH * 0.7

    const intensityByPeriod = periods.map(p => {
      const rows = vm.dataPoints.filter(d => d.period === p)
      return { period: p, intensity: d3.mean(rows, r => r.intensityRate) || 0 }
    })

    const x = d3.scalePoint<string>().domain(periods).range([0, barAreaW]).padding(0.5)
    const maxI = d3.max(intensityByPeriod, d => d.intensity) || 1
    const y = d3.scaleLinear().domain([0, maxI * 1.2]).range([barAreaH, 0])

    const g = this.mainGroup.append('g').attr('transform', `translate(${barAreaX},0)`)

    const line = d3.line<{ period: string; intensity: number }>()
      .x(d => x(d.period) || 0).y(d => y(d.intensity)).curve(d3.curveMonotoneX)

    g.append('path')
      .datum(intensityByPeriod)
      .attr('fill', 'none').attr('stroke', BRAND.cyan)
      .attr('stroke-width', 2.5).attr('stroke-dasharray', '6,3')
      .attr('d', line as any)

    intensityByPeriod.forEach(d => {
      g.append('circle')
        .attr('cx', x(d.period) || 0).attr('cy', y(d.intensity))
        .attr('r', 3).attr('fill', BRAND.cyan).attr('stroke', BRAND.white).attr('stroke-width', 1.5)
    })

    // Right axis label
    g.append('text')
      .attr('x', barAreaW + 8).attr('y', y(intensityByPeriod[intensityByPeriod.length - 1].intensity))
      .style('font-size', '8px').style('fill', BRAND.cyan).attr('dominant-baseline', 'middle')
      .text(`${intensityByPeriod[intensityByPeriod.length - 1].intensity.toFixed(1)} kg/t`)
  }

  private renderSummaryCards(vm: EmissionsViewModel, w: number): void {
    const cards = [
      { label: 'Total Emissions', value: `${(vm.totalEmissions / 1000).toFixed(1)}k tCO₂e`, colour: BRAND.navy },
      { label: 'Avg Intensity', value: `${vm.avgIntensity.toFixed(1)} kgCO₂/t`, colour: BRAND.cyan },
      { label: 'Renewable Share', value: `${vm.renewableShare.toFixed(0)}%`, colour: BRAND.green },
      { label: 'NGER Status', value: vm.ngerCompliant ? 'Compliant' : 'Non-Compliant', colour: vm.ngerCompliant ? BRAND.green : BRAND.red },
    ]

    const cardG = this.svg.append('g').attr('transform', `translate(${this.MARGINS.left}, ${this.MARGINS.top - 18})`)

    cards.forEach((c, i) => {
      const x = i * ((w - this.MARGINS.left - this.MARGINS.right) / cards.length)
      cardG.append('text').attr('x', x).attr('y', -10)
        .style('font-size', '8px').style('fill', BRAND.grey).style('text-transform', 'uppercase').style('letter-spacing', '0.5px')
        .text(c.label)
      // Value intentionally omitted from header — shown in the chart
    })
  }

  private renderEmptyState(w: number, h: number): void {
    this.svg.attr('width', w).attr('height', h)
    this.svg.append('text')
      .attr('x', w / 2).attr('y', h / 2).attr('text-anchor', 'middle')
      .style('font-size', '13px').style('fill', BRAND.grey)
      .text('Add emissions data to get started')
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return { cards: [] }
  }
}
