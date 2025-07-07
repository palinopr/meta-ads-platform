import { createClient } from '@/lib/supabase/client'

export async function saveAccountViaFunction(accountData: any) {
  const supabase = createClient()
  
  console.log('Saving account via function:', accountData)

  // Call the database function instead of direct insert
  const { data, error } = await supabase
    .rpc('insert_meta_ad_account', {
      p_account_id: accountData.account_id,
      p_account_name: accountData.account_name,
      p_currency: accountData.currency || 'USD',
      p_status: accountData.status || 'ACTIVE',
      p_is_active: accountData.is_active !== false
    })

  if (error) {
    console.error('Function call error:', error)
    throw error
  }

  console.log('Function call success:', data)
  return data
}