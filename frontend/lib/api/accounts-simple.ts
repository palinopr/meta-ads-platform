import { createClient } from '@/lib/supabase/client'

export async function saveAccountSimple(accountData: any) {
  const supabase = createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('No user found')
    return null
  }

  console.log('Attempting to save account for user:', user.id)
  console.log('Account data:', accountData)

  // First check if it exists
  const { data: existing, error: checkError } = await supabase
    .from('meta_ad_accounts')
    .select('*')
    .eq('account_id', accountData.account_id)
    .eq('user_id', user.id)
    .maybeSingle()

  console.log('Existing check:', { existing, checkError })

  if (existing) {
    console.log('Account already exists, updating...')
    const { data, error } = await supabase
      .from('meta_ad_accounts')
      .update({
        account_name: accountData.account_name,
        currency: accountData.currency || 'USD',
        status: accountData.status || 'ACTIVE',
        is_active: accountData.is_active !== false,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()

    console.log('Update result:', { data, error })
    return data
  }

  // Insert new
  console.log('Inserting new account...')
  const { data, error } = await supabase
    .from('meta_ad_accounts')
    .insert({
      user_id: user.id,
      account_id: accountData.account_id,
      account_name: accountData.account_name,
      currency: accountData.currency || 'USD',
      timezone_name: 'UTC',
      status: accountData.status || 'ACTIVE',
      is_active: accountData.is_active !== false
    })
    .select()
    .single()

  console.log('Insert result:', { data, error })
  
  if (error) {
    // Log detailed error info
    console.error('Insert error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
  }

  return data
}