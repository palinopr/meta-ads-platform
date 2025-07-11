'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

export interface SparklineData {
  value: number
}

interface SparklineProps {
  data: SparklineData[]
  color?: string
  height?: number
  strokeWidth?: number
  className?: string
}

export function Sparkline({
  data,
  color = '#10b981',
  height = 40,
  strokeWidth = 2,
  className = ''
}: SparklineProps) {
  // Handle empty or invalid data
  if (!data || data.length === 0) {
    return null
  }

  // Calculate min and max for better visualization
  const values = data.map(d => d.value).filter(v => v !== null && v !== undefined)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = (max - min) * 0.1 || 1

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={strokeWidth}
            dot={false}
            animationDuration={300}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}