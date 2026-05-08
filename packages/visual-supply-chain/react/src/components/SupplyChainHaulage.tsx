import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

const BRAND = {
  navy: '#0A2540', cyan: '#00D4FF', ochre: '#E07A1F',
  green: '#00B050', red: '#C00000', grey: '#5A6978',
  lightGrey: '#F4F6F8', white: '#FFFFFF', purple: '#7B61FF',
}

const SEGMENT_COLOURS: Record<string, string> = {
  Queue: '#C00000', Load: '#E07A1F', Haul: '#0A2540', Dump: '#00D4FF', Return: '#7B61FF',
}

export interface HaulageDataPoint {
  date: string; routeName: string; truckId: string; siteName: string
  cycleTimeMin: number; payloadT: number; targetPayload: number
  queueTimeMin: number; loadTimeMin: number; haulTimeMin: number
  dumpTimeMin: number; returnTimeMin: number; trips: number
}

export interface RouteSummary {
  routeName: string; avgCycleTime: number; avgPayload: number
  payloadEfficiency: number; totalTrips: number; avgQueueTime: number
}

export interface SupplyChainProps {
  dataPoints: HaulageDataPoint[]; width?: number; height?: number
}

export function SupplyChainHaulage({ dataPoints, width, height }: SupplyChainProps) {
  const { cycleData, routeSummaries, overallCycle, overallEff, totalTrips, avgQueue } = useMemo(() => {
    const n = dataPoints.length || 1
    const cycleData = ['Queue', 'Load', 'Haul', 'Dump', 'Return'].map(seg => {
      const key = `${seg.toLowerCase()}TimeMin` as keyof HaulageDataPoint
      return { segment: seg, avgMinutes: dataPoints.reduce((s, d) => s + Number(d[key]), 0) / n, fill: SEGMENT_COLOURS[seg] }
    })

    const routes = [...new Set(dataPoints.map(d => d.routeName))]
    const routeSummaries: RouteSummary[] = routes.map(r => {
      const rows = dataPoints.filter(d => d.routeName === r)
      const rn = rows.length || 1
      const avgP = rows.reduce((s, d) => s + d.payloadT, 0) / rn
      const avgT = rows.reduce((s, d) => s + d.targetPayload, 0) / rn || 1
      return {
        routeName: r,
        avgCycleTime: rows.reduce((s, d) => s + d.cycleTimeMin, 0) / rn,
        avgPayload: avgP,
        payloadEfficiency: (avgP / avgT) * 100,
        totalTrips: rows.reduce((s, d) => s + d.trips, 0),
        avgQueueTime: rows.reduce((s, d) => s + d.queueTimeMin, 0) / rn,
      }
    })

    const overallCycle = dataPoints.reduce((s, d) => s + d.cycleTimeMin, 0) / n
    const avgP = dataPoints.reduce((s, d) => s + d.payloadT, 0) / n
    const avgT = dataPoints.reduce((s, d) => s + d.targetPayload, 0) / n || 1

    return {
      cycleData, routeSummaries, overallCycle,
      overallEff: (avgP / avgT) * 100,
      totalTrips: dataPoints.reduce((s, d) => s + d.trips, 0),
      avgQueue: dataPoints.reduce((s, d) => s + d.queueTimeMin, 0) / n,
    }
  }, [dataPoints])

  return (
    <div style={{ fontFamily: 'Segoe UI Variable, Inter, sans-serif', background: BRAND.lightGrey, padding: 16, width, height, overflow: 'auto', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.navy, marginBottom: 4 }}>Supply Chain & Haulage</div>
      <div style={{ fontSize: 10, color: BRAND.grey, marginBottom: 16 }}>Cycle Time • Payload • Queue Analysis • Routes</div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Avg Cycle', value: `${overallCycle.toFixed(1)} min`, color: BRAND.navy },
          { label: 'Payload Eff', value: `${overallEff.toFixed(0)}%`, color: overallEff >= 90 ? BRAND.green : BRAND.ochre },
          { label: 'Total Trips', value: totalTrips.toLocaleString(), color: BRAND.cyan },
          { label: 'Avg Queue', value: `${avgQueue.toFixed(1)} min`, color: avgQueue > 10 ? BRAND.red : BRAND.green },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            style={{ background: BRAND.white, borderRadius: 8, padding: 12, borderLeft: `3px solid ${c.color}` }}>
            <div style={{ fontSize: 9, color: BRAND.grey, textTransform: 'uppercase', letterSpacing: 1 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Cycle breakdown chart */}
      <div style={{ background: BRAND.white, borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.navy, marginBottom: 8 }}>Cycle Time Breakdown</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={cycleData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={v => `${v}m`} />
            <YAxis type="category" dataKey="segment" tick={{ fontSize: 9 }} width={50} />
            <Tooltip formatter={(v: number) => `${v.toFixed(1)} min`} />
            <Bar dataKey="avgMinutes" radius={[0, 4, 4, 0]}>
              {cycleData.map((d, i) => (
                <motion.rect key={i} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Route table */}
      {routeSummaries.length > 0 && (
        <div style={{ background: BRAND.white, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.navy, marginBottom: 8 }}>Route Performance</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                {['Route', 'Avg Cycle', 'Payload Eff', 'Queue', 'Trips'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '4px 8px', fontSize: 8, color: BRAND.grey, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {routeSummaries.map(r => {
                const effCol = r.payloadEfficiency >= 90 ? BRAND.green : r.payloadEfficiency >= 75 ? BRAND.ochre : BRAND.red
                return (
                  <tr key={r.routeName} style={{ borderBottom: '1px solid #f4f4f4' }}>
                    <td style={{ padding: '4px 8px', fontWeight: 600, color: BRAND.navy }}>{r.routeName}</td>
                    <td style={{ padding: '4px 8px', color: BRAND.grey }}>{r.avgCycleTime.toFixed(1)} min</td>
                    <td style={{ padding: '4px 8px', color: effCol, fontWeight: 600 }}>{r.payloadEfficiency.toFixed(0)}%</td>
                    <td style={{ padding: '4px 8px', color: r.avgQueueTime > 10 ? BRAND.red : BRAND.grey }}>{r.avgQueueTime.toFixed(1)} min</td>
                    <td style={{ padding: '4px 8px', color: BRAND.grey }}>{r.totalTrips.toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
