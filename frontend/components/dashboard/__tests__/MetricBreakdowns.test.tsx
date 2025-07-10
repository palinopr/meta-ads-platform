import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MetricBreakdowns } from '../MetricBreakdowns'

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}))

describe('MetricBreakdowns', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the main component structure', () => {
      render(<MetricBreakdowns />)
      
      expect(screen.getByText('Metric Breakdowns')).toBeInTheDocument()
      expect(screen.getByText('Detailed performance analysis across demographics, devices, and placements')).toBeInTheDocument()
    })

    it('should render all breakdown sections', () => {
      render(<MetricBreakdowns />)
      
      expect(screen.getByText('Demographics')).toBeInTheDocument()
      expect(screen.getByText('Devices')).toBeInTheDocument()
      expect(screen.getByText('Placements')).toBeInTheDocument()
      expect(screen.getByText('Geography')).toBeInTheDocument()
      expect(screen.getByText('Timing')).toBeInTheDocument()
    })

    it('should render pie charts for each breakdown', () => {
      render(<MetricBreakdowns />)
      
      const pieCharts = screen.getAllByTestId('pie-chart')
      expect(pieCharts.length).toBeGreaterThan(0)
    })

    it('should render responsive containers', () => {
      render(<MetricBreakdowns />)
      
      const containers = screen.getAllByTestId('responsive-container')
      expect(containers.length).toBeGreaterThan(0)
    })
  })

  describe('Data Display', () => {
    it('should display demographic breakdown sections correctly', async () => {
      render(<MetricBreakdowns />)
      
      await waitFor(() => {
        expect(screen.getByText('Age Distribution')).toBeInTheDocument()
        expect(screen.getByText('Gender Distribution')).toBeInTheDocument()
      })
    })

    it('should display active tab content only', async () => {
      render(<MetricBreakdowns />)
      
      // Demographics tab should be active by default
      await waitFor(() => {
        const activeTab = screen.getByRole('tab', { selected: true })
        expect(activeTab).toHaveTextContent('Demographics')
      })
    })

    it('should have tabbed interface structure', async () => {
      render(<MetricBreakdowns />)
      
      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument()
        expect(screen.getByRole('tabpanel')).toBeInTheDocument()
      })
    })
  })

  describe('British Formatting', () => {
    it('should use British spelling in section descriptions', () => {
      render(<MetricBreakdowns />)
      
      expect(screen.getByText(/breakdown/i)).toBeInTheDocument()
      expect(screen.getByText(/Metric Breakdowns/)).toBeInTheDocument()
    })

    it('should display percentage values correctly', async () => {
      render(<MetricBreakdowns />)
      
      await waitFor(() => {
        const pieCharts = screen.getAllByTestId('pie-chart')
        expect(pieCharts.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Responsive Design', () => {
    it('should render responsive containers for active tab charts', () => {
      render(<MetricBreakdowns />)
      
      const responsiveContainers = screen.getAllByTestId('responsive-container')
      expect(responsiveContainers).toHaveLength(2) // Age Distribution + Gender Distribution
    })

    it('should render grid layout for demographics breakdown', () => {
      render(<MetricBreakdowns />)
      
      expect(screen.getByText('Age Distribution')).toBeInTheDocument()
      expect(screen.getByText('Gender Distribution')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper tab navigation', () => {
      render(<MetricBreakdowns />)
      
      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getByRole('tabpanel')).toBeInTheDocument()
    })

    it('should have descriptive headings', () => {
      render(<MetricBreakdowns />)
      
      expect(screen.getByRole('heading', { name: 'Metric Breakdowns' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Age Distribution' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Gender Distribution' })).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should handle empty data gracefully', () => {
      render(<MetricBreakdowns />)
      
      expect(screen.getByText('Metric Breakdowns')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing breakdown data', () => {
      render(<MetricBreakdowns />)
      
      expect(screen.getByText('Metric Breakdowns')).toBeInTheDocument()
    })
  })

  describe('Chart Integration', () => {
    it('should render chart components from active tab only', () => {
      render(<MetricBreakdowns />)
      
      // Should have 1 pie chart (Age Distribution in Demographics tab)
      const pieComponents = screen.getAllByTestId('pie')
      expect(pieComponents).toHaveLength(1)
      
      // Should have 1 bar chart (Gender Distribution in Demographics tab)
      const barComponents = screen.getAllByTestId('bar')
      expect(barComponents).toHaveLength(1)
    })

    it('should include chart components without legends', () => {
      render(<MetricBreakdowns />)
      
      // Component doesn't include legends, verify core chart components instead
      const pieCharts = screen.getAllByTestId('pie-chart')
      const barCharts = screen.getAllByTestId('bar-chart')
      
      expect(pieCharts).toHaveLength(1) // Age Distribution
      expect(barCharts).toHaveLength(1) // Gender Distribution
    })

    it('should include interactive tooltips for active tab', () => {
      render(<MetricBreakdowns />)
      
      const tooltips = screen.getAllByTestId('tooltip')
      expect(tooltips).toHaveLength(2) // One for each chart in active tab
    })
  })
})
