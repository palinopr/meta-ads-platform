// Account management functions for saving and retrieving ad accounts
import { createClient } from '@/lib/supabase/client';
import { MetaAdAccount } from './meta';

export async function saveAccountViaFunction(account: MetaAdAccount): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Save account to database
    const { data, error } = await supabase
      .from('meta_ad_accounts')
      .upsert({
        account_id: account.account_id,
        account_name: account.account_name,
        currency: account.currency,
        status: account.status,
        is_active: account.is_active,
        user_id: user.id
      }, {
        onConflict: 'account_id,user_id'
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAccountsViaFunction(): Promise<{ success: boolean; data?: MetaAdAccount[]; error?: string }> {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get accounts from database
    const { data, error } = await supabase
      .from('meta_ad_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('account_name');

    if (error) {
      return { success: false, error: error.message };
    }

    const accounts: MetaAdAccount[] = (data || []).map(account => ({
      account_id: account.account_id,
      account_name: account.account_name,
      currency: account.currency,
      status: account.status,
      is_active: account.is_active
    }));

    return { success: true, data: accounts };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}