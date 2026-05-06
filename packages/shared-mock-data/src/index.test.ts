import {
  generateShiftData,
  generateEquipmentData,
  generateSafetyKPIs,
  generateGradeStages,
  generateCostData,
  generateSummary,
  generateAllData,
  MockDataOptions,
} from './index'

describe('shared-mock-data', () => {
  const defaultOpts: MockDataOptions = { siteId: 'pit3', dateRange: '7d' }

  describe('generateShiftData', () => {
    it('generates correct number of shifts for 7 days', () => {
      const shifts = generateShiftData({ siteId: 'pit3', dateRange: '7d' })
      expect(shifts).toHaveLength(7 * 3) // 7 days × 3 shifts
    })

    it('generates correct number of shifts for 30 days', () => {
      const shifts = generateShiftData({ siteId: 'pit3', dateRange: '30d' })
      expect(shifts).toHaveLength(30 * 3)
    })

    it('sorts shifts by date ascending', () => {
      const shifts = generateShiftData(defaultOpts)
      for (let i = 1; i < shifts.length; i++) {
        expect(shifts[i].date.getTime()).toBeGreaterThanOrEqual(shifts[i - 1].date.getTime())
      }
    })

    it('includes all required fields', () => {
      const shifts = generateShiftData(defaultOpts)
      const shift = shifts[0]
      expect(shift).toHaveProperty('id')
      expect(shift).toHaveProperty('date')
      expect(shift).toHaveProperty('shiftType')
      expect(shift).toHaveProperty('shiftLabel')
      expect(shift).toHaveProperty('actualTonnes')
      expect(shift).toHaveProperty('targetTonnes')
    })

    it('generates deterministic data with same options', () => {
      const shifts1 = generateShiftData(defaultOpts)
      const shifts2 = generateShiftData(defaultOpts)
      expect(shifts1.map(s => s.actualTonnes)).toEqual(shifts2.map(s => s.actualTonnes))
    })

    it('generates different data for different sites', () => {
      const pit3 = generateShiftData({ siteId: 'pit3', dateRange: '7d' })
      const pit7 = generateShiftData({ siteId: 'pit7', dateRange: '7d' })
      expect(pit3[0].actualTonnes).not.toEqual(pit7[0].actualTonnes)
    })

    it('includes Tuesday anomaly in recent week', () => {
      const shifts = generateShiftData({ siteId: 'pit3', dateRange: '7d' })
      const tuesdayAM = shifts.find(s => {
        const dayOfWeek = s.date.getDay()
        return dayOfWeek === 2 && s.shiftType === 'AM'
      })
      if (tuesdayAM) {
        const variance = tuesdayAM.variance ?? 0
        expect(variance).toBeLessThan(-20) // Significant underperformance
      }
    })
  })

  describe('generateEquipmentData', () => {
    it('generates 8 equipment units', () => {
      const equipment = generateEquipmentData(defaultOpts)
      expect(equipment).toHaveLength(8)
    })

    it('each unit has 24 hours of status', () => {
      const equipment = generateEquipmentData(defaultOpts)
      equipment.forEach(unit => {
        expect(unit.hourlyStatus).toHaveLength(24)
      })
    })

    it('includes D11 dozers and CAT793 trucks', () => {
      const equipment = generateEquipmentData(defaultOpts)
      const dozers = equipment.filter(e => e.type === 'Dozer')
      const trucks = equipment.filter(e => e.type === 'Truck')
      expect(dozers).toHaveLength(4)
      expect(trucks).toHaveLength(4)
    })

    it('D11-001 has hydraulic fault during hours 8-14', () => {
      const equipment = generateEquipmentData(defaultOpts)
      const d11001 = equipment.find(e => e.id === 'D11-001')
      expect(d11001).toBeDefined()
      const faultHours = d11001!.hourlyStatus.filter(
        h => h.hour >= 8 && h.hour < 14 && h.status === 'UnplannedDown'
      )
      expect(faultHours.length).toBeGreaterThan(0)
      expect(faultHours[0].reasonCode).toBe('HYD-FAULT-007')
    })

    it('CAT793-002 has scheduled maintenance during hours 6-8', () => {
      const equipment = generateEquipmentData(defaultOpts)
      const cat793002 = equipment.find(e => e.id === 'CAT793-002')
      expect(cat793002).toBeDefined()
      const maintHours = cat793002!.hourlyStatus.filter(
        h => h.hour >= 6 && h.hour < 8 && h.status === 'Maintenance'
      )
      expect(maintHours.length).toBeGreaterThan(0)
    })

    it('calculates OEE percentage correctly', () => {
      const equipment = generateEquipmentData(defaultOpts)
      equipment.forEach(unit => {
        expect(unit.oeePercent).toBeGreaterThanOrEqual(0)
        expect(unit.oeePercent).toBeLessThanOrEqual(100)
      })
    })
  })

  describe('generateSafetyKPIs', () => {
    it('generates 6 KPIs', () => {
      const kpis = generateSafetyKPIs(defaultOpts)
      expect(kpis).toHaveLength(6)
    })

    it('includes TRIFR KPI', () => {
      const kpis = generateSafetyKPIs(defaultOpts)
      const trifr = kpis.find(k => k.name === 'trifr')
      expect(trifr).toBeDefined()
      expect(trifr!.isLowerBetter).toBe(true)
      expect(trifr!.isLeading).toBe(false)
    })

    it('correctly identifies leading vs lagging indicators', () => {
      const kpis = generateSafetyKPIs(defaultOpts)
      const leading = kpis.filter(k => k.isLeading)
      const lagging = kpis.filter(k => !k.isLeading)
      expect(leading.length).toBeGreaterThan(0)
      expect(lagging.length).toBeGreaterThan(0)
    })

    it('calculates status based on target and isLowerBetter', () => {
      const kpis = generateSafetyKPIs(defaultOpts)
      kpis.forEach(kpi => {
        expect(['good', 'warning', 'bad', 'neutral']).toContain(kpi.status)
      })
    })

    it('includes trend history for TRIFR', () => {
      const kpis = generateSafetyKPIs(defaultOpts)
      const trifr = kpis.find(k => k.name === 'trifr')
      expect(trifr!.trendHistory.length).toBeGreaterThan(0)
    })
  })

  describe('generateGradeStages', () => {
    it('generates 5 stages', () => {
      const stages = generateGradeStages(defaultOpts)
      expect(stages).toHaveLength(5)
    })

    it('stages are in correct order', () => {
      const stages = generateGradeStages(defaultOpts)
      for (let i = 0; i < stages.length; i++) {
        expect(stages[i].order).toBe(i + 1)
      }
    })

    it('includes all processing stages', () => {
      const stages = generateGradeStages(defaultOpts)
      const names = stages.map(s => s.name)
      expect(names).toContain('Bench Sample')
      expect(names).toContain('ROM Stockpile')
      expect(names).toContain('Mill Feed')
      expect(names).toContain('Concentrate')
      expect(names).toContain('Final Product')
    })

    it('calculates variance from target', () => {
      const stages = generateGradeStages(defaultOpts)
      stages.forEach(stage => {
        if (stage.targetGrade !== undefined) {
          expect(stage.variance).toBeDefined()
        }
      })
    })

    it('calculates delta from previous stage', () => {
      const stages = generateGradeStages(defaultOpts)
      expect(stages[0].deltaFromPrevious).toBeUndefined() // First stage has no previous
      for (let i = 1; i < stages.length; i++) {
        expect(stages[i].deltaFromPrevious).toBeDefined()
      }
    })
  })

  describe('generateCostData', () => {
    it('generates correct number of months', () => {
      const cost7d = generateCostData({ siteId: 'pit3', dateRange: '7d' })
      const cost30d = generateCostData({ siteId: 'pit3', dateRange: '30d' })
      const cost90d = generateCostData({ siteId: 'pit3', dateRange: '90d' })
      expect(cost7d.length).toBe(1) // ceil(7/30) = 1
      expect(cost30d.length).toBe(1) // ceil(30/30) = 1
      expect(cost90d.length).toBe(3) // ceil(90/30) = 3
    })

    it('includes cost categories that sum to total', () => {
      const cost = generateCostData(defaultOpts)
      cost.forEach(point => {
        const categorySum = point.categories.reduce((sum, cat) => sum + cat.amount, 0)
        expect(Math.abs(categorySum - point.costPerTonne)).toBeLessThan(0.1)
      })
    })

    it('calculates moving average', () => {
      const cost = generateCostData({ siteId: 'pit3', dateRange: '90d' })
      cost.forEach(point => {
        expect(point.movingAverage).toBeDefined()
      })
    })

    it('identifies anomalies when over budget threshold', () => {
      const cost = generateCostData({ siteId: 'pit3', dateRange: '90d' })
      const anomalies = cost.filter(c => c.isAnomaly)
      anomalies.forEach(a => {
        if (a.budgetCostPerTonne !== undefined) {
          expect(a.costPerTonne).toBeGreaterThan(a.budgetCostPerTonne * 1.15)
        }
      })
    })

    it('includes April wet season anomaly', () => {
      const cost = generateCostData({ siteId: 'pit3', dateRange: '90d' })
      const april = cost.find(c => c.period.includes('Apr'))
      if (april) {
        expect(april.isAnomaly).toBe(true)
        expect(april.anomalyReason).toContain('Wet season')
      }
    })
  })

  describe('generateSummary', () => {
    it('returns all summary fields', () => {
      const summary = generateSummary(defaultOpts)
      expect(summary).toHaveProperty('site')
      expect(summary).toHaveProperty('dateRange')
      expect(summary).toHaveProperty('totalTonnes')
      expect(summary).toHaveProperty('avgOEE')
      expect(summary).toHaveProperty('activeIncidents')
      expect(summary).toHaveProperty('costPerTonne')
      expect(summary).toHaveProperty('tonneTrend')
      expect(summary).toHaveProperty('oeeTrend')
      expect(summary).toHaveProperty('incidentTrend')
      expect(summary).toHaveProperty('costTrend')
    })

    it('calculates total tonnes from shifts', () => {
      const summary = generateSummary(defaultOpts)
      expect(summary.totalTonnes).toBeGreaterThan(0)
    })

    it('calculates average OEE from equipment', () => {
      const summary = generateSummary(defaultOpts)
      expect(summary.avgOEE).toBeGreaterThanOrEqual(0)
      expect(summary.avgOEE).toBeLessThanOrEqual(100)
    })
  })

  describe('generateAllData', () => {
    it('returns all data types', () => {
      const data = generateAllData(defaultOpts)
      expect(data).toHaveProperty('shifts')
      expect(data).toHaveProperty('equipment')
      expect(data).toHaveProperty('safetyKPIs')
      expect(data).toHaveProperty('gradeStages')
      expect(data).toHaveProperty('costData')
      expect(data).toHaveProperty('summary')
    })

    it('generates consistent data across calls', () => {
      const data1 = generateAllData(defaultOpts)
      const data2 = generateAllData(defaultOpts)
      expect(data1.shifts.length).toBe(data2.shifts.length)
      expect(data1.equipment.length).toBe(data2.equipment.length)
    })
  })
})
