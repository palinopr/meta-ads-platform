import { createClient } from '@/lib/supabase/client'

export interface AccountData {
  account_id: string
  account_name: string
  currency?: string
  status?: string
  is_active?: boolean
}

export async function ensureAccountExists(accountData: AccountData) {
  const supabase = createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // First, try to get or create the account
  const accountToInsert = {
    user_id: user.id,
    account_id: accountData.account_id,
    account_name: accountData.account_name,
    currency: accountData.currency || 'USD',
    status: accountData.status || 'ACTIVE',
    is_active: accountData.is_active !== false,
    timezone_name: 'UTC',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Try to insert
  const { data: insertedAccount, error: insertError } = await supabase
    .from('meta_ad_accounts')
    .insert(accountToInsert)
    .select()
    .single()

  if (insertedAccount) {
    console.log('Account created:', insertedAccount)
    return insertedAccount
  }

  // If insert failed due to unique constraint, fetch the existing account
  if (insertError?.code === '23505' || insertError?.message?.includes('duplicate')) {
    const { data: existingAccount, error: fetchError } = await supabase
      .from('meta_ad_accounts')
      .select('*')
      .eq('account_id', accountData.account_id)
      .eq('user_id', user.id)
      .single()

    if (existingAccount) {
      // Update the existing account
      const { data: updatedAccount } = await supabase
        .from('meta_ad_accounts')
        .update({
          account_name: accountData.account_name,
          currency: accountData.currency || 'USD',
          status: accountData.status || 'ACTIVE',
          is_active: accountData.is_active !== false,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id)
        .select()
        .single()

      console.log('Account updated:', updatedAccount || existingAccount)
      return updatedAccount || existingAccount
    }

    if (fetchError) {
      console.error('Error fetching existing account:', fetchError)
    }
  }

  // If we get here, something went wrong
  console.error('Failed to ensure account exists:', insertError)
  throw new Error('Failed to create or update account')
}