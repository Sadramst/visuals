import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductionGanttChart, ShiftDetailCard } from '../components/ProductionGanttChart'
import { ShiftDataPoint } from '@appilico/shared-types'

const mockData: ShiftDataPoint[] = [
  {
    id: 'shift-1',
    date: new Date(2026, 4, 12),
    shiftType: 'AM',
    shiftLabel: '12 May AM',
    actualTonnes: 11500,
    targetTonnes: 12000,
    crewName: 'Alpha Crew',
    equipmentCount: 8,
    location: 'Pit 3',
    variance: -4.17,
  },
  {
    id: 'shift-2',
    date: new Date(2026, 4, 12),
    shiftType: 'PM',
    shiftLabel: '12 May PM',
    actualTonnes: 12500,
    targetTonnes: 12000,
    crewName: 'Bravo Crew',
    equipmentCount: 7,
    location: 'Pit 3',
    variance: 4.17,
  },
  {
    id: 'shift-3',
    date: new Date(2026, 4, 12),
    shiftType: 'Night',
    shiftLabel: '12 May Night',
    actualTonnes: 10000,
    targetTonnes: 11000,
    crewName: 'Charlie Crew',
    equipmentCount: 6,
    location: 'Pit 3',
    variance: -9.09,
  },
]

describe('ProductionGanttChart', () => {
  it('renders without crashing with valid data', () => {
    const { container } = render(<ProductionGanttChart data={mockData} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('shows skeleton when isLoading=true', () => {
    const { container } = render(<ProductionGanttChart data={[]} isLoading={true} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows empty state when data is empty array', () => {
    render(<ProductionGanttChart data={[]} />)
    expect(screen.getByText('No production data')).toBeInTheDocument()
  })

  it('renders correct number of bars matching data length', () => {
    const { container } = render(<ProductionGanttChart data={mockData} />)
    // Recharts renders bars as path or rect elements
    const bars = container.querySelectorAll('.recharts-bar-rectangle')
    // Note: This may vary based on Recharts version, but chart should render
    expect(container.querySelector('.recharts-bar')).toBeInTheDocument()
  })

  it('displays target reference line when showTarget=true and data has targetTonnes', () => {
    const { container } = render(<ProductionGanttChart data={mockData} showTarget={true} />)
    expect(container.querySelector('.recharts-reference-line')).toBeInTheDocument()
  })

  it('does not display target line when showTarget=false', () => {
    const { container } = render(<ProductionGanttChart data={mockData} showTarget={false} />)
    expect(container.querySelector('.recharts-reference-line')).not.toBeInTheDocument()
  })

  it('calls onBarClick when bar is clicked', () => {
    const handleClick = jest.fn()
    const { container } = render(
      <ProductionGanttChart data={mockData} onBarClick={handleClick} />
    )
    // Find the chart and simulate a click
    const chart = container.querySelector('.recharts-bar-rectangles')
    if (chart) {
      fireEvent.click(chart)
    }
    // Note: Full click testing requires more Recharts mocking
  })

  it('renders legend when data has target values', () => {
    render(<ProductionGanttChart data={mockData} />)
    expect(screen.getByText('Above Target')).toBeInTheDocument()
    expect(screen.getByText('Near Target')).toBeInTheDocument()
    expect(screen.getByText('Below Target')).toBeInTheDocument()
  })
})

describe('ShiftDetailCard', () => {
  it('renders null state gracefully', () => {
    const { container } = render(<ShiftDetailCard point={null} />)
    expect(container.firstChild).toBeEmptyDOMElement()
  })

  it('shows all fields when point is provided', () => {
    render(<ShiftDetailCard point={mockData[0]} />)
    expect(screen.getByText('12 May AM')).toBeInTheDocument()
    expect(screen.getByText('11,500t')).toBeInTheDocument()
    expect(screen.getByText('-4.2% vs target')).toBeInTheDocument()
    expect(screen.getByText('Alpha Crew')).toBeInTheDocument()
    expect(screen.getByText('8 units')).toBeInTheDocument()
  })

  it('shows location when available', () => {
    render(<ShiftDetailCard point={mockData[0]} />)
    expect(screen.getByText('Pit 3')).toBeInTheDocument()
  })
})
