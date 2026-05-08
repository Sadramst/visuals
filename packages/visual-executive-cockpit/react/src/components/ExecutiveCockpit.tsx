import { motion } from 'framer-motion'

const BRAND = {
  navy: '#0A2540', cyan: '#00D4FF', ochre: '#E07A1F',
  green: '#00B050', red: '#C00000', grey: '#5A6978',
  lightGrey: '#F4F6F8', white: '#FFFFFF', purple: '#7B61FF',
}

export interface CockpitKPI {
  name: string; currentValue: number; targetValue: number; previousValue: number
  unit: string; variancePct: number; vsLYPct: number; status: 'good' | 'warning' | 'critical'
}

export interface SiteMarker {
  name: string; latitude: number; longitude: number; productionValue: number
  status: 'normal' | 'warning' | 'critical'
}

export interface RiskAlert {
  severity: 'high' | 'medium' | 'low'; title: string; detail: string; module: string
}

export interface CockpitProps {
  kpis: CockpitKPI[]; sites: SiteMarker[]; risks: RiskAlert[]
  lastRefresh?: Date; width?: number; height?: number
}

const statusColor = (s: string) =>
  s === 'good' || s === 'normal' ? BRAND.green : s === 'warning' ? BRAND.ochre : BRAND.red

const fmtVal = (v: number, u: string) => {
  if (u === '%' || u === 'score') return v.toFixed(1)
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}k`
  return v.toFixed(0)
}

function KPICard({ kpi, idx }: { kpi: CockpitKPI; idx: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08, duration: 0.4 }}
      style={{
        background: BRAND.white, borderRadius: 10, padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        borderLeft: `4px solid ${statusColor(kpi.status)}`,
      }}
    >
      <div style={{ fontSize: 10, color: BRAND.grey, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>
        {kpi.name}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: BRAND.navy }}>{fmtVal(kpi.currentValue, kpi.unit)}</span>
        <span style={{ fontSize: 11, color: BRAND.grey }}>{kpi.unit}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <Badge value={kpi.variancePct} label="vs Target" />
        {kpi.vsLYPct !== 0 && <Badge value={kpi.vsLYPct} label="vs LY" />}
      </div>
    </motion.div>
  )
}

function Badge({ value, label }: { value: number; label: string }) {
  const color = value >= 0 ? BRAND.green : BRAND.red
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: `${color}15`, color }}>
      {value >= 0 ? '▲' : '▼'} {Math.abs(value).toFixed(1)}% {label}
    </span>
  )
}

export function ExecutiveCockpit({ kpis, risks, lastRefresh, width, height }: CockpitProps) {
  return (
    <div style={{ fontFamily: 'Segoe UI Variable, Inter, sans-serif', background: BRAND.lightGrey, padding: 12, width, height, overflow: 'auto', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${BRAND.navy}, #1a3a5c)`, borderRadius: 12, padding: '16px 24px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, background: `linear-gradient(135deg, ${BRAND.cyan}, ${BRAND.purple})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: BRAND.white }}>◈</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: BRAND.white, letterSpacing: 0.5 }}>APPILICO</div>
            <div style={{ fontSize: 11, color: BRAND.cyan, letterSpacing: 2, textTransform: 'uppercase' }}>Executive Cockpit</div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>
          {lastRefresh ? `Last refresh: ${lastRefresh.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(kpis.length, 3)}, 1fr)`, gap: 10, marginBottom: 12 }}>
        {kpis.slice(0, 6).map((k, i) => <KPICard key={k.name} kpi={k} idx={i} />)}
      </div>

      {/* Risk Alerts */}
      {risks.length > 0 && (
        <div style={{ background: BRAND.white, borderRadius: 10, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy, marginBottom: 10 }}>
            <span style={{ color: BRAND.red }}>⚠</span> Active Risk Alerts ({risks.length})
          </div>
          {risks.slice(0, 5).map((r, i) => {
            const sc = r.severity === 'high' ? BRAND.red : r.severity === 'medium' ? BRAND.ochre : BRAND.grey
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 4, background: `${sc}08`, borderRadius: 6, borderLeft: `3px solid ${sc}` }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: sc, textTransform: 'uppercase', minWidth: 50 }}>{r.severity}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: BRAND.navy }}>{r.title}</span>
                <span style={{ fontSize: 10, color: BRAND.grey, marginLeft: 'auto' }}>{r.detail}</span>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
