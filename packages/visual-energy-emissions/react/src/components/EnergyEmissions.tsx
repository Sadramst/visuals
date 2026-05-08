import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { motion } from 'framer-motion'

const BRAND = {
  navy: '#0A2540', cyan: '#00D4FF', ochre: '#E07A1F',
  green: '#00B050', red: '#C00000', grey: '#5A6978',
  lightGrey: '#F4F6F8', white: '#FFFFFF', purple: '#7B61FF',
}

const SCOPE_COLOURS = { 1: '#C00000', 2: '#E07A1F', 3: '#7B61FF' }

export interface EmissionDataPoint {
  period: string; source: string; scope: number; siteName: string
  emissionsTCO2: number; energyGJ: number; intensityRate: number
  ngerTarget: number; renewablePct: number
}

export interface ScopeSummary { scope: number; totalTCO2: number; pctOfTotal: number; colour: string }

export interface EnergyEmissionsProps {
  dataPoints: EmissionDataPoint[]; width?: number; height?: number
}

export function EnergyEmissions({ dataPoints, width, height }: EnergyEmissionsProps) {
  const { scopeData, barData, totalEmissions, avgIntensity, renewableShare, ngerCompliant } = useMemo(() => {
    const total = dataPoints.reduce((s, d) => s + d.emissionsTCO2, 0)
    const scopeData = [1, 2, 3].map(s => {
      const t = dataPoints.filter(d => d.scope === s).reduce((sum, d) => sum + d.emissionsTCO2, 0)
      return { name: `Scope ${s}`, value: t, colour: (SCOPE_COLOURS as any)[s] }
    })

    const periods = [...new Set(dataPoints.map(d => d.period))].sort()
    const barData = periods.map(p => {
      const rows = dataPoints.filter(d => d.period === p)
      return {
        period: p,
        Scope1: rows.filter(r => r.scope === 1).reduce((s, r) => s + r.emissionsTCO2, 0),
        Scope2: rows.filter(r => r.scope === 2).reduce((s, r) => s + r.emissionsTCO2, 0),
        Scope3: rows.filter(r => r.scope === 3).reduce((s, r) => s + r.emissionsTCO2, 0),
      }
    })

    const avgIntensity = dataPoints.length > 0 ? dataPoints.reduce((s, d) => s + d.intensityRate, 0) / dataPoints.length : 0
    const renewableShare = dataPoints.length > 0 ? dataPoints.reduce((s, d) => s + d.renewablePct, 0) / dataPoints.length : 0
    const avgNger = dataPoints.length > 0 ? dataPoints.reduce((s, d) => s + d.ngerTarget, 0) / dataPoints.length : 0

    return { scopeData, barData, totalEmissions: total, avgIntensity, renewableShare, ngerCompliant: avgIntensity <= avgNger || avgNger === 0 }
  }, [dataPoints])

  return (
    <div style={{ fontFamily: 'Segoe UI Variable, Inter, sans-serif', background: BRAND.lightGrey, padding: 16, width, height, overflow: 'auto', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.navy, marginBottom: 4 }}>Energy & Emissions</div>
      <div style={{ fontSize: 10, color: BRAND.grey, marginBottom: 16 }}>Scope 1 / 2 / 3 • Intensity • NGER Compliance</div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Emissions', value: `${(totalEmissions / 1000).toFixed(1)}k tCO₂e`, color: BRAND.navy },
          { label: 'Avg Intensity', value: `${avgIntensity.toFixed(1)} kgCO₂/t`, color: BRAND.cyan },
          { label: 'Renewable Share', value: `${renewableShare.toFixed(0)}%`, color: BRAND.green },
          { label: 'NGER Status', value: ngerCompliant ? 'Compliant' : 'Non-Compliant', color: ngerCompliant ? BRAND.green : BRAND.red },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            style={{ background: BRAND.white, borderRadius: 8, padding: 12, borderLeft: `3px solid ${c.color}` }}>
            <div style={{ fontSize: 9, color: BRAND.grey, textTransform: 'uppercase', letterSpacing: 1 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Donut */}
        <div style={{ background: BRAND.white, borderRadius: 8, padding: 12, flex: '0 0 160px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.navy, marginBottom: 8 }}>Scope Split</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={scopeData} dataKey="value" innerRadius={30} outerRadius={55} paddingAngle={3}>
                {scopeData.map((s, i) => <Cell key={i} fill={s.colour} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stacked bars */}
        <div style={{ background: BRAND.white, borderRadius: 8, padding: 12, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.navy, marginBottom: 8 }}>Emissions by Period</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 9 }} />
              <YAxis tickFormatter={v => `${v / 1000}k`} tick={{ fontSize: 9 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Scope1" stackId="a" fill={SCOPE_COLOURS[1]} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Scope2" stackId="a" fill={SCOPE_COLOURS[2]} />
              <Bar dataKey="Scope3" stackId="a" fill={SCOPE_COLOURS[3]} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
