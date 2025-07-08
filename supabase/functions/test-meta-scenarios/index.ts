import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const scenarios = {
      emptyAccounts: {
        description: "Meta API returns empty accounts array",
        metaResponse: {
          data: [],
          paging: {
            cursors: {}
          }
        }
      },
      noPermissions: {
        description: "Meta API returns permission error",
        metaResponse: {
          error: {
            message: "Insufficient permissions",
            type: "OAuthException", 
            code: 10,
            error_subcode: 1349092
          }
        }
      },
      expiredToken: {
        description: "Meta API returns expired token error",
        metaResponse: {
          error: {
            message: "Error validating access token: Session has expired",
            type: "OAuthException",
            code: 190,
            error_subcode: 463
          }
        }
      },
      invalidToken: {
        description: "Meta API returns invalid token error", 
        metaResponse: {
          error: {
            message: "Invalid OAuth access token",
            type: "OAuthException",
            code: 190
          }
        }
      },
      sampleAccounts: {
        description: "Meta API returns sample accounts",
        metaResponse: {
          data: [
            {
              id: "act_123456789",
              name: "Test Ad Account 1",
              currency: "USD",
              account_status: 1
            },
            {
              id: "act_987654321", 
              name: "Test Ad Account 2",
              currency: "EUR",
              account_status: 1
            }
          ]
        }
      }
    }

    // Test what happens when we transform each scenario
    const results = {}
    
    for (const [key, scenario] of Object.entries(scenarios)) {
      const metaData = scenario.metaResponse
      
      if (metaData.error) {
        results[key] = {
          description: scenario.description,
          hasError: true,
          errorCode: metaData.error.code,
          errorMessage: metaData.error.message,
          transformedAccounts: []
        }
      } else {
        const accounts = (metaData.data || []).map((account: any) => ({
          account_id: account.id.replace('act_', ''),
          account_name: account.name || 'Unnamed Account',
          currency: account.currency || 'USD',
          status: account.account_status === 1 ? 'ACTIVE' : 'INACTIVE',
          is_active: account.account_status === 1
        }))
        
        results[key] = {
          description: scenario.description,
          hasError: false,
          rawAccountsCount: metaData.data?.length || 0,
          transformedAccounts: accounts,
          transformedCount: accounts.length
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Meta API response scenario testing",
        scenarios: results,
        analysis: {
          mostLikelyScenario: "emptyAccounts",
          reasoning: "Getting 0 accounts suggests Meta API is returning empty data array",
          nextSteps: [
            "Check if user has ad accounts in Meta Business Manager",
            "Verify OAuth permissions include ads_management and ads_read",
            "Check if token is valid but user has no business accounts",
            "Verify user is admin/advertiser on business accounts"
          ]
        }
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})