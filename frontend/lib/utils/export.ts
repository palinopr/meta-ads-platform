import { Campaign, CampaignMetrics } from '@/lib/api/meta'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100)
}

export async function exportToCsv(
  campaigns: Campaign[],
  metrics: Record<string, CampaignMetrics[]>
): Promise<void> {
  // Prepare data for CSV
  const rows: string[][] = []
  
  // Headers
  rows.push([
    'Campaign Name',
    'Campaign ID',
    'Status',
    'Objective',
    'Daily Budget',
    'Lifetime Budget',
    'Date',
    'Impressions',
    'Clicks',
    'CTR (%)',
    'CPC ($)',
    'CPM ($)',
    'Spend ($)',
    'Conversions',
    'ROAS'
  ])

  // Data rows
  campaigns.forEach(campaign => {
    const campaignMetrics = metrics[campaign.campaign_id] || []
    
    if (campaignMetrics.length === 0) {
      // Add campaign row without metrics
      rows.push([
        campaign.name,
        campaign.campaign_id,
        campaign.status,
        campaign.objective,
        campaign.daily_budget?.toString() || '',
        campaign.lifetime_budget?.toString() || '',
        '',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0'
      ])
    } else {
      campaignMetrics.forEach(metric => {
        rows.push([
          campaign.name,
          campaign.campaign_id,
          campaign.status,
          campaign.objective,
          campaign.daily_budget?.toString() || '',
          campaign.lifetime_budget?.toString() || '',
          metric.date,
          metric.impressions.toString(),
          metric.clicks.toString(),
          metric.ctr.toFixed(2),
          metric.cpc.toFixed(2),
          metric.cpm.toFixed(2),
          metric.spend.toFixed(2),
          metric.conversions.toString(),
          metric.roas.toFixed(2)
        ])
      })
    }
  })

  // Convert to CSV string
  const csvContent = rows.map(row => 
    row.map(cell => `"${cell.replace(/"/g, '""')}`).join(',')
  ).join('\n')

  // Download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `campaign-analytics-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export async function exportToPdf(
  campaigns: Campaign[],
  metrics: Record<string, CampaignMetrics[]>
): Promise<void> {
  // For PDF export, we'll create a simple HTML structure and use the browser's print functionality
  const htmlContent = generatePdfHtml(campaigns, metrics)
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('Could not open print window')
  }

  printWindow.document.write(htmlContent)
  printWindow.document.close()
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.print()
    printWindow.close()
  }
}

function generatePdfHtml(
  campaigns: Campaign[],
  metrics: Record<string, CampaignMetrics[]>
): string {
  const reportHeader = `
    <div class="report-header">
      <h1>Campaign Analytics Report</h1>
      <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Campaigns:</strong> ${campaigns.length}</p>
    </div>
  `

  const campaignSections = campaigns.map(campaign => {
    const campaignMetrics = metrics[campaign.campaign_id] || []
    const budget = campaign.daily_budget || campaign.lifetime_budget || 0
    const budgetType = campaign.daily_budget ? '(Daily)' : '(Lifetime)'

    let metricsTable = ''
    if (campaignMetrics.length > 0) {
      const tableRows = campaignMetrics.map(metric => `
        <tr>
          <td style="border: 1px solid #d1d5db; padding: 8px;">${metric.date}</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">${metric.impressions.toLocaleString()}</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">${metric.clicks.toLocaleString()}</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">${formatPercentage(metric.ctr)}</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">${formatCurrency(metric.cpc)}</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">${formatCurrency(metric.spend)}</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">${metric.conversions.toLocaleString()}</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">${metric.roas.toFixed(2)}x</td>
        </tr>
      `).join('')

      metricsTable = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Date</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Impressions</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Clicks</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">CTR</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">CPC</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Spend</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Conversions</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">ROAS</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `
    } else {
      metricsTable = `
        <p style="text-align: center; color: #6b7280; font-style: italic; margin: 20px 0;">
          No metrics data available for this campaign.
        </p>
      `
    }

    return `
      <div style="margin-bottom: 40px; page-break-inside: avoid;">
        <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
          ${campaign.name}
        </h3>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0;">
          <div>
            <p><strong>Campaign ID:</strong> ${campaign.campaign_id}</p>
            <p><strong>Status:</strong> ${campaign.status}</p>
            <p><strong>Objective:</strong> ${campaign.objective}</p>
            <p><strong>Budget:</strong> ${formatCurrency(budget)} ${budgetType}</p>
          </div>
        </div>

        ${metricsTable}
      </div>
    `
  }).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Campaign Analytics Report</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #374151;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        h1 {
          color: #1f2937;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 10px;
        }
        
        .report-header {
          margin-bottom: 40px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
        }
      </style>
    </head>
    <body>
      ${reportHeader}
      ${campaignSections}
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280;">
        <p>Meta Ads Analytics Platform - Campaign Performance Report</p>
      </div>
    </body>
    </html>
  `
}
