// Simple account management functions
import { createClient } from '@/lib/supabase/client';
import { MetaAdAccount } from './meta';

export async function saveAccountSimple(account: MetaAdAccount): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Simple save to database
    const { error } = await supabase
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