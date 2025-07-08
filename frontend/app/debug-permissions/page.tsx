'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export default function DebugPermissionsPage() {
  const [loading, setLoading] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)
  const supabase = createClient()

  const runDebug = async () => {
    setLoading(true)
    setDebugData(null)
    
    try {
      const { data, error } = await supabase.functions.invoke('debug-meta-permissions')
      
      if (error) {
        setDebugData({ error: error.message })
      } else {
        setDebugData(data)
      }
    } catch (error: any) {
      setDebugData({ error: error.message })
    }
    
    setLoading(false)
  }

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    )
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Meta Permissions Debug Tool</h1>
      <p className="text-gray-600 mb-8">
        This tool checks your Meta/Facebook connection and helps diagnose why ad accounts might not be showing up.
      </p>
      
      <div className="mb-6">
        <Button onClick={runDebug} disabled={loading} size="lg">
          {loading ? 'Running Debug...' : 'Run Meta Permissions Check'}
        </Button>
      </div>

      {debugData && (
        <div className="space-y-6">
          {/* Analysis Summary */}
          {debugData.analysis && (
            <Card>
              <CardHeader>
                <CardTitle>Analysis Summary</CardTitle>
                <CardDescription>Quick overview of your Meta connection status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(debugData.analysis.has_valid_token)}
                    <span>Valid Meta Access Token</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(debugData.analysis.has_proper_permissions)}
                    <span>Required Permissions (ads_management, ads_read)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(debugData.analysis.has_business_access)}
                    <span>Business Manager Access</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(debugData.analysis.has_ad_account_access)}
                    <span>Ad Account Access</span>
                  </div>
                </div>

                {debugData.analysis.recommendations && debugData.analysis.recommendations.length > 0 && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Recommendations</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside mt-2">
                        {debugData.analysis.recommendations.map((rec: string, idx: number) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Token Information */}
          {debugData.debugInfo && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Token Information</CardTitle>
                  <CardDescription>Details about your Meta access token</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><strong>Token Length:</strong> {debugData.debugInfo.token_length}</div>
                    <div><strong>Token Preview:</strong> {debugData.debugInfo.token_preview}</div>
                    {debugData.debugInfo.token_debug && (
                      <>
                        <div><strong>App ID:</strong> {debugData.debugInfo.token_debug.app_id}</div>
                        <div><strong>Token Type:</strong> {debugData.debugInfo.token_debug.type}</div>
                        <div><strong>Valid:</strong> {debugData.debugInfo.token_debug.is_valid ? 'Yes' : 'No'}</div>
                        <div><strong>Scopes:</strong> {debugData.debugInfo.token_debug.scopes?.join(', ')}</div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle>Permissions</CardTitle>
                  <CardDescription>Your Meta/Facebook permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  {debugData.debugInfo.permissions && debugData.debugInfo.permissions.length > 0 ? (
                    <div className="space-y-1">
                      {debugData.debugInfo.permissions.map((perm: any, idx: number) => (
                        <div key={idx} className="flex items-center space-x-2 text-sm">
                          {getStatusIcon(perm.status === 'granted')}
                          <span>{perm.permission}</span>
                          <span className="text-gray-500">({perm.status})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No permissions data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Business Accounts */}
              <Card>
                <CardHeader>
                  <CardTitle>Business Accounts</CardTitle>
                  <CardDescription>Meta Business Manager accounts you have access to</CardDescription>
                </CardHeader>
                <CardContent>
                  {debugData.debugInfo.business_accounts && debugData.debugInfo.business_accounts.length > 0 ? (
                    <div className="space-y-2">
                      {debugData.debugInfo.business_accounts.map((biz: any, idx: number) => (
                        <div key={idx} className="border p-3 rounded">
                          <div className="font-medium">{biz.name}</div>
                          <div className="text-sm text-gray-500">ID: {biz.id}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No Business Accounts Found</AlertTitle>
                      <AlertDescription>
                        You need to be added to a Meta Business Manager to access ad accounts.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Ad Accounts */}
              <Card>
                <CardHeader>
                  <CardTitle>Ad Accounts</CardTitle>
                  <CardDescription>Ad accounts you can manage</CardDescription>
                </CardHeader>
                <CardContent>
                  {debugData.debugInfo.ad_accounts && debugData.debugInfo.ad_accounts.length > 0 ? (
                    <div className="space-y-2">
                      {debugData.debugInfo.ad_accounts.map((acc: any, idx: number) => (
                        <div key={idx} className="border p-3 rounded">
                          <div className="font-medium">{acc.name}</div>
                          <div className="text-sm text-gray-500">
                            ID: {acc.id} | Currency: {acc.currency} | Status: {acc.status}
                          </div>
                          {acc.business_name && (
                            <div className="text-sm text-gray-500">Business: {acc.business_name}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No Ad Accounts Found</AlertTitle>
                      <AlertDescription>
                        This could mean:
                        <ul className="list-disc list-inside mt-2">
                          <li>You haven't been added to any ad accounts</li>
                          <li>You need admin or advertiser role on the accounts</li>
                          <li>The accounts aren't properly linked to Business Manager</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Errors */}
              {debugData.debugInfo.errors && debugData.debugInfo.errors.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-600">API Errors</CardTitle>
                    <CardDescription>Errors encountered while checking permissions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {debugData.debugInfo.errors.map((err: any, idx: number) => (
                        <Alert key={idx} variant="destructive">
                          <AlertTitle>{err.endpoint}</AlertTitle>
                          <AlertDescription>
                            {JSON.stringify(err.error, null, 2)}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Raw Data */}
              <Card>
                <CardHeader>
                  <CardTitle>Raw Debug Data</CardTitle>
                  <CardDescription>Complete debug information for technical analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs overflow-auto bg-gray-100 p-4 rounded max-h-96">
                    {JSON.stringify(debugData, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </>
          )}

          {/* Error Display */}
          {debugData.error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{debugData.error}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}