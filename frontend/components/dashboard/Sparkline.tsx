'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface SparklineProps {
  data: Array<{
    date: string
    value: number
  }>
  color?: string
  height?: number
  strokeWidth?: number
  className?: string
}

export function Sparkline({ 
  data, 
  color = '#3b82f6', 
  height = 40,
  strokeWidth = 2,
  className = ''
}: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div 
        className={`bg-gray-100 dark:bg-gray-800 rounded opacity-50 ${className}`}
        style={{ height }}
      />
    )
  }

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color}
            strokeWidth={strokeWidth}
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}