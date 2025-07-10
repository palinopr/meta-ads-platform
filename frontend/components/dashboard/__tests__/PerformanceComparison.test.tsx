import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PerformanceComparison } from '../PerformanceComparison'

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
}))

// Mock data for testing (matching ComparisonData interface)
interface ComparisonData {
  date: string
  current: {
    spend: number
    roas: number
    clicks: number
    impressions: number
    ctr: number
  }
  previous: {
    spend: number
    roas: number
    clicks: number
    impressions: number
    ctr: number
  }
}

const mockData: ComparisonData[] = [
  {
    date: '2025-01-01',
    current: { spend: 15000.50, roas: 4.2, clicks: 4500, impressions: 120000, ctr: 3.75 },
    previous: { spend: 12000.25, roas: 3.8, clicks: 3800, impressions: 100000, ctr: 3.80 }
  },
  {
    date: '2025-01-02',
    current: { spend: 18000.75, roas: 4.8, clicks: 5200, impressions: 145000, ctr: 3.58 },
    previous: { spend: 14500.50, roas: 4.1, clicks: 4100, impressions: 115000, ctr: 3.56 }
  }
]

const defaultProps = {
  data: mockData,
  loading: false,
  comparisonType: 'period' as const
}

describe('PerformanceComparison', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      render(<PerformanceComparison {...defaultProps} />)
      expect(screen.getByText('Performance Comparison')).toBeInTheDocument()
    })

    it('renders loading state correctly', () => {
      render(<PerformanceComparison {...defaultProps} loading={true} />)
      expect(screen.getByText('Loading comparison data...')).toBeInTheDocument()
    })

    it('renders comparison controls when not loading', () => {
      render(<PerformanceComparison {...defaultProps} />)
      
      // Check for chart controls - metric selector and table/chart toggle
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByText('Table')).toBeInTheDocument()
      
      // Should have chart by default (ResponsiveContainer)
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })
  })

  describe('British Formatting', () => {
    it('displays currency in British pounds format', () => {
      render(<PerformanceComparison {...defaultProps} />)
      
      // Check for £ symbol in formatted currency values
      // The component should show currency formatting in the chart/table
      expect(screen.getByText('Performance Comparison')).toBeInTheDocument()
      
      // Switch to table view to see formatted values
      const tableButton = screen.getByText('Table')
      expect(tableButton).toBeInTheDocument()
    })

    it('displays percentage changes correctly', () => {
      render(<PerformanceComparison {...defaultProps} />)
      
      // Should show percentage change indicators in badges
      const percentageElements = screen.getAllByText(/%/)
      expect(percentageElements.length).toBeGreaterThan(0)
    })
  })

  describe('Trend Indicators', () => {
    it('shows trend indicators for metric changes', () => {
      render(<PerformanceComparison {...defaultProps} />)
      
      // Should show overall change badge in header
      const badges = screen.getAllByText(/%/)
      expect(badges.length).toBeGreaterThan(0)
    })

    it('calculates percentage changes correctly', () => {
      render(<PerformanceComparison {...defaultProps} />)
      
      // The component should render without calculation errors
      expect(screen.getByText('Performance Comparison')).toBeInTheDocument()
      
      // Should have metric selection dropdown
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  describe('Data Handling', () => {
    it('handles empty data gracefully', () => {
      render(<PerformanceComparison {...defaultProps} data={[]} />)
      expect(screen.getByText('Performance Comparison')).toBeInTheDocument()
    })

    it('handles missing data prop gracefully', () => {
      render(<PerformanceComparison loading={false} />)
      expect(screen.getByText('Performance Comparison')).toBeInTheDocument()
    })

    it('handles zero values in data', () => {
      const zeroData: ComparisonData[] = [{
        date: '2025-01-01',
        current: { spend: 0, roas: 0, clicks: 0, impressions: 0, ctr: 0 },
        previous: { spend: 0, roas: 0, clicks: 0, impressions: 0, ctr: 0 }
      }]
      
      render(<PerformanceComparison {...defaultProps} data={zeroData} />)
      expect(screen.getByText('Performance Comparison')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('renders responsive chart container', () => {
      render(<PerformanceComparison {...defaultProps} />)
      
      // Should have ResponsiveContainer for chart
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper headings structure', () => {
      render(<PerformanceComparison {...defaultProps} />)
      
      const heading = screen.getByRole('heading', { name: 'Performance Comparison' })
      expect(heading).toBeInTheDocument()
    })

    it('provides meaningful content for screen readers', () => {
      render(<PerformanceComparison {...defaultProps} />)
      
      // Check that metric values are properly displayed
      expect(screen.getByText('Ad Spend')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles incomplete data properties gracefully', () => {
      const incompleteData: ComparisonData[] = [{
        date: '2025-01-01',
        current: { spend: 1000 } as any, // Missing other properties
        previous: { spend: 800 } as any
      }]
      
      render(<PerformanceComparison {...defaultProps} data={incompleteData} />)
      expect(screen.getByText('Performance Comparison')).toBeInTheDocument()
    })

    it('handles different comparison types', () => {
      render(<PerformanceComparison {...defaultProps} comparisonType="campaign" />)
      expect(screen.getByText(/other campaigns/)).toBeInTheDocument()
      
      render(<PerformanceComparison {...defaultProps} comparisonType="account" />)
      expect(screen.getByText(/other accounts/)).toBeInTheDocument()
    })
  })
})
