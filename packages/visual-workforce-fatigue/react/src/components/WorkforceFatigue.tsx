import { useMemo, Fragment } from 'react'
import { motion } from 'framer-motion'

const BRAND = {
  navy: '#0A2540', cyan: '#00D4FF', ochre: '#E07A1F',
  green: '#00B050', red: '#C00000', grey: '#5A6978',
  lightGrey: '#F4F6F8', white: '#FFFFFF', purple: '#7B61FF',
}

export interface RosterDataPoint {
  date: string; crewName: string; shiftType: string; siteName: string
  headcount: number; hoursWorked: number; fatigueScore: number
  absentPct: number; utilPct: number
}

export interface CrewSummary {
  crewName: string; avgFatigue: number; avgUtil: number
  totalHours: number; avgAbsent: number; status: 'normal' | 'warning' | 'critical'
}

export interface WorkforceFatigueProps {
  dataPoints: RosterDataPoint[]; fatigueThreshold?: number
  width?: number; height?: number
}

function fatigueColor(score: number, threshold: number): string {
  if (score >= threshold) return BRAND.red
  if (score >= threshold * 0.7) return BRAND.ochre
  return BRAND.green
}

export function WorkforceFatigue({ dataPoints, fatigueThreshold = 70, width, height }: WorkforceFatigueProps) {
  const { crewSummaries, overallFatigue, overallUtil, totalHeadcount, heatmapData, dates, crews } = useMemo(() => {
    const crews = [...new Set(dataPoints.map(d => d.crewName))]
    const dates = [...new Set(dataPoints.map(d => d.date))].sort()
    const crewSummaries: CrewSummary[] = crews.map(c => {
      const rows = dataPoints.filter(d => d.crewName === c)
      const avgFat = rows.reduce((s, r) => s + r.fatigueScore, 0) / (rows.length || 1)
      const avgUtil = rows.reduce((s, r) => s + r.utilPct, 0) / (rows.length || 1)
      const totalHrs = rows.reduce((s, r) => s + r.hoursWorked, 0)
      const avgAbs = rows.reduce((s, r) => s + r.absentPct, 0) / (rows.length || 1)
      return {
        crewName: c, avgFatigue: avgFat, avgUtil, totalHours: totalHrs, avgAbsent: avgAbs,
        status: (avgFat >= fatigueThreshold ? 'critical' : avgFat >= fatigueThreshold * 0.7 ? 'warning' : 'normal') as CrewSummary['status'],
      }
    })

    const heatmapData = new Map<string, number>()
    dataPoints.forEach(d => heatmapData.set(`${d.crewName}|${d.date}`, d.fatigueScore))

    const overallFatigue = dataPoints.length > 0 ? dataPoints.reduce((s, d) => s + d.fatigueScore, 0) / dataPoints.length : 0
    const overallUtil = dataPoints.length > 0 ? dataPoints.reduce((s, d) => s + d.utilPct, 0) / dataPoints.length : 0
    const totalHeadcount = Math.max(...dataPoints.map(d => d.headcount), 0)

    return { crewSummaries, overallFatigue, overallUtil, totalHeadcount, heatmapData, dates, crews }
  }, [dataPoints, fatigueThreshold])

  const cellColor = (score: number) => {
    const t = Math.min(score / 100, 1)
    if (t < 0.3) return '#00B050'
    if (t < 0.5) return '#7ECC49'
    if (t < 0.7) return '#E0C040'
    if (t < 0.85) return '#E07A1F'
    return '#C00000'
  }

  return (
    <div style={{ fontFamily: 'Segoe UI Variable, Inter, sans-serif', background: BRAND.lightGrey, padding: 16, width, height, overflow: 'auto', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.navy, marginBottom: 4 }}>Workforce & Fatigue</div>
      <div style={{ fontSize: 10, color: BRAND.grey, marginBottom: 16 }}>Roster Heatmap • Crew Fatigue • FIFO Patterns</div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Overall Fatigue', value: overallFatigue.toFixed(0), color: fatigueColor(overallFatigue, fatigueThreshold) },
          { label: 'Utilisation', value: `${overallUtil.toFixed(0)}%`, color: BRAND.cyan },
          { label: 'Headcount', value: String(totalHeadcount), color: BRAND.navy },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            style={{ background: BRAND.white, borderRadius: 8, padding: 12, borderLeft: `3px solid ${c.color}` }}>
            <div style={{ fontSize: 9, color: BRAND.grey, textTransform: 'uppercase', letterSpacing: 1 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Crew cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {crewSummaries.map((crew, i) => {
          const sc = crew.status === 'critical' ? BRAND.red : crew.status === 'warning' ? BRAND.ochre : BRAND.green
          return (
            <motion.div key={crew.crewName} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
              style={{ background: BRAND.white, borderRadius: 8, padding: 10, borderLeft: `3px solid ${sc}`, minWidth: 120 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.navy }}>{crew.crewName}</div>
              <div style={{ fontSize: 9, color: BRAND.grey, marginTop: 4 }}>Fatigue: {crew.avgFatigue.toFixed(0)}</div>
              <div style={{ fontSize: 9, color: BRAND.grey }}>Util: {crew.avgUtil.toFixed(0)}%</div>
              <div style={{ fontSize: 9, color: BRAND.grey }}>Absent: {crew.avgAbsent.toFixed(1)}%</div>
            </motion.div>
          )
        })}
      </div>

      {/* Heatmap */}
      {dates.length > 0 && crews.length > 0 && (
        <div style={{ background: BRAND.white, borderRadius: 8, padding: 12, overflow: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.navy, marginBottom: 8 }}>Fatigue Heatmap</div>
          <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${Math.min(dates.length, 60)}, 1fr)`, gap: 1 }}>
            <div />
            {dates.slice(0, 60).map(d => (
              <div key={d} style={{ fontSize: 6, color: BRAND.grey, textAlign: 'center', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{d.slice(5)}</div>
            ))}
            {crews.map(crew => (
              <Fragment key={crew}>
                <div style={{ fontSize: 9, color: BRAND.grey, display: 'flex', alignItems: 'center' }}>{crew}</div>
                {dates.slice(0, 60).map(date => {
                  const score = heatmapData.get(`${crew}|${date}`) || 0
                  return <div key={date} style={{ background: cellColor(score), borderRadius: 2, minHeight: 12 }} title={`${crew} | ${date} | ${score.toFixed(0)}`} />
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
