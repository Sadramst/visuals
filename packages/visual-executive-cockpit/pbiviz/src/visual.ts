// Executive Cockpit — Appilico Intelligence Suite
// Single-pane CEO/COO view with 6 hero KPIs, site map, risk alerts

import powerbi from 'powerbi-visuals-api'
import * as d3 from 'd3'

import IVisual = powerbi.extensibility.IVisual
import IVisualHost = powerbi.extensibility.visual.IVisualHost
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions
import DataView = powerbi.DataView
import DataViewCategorical = powerbi.DataViewCategorical

import { VisualSettings } from './settings'
import { CockpitKPI, SiteMarker, RiskAlert, CockpitViewModel } from './types'

const BRAND = {
  navy: '#0A2540', cyan: '#00D4FF', ochre: '#E07A1F',
  green: '#00B050', red: '#C00000', grey: '#5A6978',
  lightGrey: '#F4F6F8', white: '#FFFFFF', purple: '#7B61FF',
}

export class ExecutiveCockpitVisual implements IVisual {
  private host: IVisualHost
  private container: d3.Selection<HTMLDivElement, unknown, null, undefined>
  private settings: VisualSettings

  constructor(options: VisualConstructorOptions) {
    this.host = options.host
    this.settings = new VisualSettings()
    this.container = d3.select(options.element)
      .append('div')
      .classed('cockpit-root', true)
      .style('font-family', 'Segoe UI Variable, Inter, -apple-system, sans-serif')
      .style('background', BRAND.lightGrey)
      .style('overflow-y', 'auto')
      .style('box-sizing', 'border-box')
  }

  public update(options: VisualUpdateOptions): void {
    this.container.selectAll('*').remove()

    if (!options.dataViews || !options.dataViews[0]) {
      this.renderEmptyState(options.viewport)
      return
    }

    this.settings = VisualSettings.parse(options.dataViews[0])
    const vm = this.parseDataView(options.dataViews[0])

    const w = options.viewport.width
    const h = options.viewport.height
    this.container.style('width', `${w}px`).style('height', `${h}px`).style('padding', '12px')

    this.renderHeader(w)
    this.renderKPICards(vm.kpis, w)
    if (this.settings.general.showMap && vm.sites.length > 0) {
      this.renderSiteMap(vm.sites, w)
    }
    if (this.settings.general.showRisks && vm.risks.length > 0) {
      this.renderRiskAlerts(vm.risks, w)
    }
  }

  private parseDataView(dataView: DataView): CockpitViewModel {
    const kpis: CockpitKPI[] = []
    const sites: SiteMarker[] = []
    const risks: RiskAlert[] = []

    if (!dataView.categorical) return { kpis, sites, risks, lastRefresh: new Date(), settings: this.settings.general }

    const cat: DataViewCategorical = dataView.categorical
    const categories = cat.categories || []
    const values = cat.values || []

    const kpiNameCat = categories.find(c => c.source.roles?.['kpiName'])
    const unitCat = categories.find(c => c.source.roles?.['unit'])
    const siteNameCat = categories.find(c => c.source.roles?.['siteName'])

    const currentVal = values.find(v => v.source.roles?.['currentValue'])
    const targetVal = values.find(v => v.source.roles?.['targetValue'])
    const previousVal = values.find(v => v.source.roles?.['previousValue'])
    const latVal = values.find(v => v.source.roles?.['siteLatitude'])
    const lonVal = values.find(v => v.source.roles?.['siteLongitude'])
    const siteVal = values.find(v => v.source.roles?.['siteValue'])

    if (kpiNameCat && currentVal) {
      const count = kpiNameCat.values.length
      const seenKpis = new Set<string>()
      const seenSites = new Set<string>()

      for (let i = 0; i < count; i++) {
        const kpiName = String(kpiNameCat.values[i] || '')
        const current = Number(currentVal.values[i]) || 0
        const target = Number(targetVal?.values[i]) || 0
        const previous = Number(previousVal?.values[i]) || 0
        const unit = String(unitCat?.values[i] || '')

        if (kpiName && !seenKpis.has(kpiName)) {
          seenKpis.add(kpiName)
          const varPct = target !== 0 ? ((current - target) / target) * 100 : 0
          const vsLY = previous !== 0 ? ((current - previous) / previous) * 100 : 0
          let status: 'good' | 'warning' | 'critical' = 'good'
          if (Math.abs(varPct) > 15) status = 'critical'
          else if (Math.abs(varPct) > 5) status = 'warning'

          kpis.push({ name: kpiName, currentValue: current, targetValue: target, previousValue: previous, unit, variancePct: varPct, vsLYPct: vsLY, status })
        }

        const siteName = String(siteNameCat?.values[i] || '')
        if (siteName && !seenSites.has(siteName) && latVal && lonVal) {
          seenSites.add(siteName)
          const lat = Number(latVal.values[i]) || 0
          const lon = Number(lonVal.values[i]) || 0
          const sv = Number(siteVal?.values[i]) || 0
          sites.push({ name: siteName, latitude: lat, longitude: lon, productionValue: sv, status: 'normal' })
        }
      }
    }

    // Auto-generate risk alerts from KPI analysis
    kpis.forEach(k => {
      if (k.status === 'critical') {
        risks.push({ severity: 'high', title: `${k.name} Critical`, detail: `${k.variancePct.toFixed(1)}% from target`, module: 'Auto-detected' })
      } else if (k.status === 'warning') {
        risks.push({ severity: 'medium', title: `${k.name} Warning`, detail: `${k.variancePct.toFixed(1)}% from target`, module: 'Auto-detected' })
      }
    })

    return { kpis, sites, risks, lastRefresh: new Date(), settings: this.settings.general }
  }

  private renderHeader(width: number): void {
    const header = this.container.append('div')
      .style('background', `linear-gradient(135deg, ${BRAND.navy} 0%, #1a3a5c 100%)`)
      .style('border-radius', '12px')
      .style('padding', '16px 24px')
      .style('margin-bottom', '12px')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'space-between')

    const left = header.append('div').style('display', 'flex').style('align-items', 'center').style('gap', '16px')

    left.append('div')
      .style('width', '40px').style('height', '40px')
      .style('background', `linear-gradient(135deg, ${BRAND.cyan}, ${BRAND.purple})`)
      .style('border-radius', '10px')
      .style('display', 'flex').style('align-items', 'center').style('justify-content', 'center')
      .style('font-size', '20px').style('color', BRAND.white)
      .text('◈')

    const titleGroup = left.append('div')
    titleGroup.append('div')
      .style('font-size', '18px').style('font-weight', '800')
      .style('color', BRAND.white).style('letter-spacing', '0.5px')
      .text('APPILICO')
    titleGroup.append('div')
      .style('font-size', '11px').style('color', BRAND.cyan)
      .style('letter-spacing', '2px').style('text-transform', 'uppercase')
      .text('Executive Cockpit')

    const right = header.append('div').style('text-align', 'right')
    right.append('div')
      .style('font-size', '10px').style('color', 'rgba(255,255,255,0.6)')
      .text(`Last refresh: ${new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}`)
  }

  private renderKPICards(kpis: CockpitKPI[], width: number): void {
    const grid = this.container.append('div')
      .style('display', 'grid')
      .style('grid-template-columns', `repeat(${Math.min(kpis.length, 3)}, 1fr)`)
      .style('gap', '10px')
      .style('margin-bottom', '12px')

    kpis.slice(0, 6).forEach(kpi => {
      const card = grid.append('div')
        .style('background', BRAND.white)
        .style('border-radius', '10px')
        .style('padding', '16px')
        .style('box-shadow', '0 2px 8px rgba(0,0,0,0.06)')
        .style('border-left', `4px solid ${kpi.status === 'good' ? BRAND.green : kpi.status === 'warning' ? BRAND.ochre : BRAND.red}`)

      card.append('div')
        .style('font-size', '10px').style('color', BRAND.grey)
        .style('text-transform', 'uppercase').style('letter-spacing', '1px')
        .style('margin-bottom', '6px').style('font-weight', '600')
        .text(kpi.name)

      const valueRow = card.append('div')
        .style('display', 'flex').style('align-items', 'baseline').style('gap', '8px')

      valueRow.append('div')
        .style('font-size', '28px').style('font-weight', '800').style('color', BRAND.navy)
        .text(this.formatValue(kpi.currentValue, kpi.unit))

      valueRow.append('div')
        .style('font-size', '11px').style('color', BRAND.grey)
        .text(kpi.unit)

      const badges = card.append('div')
        .style('display', 'flex').style('gap', '6px').style('margin-top', '8px')

      // vs Target badge
      const targetColor = kpi.variancePct >= 0 ? BRAND.green : BRAND.red
      badges.append('span')
        .style('font-size', '10px').style('font-weight', '600')
        .style('padding', '2px 8px').style('border-radius', '12px')
        .style('background', `${targetColor}15`).style('color', targetColor)
        .text(`${kpi.variancePct >= 0 ? '▲' : '▼'} ${Math.abs(kpi.variancePct).toFixed(1)}% vs Target`)

      // vs LY badge
      if (kpi.vsLYPct !== 0) {
        const lyColor = kpi.vsLYPct >= 0 ? BRAND.green : BRAND.red
        badges.append('span')
          .style('font-size', '10px').style('font-weight', '600')
          .style('padding', '2px 8px').style('border-radius', '12px')
          .style('background', `${lyColor}15`).style('color', lyColor)
          .text(`${kpi.vsLYPct >= 0 ? '▲' : '▼'} ${Math.abs(kpi.vsLYPct).toFixed(1)}% vs LY`)
      }
    })
  }

  private renderSiteMap(sites: SiteMarker[], width: number): void {
    const section = this.container.append('div')
      .style('background', BRAND.white)
      .style('border-radius', '10px')
      .style('padding', '16px')
      .style('margin-bottom', '12px')
      .style('box-shadow', '0 2px 8px rgba(0,0,0,0.06)')

    section.append('div')
      .style('font-size', '13px').style('font-weight', '700')
      .style('color', BRAND.navy).style('margin-bottom', '12px')
      .text('Operations Map — Australia')

    const mapContainer = section.append('div')
      .style('position', 'relative')
      .style('height', '180px')
      .style('background', '#EAF2FA')
      .style('border-radius', '8px')
      .style('overflow', 'hidden')

    // Simplified Australia outline as positioned dots
    const mapW = Math.max(width - 80, 200)
    const latRange = { min: -38, max: -12 }
    const lonRange = { min: 113, max: 154 }

    sites.forEach(site => {
      const x = ((site.longitude - lonRange.min) / (lonRange.max - lonRange.min)) * 100
      const y = ((site.latitude - latRange.min) / (latRange.max - latRange.min)) * 100

      const marker = mapContainer.append('div')
        .style('position', 'absolute')
        .style('left', `${x}%`).style('top', `${y}%`)
        .style('transform', 'translate(-50%, -50%)')
        .style('text-align', 'center')

      // Pulse ring
      marker.append('div')
        .style('width', '28px').style('height', '28px')
        .style('border-radius', '50%')
        .style('background', `${BRAND.cyan}30`)
        .style('display', 'flex').style('align-items', 'center').style('justify-content', 'center')
        .append('div')
        .style('width', '12px').style('height', '12px')
        .style('border-radius', '50%')
        .style('background', BRAND.cyan)
        .style('border', `2px solid ${BRAND.white}`)

      marker.append('div')
        .style('font-size', '8px').style('font-weight', '700')
        .style('color', BRAND.navy).style('white-space', 'nowrap')
        .style('margin-top', '2px')
        .text(site.name)

      if (site.productionValue > 0) {
        marker.append('div')
          .style('font-size', '8px').style('color', BRAND.grey)
          .text(`${(site.productionValue / 1000).toFixed(0)}kt`)
      }
    })
  }

  private renderRiskAlerts(risks: RiskAlert[], width: number): void {
    const section = this.container.append('div')
      .style('background', BRAND.white)
      .style('border-radius', '10px')
      .style('padding', '16px')
      .style('box-shadow', '0 2px 8px rgba(0,0,0,0.06)')

    const titleDiv = section.append('div')
      .style('font-size', '13px').style('font-weight', '700')
      .style('color', BRAND.navy).style('margin-bottom', '10px')
      .style('display', 'flex').style('align-items', 'center').style('gap', '8px')

    titleDiv.append('span').style('color', BRAND.red).text('⚠')
    titleDiv.append('span').text(`Active Risk Alerts (${risks.length})`)

    risks.slice(0, 5).forEach(risk => {
      const severityColor = risk.severity === 'high' ? BRAND.red : risk.severity === 'medium' ? BRAND.ochre : BRAND.grey
      const row = section.append('div')
        .style('display', 'flex').style('align-items', 'center')
        .style('gap', '10px').style('padding', '8px 12px')
        .style('margin-bottom', '4px')
        .style('background', `${severityColor}08`)
        .style('border-radius', '6px')
        .style('border-left', `3px solid ${severityColor}`)

      row.append('span')
        .style('font-size', '9px').style('font-weight', '700')
        .style('color', severityColor).style('text-transform', 'uppercase')
        .style('min-width', '50px')
        .text(risk.severity)

      row.append('span')
        .style('font-size', '11px').style('font-weight', '600').style('color', BRAND.navy)
        .text(risk.title)

      row.append('span')
        .style('font-size', '10px').style('color', BRAND.grey).style('margin-left', 'auto')
        .text(risk.detail)
    })
  }

  private renderEmptyState(viewport: powerbi.IViewport): void {
    this.container.selectAll('*').remove()
    this.container.style('width', `${viewport.width}px`).style('height', `${viewport.height}px`)
    const msg = this.container.append('div')
      .style('display', 'flex').style('flex-direction', 'column')
      .style('align-items', 'center').style('justify-content', 'center')
      .style('height', '100%').style('color', BRAND.grey)
    msg.append('div').style('font-size', '32px').text('◈')
    msg.append('div').style('font-size', '14px').style('font-weight', '600').style('margin-top', '8px').text('Executive Cockpit')
    msg.append('div').style('font-size', '11px').style('margin-top', '4px').text('Add KPI data to get started')
  }

  private formatValue(value: number, unit: string): string {
    if (unit === '%' || unit === 'per Mhrs' || unit === 'score') return value.toFixed(1)
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
    return value.toFixed(0)
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return { cards: [] }
  }
}
