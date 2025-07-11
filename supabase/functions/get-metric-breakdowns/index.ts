import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface BreakdownData {
  demographic: {
    age: Array<{ range: string; value: number; percentage: number }>
    gender: Array<{ type: string; value: number; percentage: number }>
  }
  device: Array<{ platform: string; value: number; percentage: number }>
  placement: Array<{ name: string; value: number; percentage: number }>
}

interface FacebookBreakdownInsight {
  age?: string
  gender?: string
  device_platform?: string
  publisher_platform?: string
  platform_position?: string
  impressions: string
  clicks: string
  spend: string
  actions?: Array<{
    action_type: string
    value: string
  }>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { account_ids, date_preset = 'last_30d', metric_type = 'impressions' } = await req.json()

    if (!account_ids || !Array.isArray(account_ids) || account_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Account IDs array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user and their access token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's Meta access token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('meta_access_token')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.meta_access_token) {
      return new Response(
        JSON.stringify({ error: 'Meta access token not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize breakdown data structures
    const ageData = new Map<string, number>()
    const genderData = new Map<string, number>()
    const deviceData = new Map<string, number>()
    const placementData = new Map<string, number>()

    // Fetch breakdowns from Meta API for each account
    for (const account_id of account_ids) {
      try {
        // 1. Age and Gender breakdown
        const demographicFields = ['age', 'gender', 'impressions', 'clicks', 'spend', 'actions'].join(',')
        const demographicUrl = `https://graph.facebook.com/v19.0/act_${account_id}/insights?` +
          `fields=${demographicFields}&` +
          `breakdowns=age,gender&` +
          `date_preset=${date_preset}&` +
          `access_token=${profile.meta_access_token}`

        console.log(`Fetching demographic breakdown for account ${account_id}`)
        const demographicResponse = await fetch(demographicUrl)
        const demographicData = await demographicResponse.json()

        if (!demographicData.error && demographicData.data) {
          for (const insight of demographicData.data) {
            const value = getMetricValue(insight, metric_type)
            
            if (insight.age) {
              ageData.set(insight.age, (ageData.get(insight.age) || 0) + value)
            }
            if (insight.gender) {
              genderData.set(insight.gender, (genderData.get(insight.gender) || 0) + value)
            }
          }
        }

        // 2. Device Platform breakdown
        const deviceFields = ['device_platform', 'impressions', 'clicks', 'spend', 'actions'].join(',')
        const deviceUrl = `https://graph.facebook.com/v19.0/act_${account_id}/insights?` +
          `fields=${deviceFields}&` +
          `breakdowns=device_platform&` +
          `date_preset=${date_preset}&` +
          `access_token=${profile.meta_access_token}`

        console.log(`Fetching device breakdown for account ${account_id}`)
        const deviceResponse = await fetch(deviceUrl)
        const deviceResponseData = await deviceResponse.json()

        if (!deviceResponseData.error && deviceResponseData.data) {
          for (const insight of deviceResponseData.data) {
            const value = getMetricValue(insight, metric_type)
            if (insight.device_platform) {
              deviceData.set(insight.device_platform, (deviceData.get(insight.device_platform) || 0) + value)
            }
          }
        }

        // 3. Placement breakdown
        const placementFields = ['publisher_platform', 'platform_position', 'impressions', 'clicks', 'spend', 'actions'].join(',')
        const placementUrl = `https://graph.facebook.com/v19.0/act_${account_id}/insights?` +
          `fields=${placementFields}&` +
          `breakdowns=publisher_platform,platform_position&` +
          `date_preset=${date_preset}&` +
          `access_token=${profile.meta_access_token}`

        console.log(`Fetching placement breakdown for account ${account_id}`)
        const placementResponse = await fetch(placementUrl)
        const placementResponseData = await placementResponse.json()

        if (!placementResponseData.error && placementResponseData.data) {
          for (const insight of placementResponseData.data) {
            const value = getMetricValue(insight, metric_type)
            const placement = formatPlacement(insight.publisher_platform, insight.platform_position)
            if (placement) {
              placementData.set(placement, (placementData.get(placement) || 0) + value)
            }
          }
        }

      } catch (error) {
        console.error(`Error fetching breakdowns for account ${account_id}:`, error)
        // Continue with other accounts
      }
    }

    // Convert maps to arrays and calculate percentages
    const breakdownData: BreakdownData = {
      demographic: {
        age: convertToPercentageArray(ageData),
        gender: convertToPercentageArray(genderData)
      },
      device: convertToPercentageArray(deviceData),
      placement: convertToPercentageArray(placementData)
    }

    console.log(`✅ Successfully fetched breakdowns for ${account_ids.length} accounts`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: breakdownData,
        accounts_processed: account_ids.length,
        date_preset,
        metric_type
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-metric-breakdowns function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to get metric value based on type
function getMetricValue(insight: FacebookBreakdownInsight, metricType: string): number {
  switch (metricType) {
    case 'impressions':
      return parseInt(insight.impressions) || 0
    case 'clicks':
      return parseInt(insight.clicks) || 0
    case 'spend':
      return parseFloat(insight.spend) || 0
    case 'conversions':
      if (insight.actions) {
        return insight.actions
          .filter(a => ['purchase', 'complete_registration', 'lead'].includes(a.action_type))
          .reduce((sum, a) => sum + parseInt(a.value || '0'), 0)
      }
      return 0
    default:
      return parseInt(insight.impressions) || 0
  }
}

// Helper function to format placement names
function formatPlacement(platform?: string, position?: string): string | null {
  if (!platform) return null
  
  const platformMap: { [key: string]: string } = {
    'facebook': 'Facebook',
    'instagram': 'Instagram',
    'audience_network': 'Audience Network',
    'messenger': 'Messenger'
  }
  
  const positionMap: { [key: string]: string } = {
    'feed': 'Feed',
    'stories': 'Stories',
    'reels': 'Reels',
    'video_feeds': 'Video Feed',
    'right_hand_column': 'Right Column',
    'instant_article': 'Instant Article',
    'marketplace': 'Marketplace',
    'suggested_videos': 'Suggested Videos'
  }
  
  const formattedPlatform = platformMap[platform] || platform
  const formattedPosition = position ? positionMap[position] || position : ''
  
  return formattedPosition ? `${formattedPlatform} ${formattedPosition}` : formattedPlatform
}

// Helper function to convert map to percentage array
function convertToPercentageArray(dataMap: Map<string, number>): Array<{ 
  range?: string
  type?: string 
  platform?: string
  name?: string
  value: number
  percentage: number 
}> {
  const total = Array.from(dataMap.values()).reduce((sum, val) => sum + val, 0)
  
  return Array.from(dataMap.entries())
    .map(([key, value]) => {
      const percentage = total > 0 ? (value / total) * 100 : 0
      
      // Determine the appropriate property name based on the key
      let obj: any = {
        value: Math.round(value),
        percentage: Math.round(percentage * 10) / 10
      }
      
      // Set the appropriate property based on the data type
      if (key.includes('-')) {
        obj.range = key // Age ranges like "25-34"
      } else if (['male', 'female', 'unknown'].includes(key.toLowerCase())) {
        obj.type = key // Gender
      } else if (['desktop', 'mobile', 'tablet', 'unknown'].includes(key.toLowerCase())) {
        obj.platform = key // Device platform
      } else {
        obj.name = key // Placement name
      }
      
      return obj
    })
    .sort((a, b) => b.value - a.value) // Sort by value descending
    .slice(0, 10) // Limit to top 10
}