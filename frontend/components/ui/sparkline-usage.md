# Sparkline Chart Component

## Overview
The Sparkline component provides minimal, inline charts perfect for showing trends within metric cards. Built on Recharts, it displays a simple line chart without axes, labels, or other decorations.

## Features
- **Minimal Design**: Clean line charts without visual clutter
- **Responsive**: Automatically adjusts to container width
- **Customizable**: Color, height, and stroke width options
- **Graceful Degradation**: Handles missing or empty data
- **Smooth Animation**: 300ms transition for data updates
- **Connected Nulls**: Draws continuous lines even with missing data points

## Usage

### Basic Implementation
```tsx
import { Sparkline, SparklineData } from "@/components/ui/sparkline"

const data: SparklineData[] = [
  { value: 100 },
  { value: 110 },
  { value: 105 },
  { value: 120 },
  { value: 130 }
]

<Sparkline data={data} />
```

### With MetricCard Integration
```tsx
import { MetricCard } from "@/components/dashboard/MetricCard"

<MetricCard
  title="Revenue"
  value={130000}
  format="currency"
  trend="up"
  sparklineData={[
    { value: 100000 },
    { value: 110000 },
    { value: 105000 },
    { value: 120000 },
    { value: 130000 }
  ]}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| data | SparklineData[] | required | Array of data points |
| color | string | '#10b981' | Line color (default: green) |
| height | number | 40 | Chart height in pixels |
| strokeWidth | number | 2 | Line thickness |
| className | string | '' | Additional CSS classes |

## Color Scheme
The MetricCard automatically sets sparkline colors based on trend:
- **Positive trend (up)**: `#10b981` (green)
- **Negative trend (down)**: `#ef4444` (red)
- **Neutral/stable**: `#6b7280` (gray)

## Data Format
```typescript
interface SparklineData {
  value: number
}
```

## Examples

### 7-Day Trend with Daily Data
```tsx
const last7Days = [
  { value: 1200 },
  { value: 1350 },
  { value: 1280 },
  { value: 1400 },
  { value: 1380 },
  { value: 1450 },
  { value: 1500 }
]

<Sparkline data={last7Days} color="#10b981" />
```

### Handling Real-Time Updates
```tsx
const [data, setData] = useState<SparklineData[]>([])

useEffect(() => {
  const fetchData = async () => {
    const metrics = await api.getMetricHistory(7) // Last 7 days
    setData(metrics.map(m => ({ value: m.value })))
  }
  
  fetchData()
  const interval = setInterval(fetchData, 60000) // Update every minute
  
  return () => clearInterval(interval)
}, [])

<Sparkline data={data} />
```

### Generating Sample Data
```tsx
function generateSparklineData(
  baseValue: number,
  days: number = 7,
  trend: 'up' | 'down' | 'stable' = 'stable'
): SparklineData[] {
  const data: SparklineData[] = []
  
  for (let i = days - 1; i >= 0; i--) {
    let multiplier = 1
    
    if (trend === 'up') {
      multiplier = 1 - (i * 0.05)
    } else if (trend === 'down') {
      multiplier = 1 + (i * 0.05)
    }
    
    const variance = (Math.random() - 0.5) * 0.15
    const value = baseValue * multiplier * (1 + variance)
    
    data.push({ value: Math.max(0, value) })
  }
  
  return data
}
```

## Best Practices

1. **Data Points**: Use 5-10 data points for best visual clarity
2. **Update Frequency**: Limit updates to prevent excessive re-renders
3. **Loading States**: Show skeleton while data loads
4. **Error Handling**: Provide empty array or null for missing data
5. **Responsive Design**: Let the container control width

## Integration with Meta API

```tsx
// Fetch historical metrics from Meta API
const fetchSparklineData = async (accountId: string, metric: string) => {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 7)
  
  const response = await supabase.functions.invoke('get-metric-history', {
    body: {
      accountId,
      metric,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }
  })
  
  if (response.data) {
    return response.data.map(point => ({ value: point.value }))
  }
  
  return []
}
```

## Troubleshooting

### Sparkline not showing
- Check that data array is not empty
- Verify all values are valid numbers
- Ensure container has defined width

### Performance issues
- Limit data points to 10-20 maximum
- Use React.memo for parent components
- Throttle data updates

### Visual glitches
- Set fixed height on container
- Use consistent data ranges
- Avoid negative values for most metrics