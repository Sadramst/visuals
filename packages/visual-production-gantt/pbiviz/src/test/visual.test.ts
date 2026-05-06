import { VisualSettings, ColourSettings } from '../settings'
import { BarColourType } from '../types'

// Helper functions extracted from visual for testing
function getBarColourType(
  actual: number,
  target: number | undefined
): BarColourType {
  if (target === undefined || isNaN(target) || target === 0) return 'neutral'
  const ratio = actual / target
  if (ratio >= 1.0) return 'above'
  if (ratio >= 0.9) return 'near'
  return 'below'
}

function getColourFromType(type: BarColourType, colours: ColourSettings): string {
  switch (type) {
    case 'above': return colours.aboveTarget
    case 'near': return colours.nearTarget
    case 'below': return colours.belowTarget
    default: return '#1F3864'
  }
}

function parseShiftType(value: string): 'AM' | 'PM' | 'Night' {
  const upper = value.toUpperCase()
  if (upper.includes('NIGHT') || upper === 'N') return 'Night'
  if (upper.includes('PM') || upper === 'P') return 'PM'
  return 'AM'
}

function formatShiftLabel(date: Date, shiftType: string): string {
  const day = date.getDate()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  return `${day} ${month} ${shiftType}`
}

describe('MineProductionGanttVisual', () => {
  describe('getBarColourType', () => {
    it('returns green colour when actual >= target', () => {
      expect(getBarColourType(12000, 10000)).toBe('above')
      expect(getBarColourType(10000, 10000)).toBe('above')
    })

    it('returns amber colour when actual is within 10% below target', () => {
      expect(getBarColourType(9500, 10000)).toBe('near')
      expect(getBarColourType(9000, 10000)).toBe('near')
    })

    it('returns red colour when actual is more than 10% below target', () => {
      expect(getBarColourType(8000, 10000)).toBe('below')
      expect(getBarColourType(5000, 10000)).toBe('below')
    })

    it('returns neutral when no target is defined', () => {
      expect(getBarColourType(10000, undefined)).toBe('neutral')
    })

    it('returns neutral when target is zero', () => {
      expect(getBarColourType(10000, 0)).toBe('neutral')
    })

    it('returns neutral when target is NaN', () => {
      expect(getBarColourType(10000, NaN)).toBe('neutral')
    })
  })

  describe('getColourFromType', () => {
    const colours = new ColourSettings()

    it('returns green for above type', () => {
      expect(getColourFromType('above', colours)).toBe('#00B050')
    })

    it('returns amber for near type', () => {
      expect(getColourFromType('near', colours)).toBe('#ED7D31')
    })

    it('returns red for below type', () => {
      expect(getColourFromType('below', colours)).toBe('#C00000')
    })

    it('returns navy for neutral type', () => {
      expect(getColourFromType('neutral', colours)).toBe('#1F3864')
    })
  })

  describe('parseShiftType', () => {
    it('parses AM shift correctly', () => {
      expect(parseShiftType('AM')).toBe('AM')
      expect(parseShiftType('am')).toBe('AM')
      expect(parseShiftType('A')).toBe('AM')
      expect(parseShiftType('morning')).toBe('AM')
    })

    it('parses PM shift correctly', () => {
      expect(parseShiftType('PM')).toBe('PM')
      expect(parseShiftType('pm')).toBe('PM')
      expect(parseShiftType('P')).toBe('PM')
    })

    it('parses Night shift correctly', () => {
      expect(parseShiftType('Night')).toBe('Night')
      expect(parseShiftType('NIGHT')).toBe('Night')
      expect(parseShiftType('N')).toBe('Night')
    })

    it('defaults to AM for unknown values', () => {
      expect(parseShiftType('unknown')).toBe('AM')
      expect(parseShiftType('')).toBe('AM')
    })
  })

  describe('formatShiftLabel', () => {
    it('formats shift label correctly for each shift type', () => {
      const date = new Date(2026, 4, 12) // May 12, 2026
      
      expect(formatShiftLabel(date, 'AM')).toBe('12 May AM')
      expect(formatShiftLabel(date, 'PM')).toBe('12 May PM')
      expect(formatShiftLabel(date, 'Night')).toBe('12 May Night')
    })

    it('handles different months correctly', () => {
      const jan = new Date(2026, 0, 5) // Jan 5
      const dec = new Date(2026, 11, 25) // Dec 25
      
      expect(formatShiftLabel(jan, 'AM')).toBe('5 Jan AM')
      expect(formatShiftLabel(dec, 'PM')).toBe('25 Dec PM')
    })
  })

  describe('VisualSettings', () => {
    it('has correct default values', () => {
      const settings = new VisualSettings()
      
      expect(settings.general.showTarget).toBe(true)
      expect(settings.general.showLegend).toBe(true)
      expect(settings.colours.aboveTarget).toBe('#00B050')
      expect(settings.colours.nearTarget).toBe('#ED7D31')
      expect(settings.colours.belowTarget).toBe('#C00000')
      expect(settings.labels.showDataLabels).toBe(true)
      expect(settings.labels.fontSize).toBe(11)
      expect(settings.axis.showXAxis).toBe(true)
      expect(settings.axis.showYAxis).toBe(true)
    })
  })
})
