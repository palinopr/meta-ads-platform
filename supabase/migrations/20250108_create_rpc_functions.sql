-- Create RPC function to get campaigns for a specific account
CREATE OR REPLACE FUNCTION get_campaigns_for_account(p_account_id TEXT)
RETURNS TABLE (
  campaign_id TEXT,
  name TEXT,
  objective TEXT,
  status TEXT,
  daily_budget NUMERIC,
  lifetime_budget NUMERIC,
  start_time TIMESTAMPTZ,
  stop_time TIMESTAMPTZ,
  created_time TIMESTAMPTZ,
  updated_time TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_account_record_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find the account record ID for this user and account
  SELECT id INTO v_account_record_id
  FROM meta_ad_accounts
  WHERE account_id = p_account_id
    AND user_id = v_user_id
  LIMIT 1;
  
  IF v_account_record_id IS NULL THEN
    -- Return empty result set if account not found
    RETURN;
  END IF;
  
  -- Return campaigns for this account
  RETURN QUERY
  SELECT 
    c.campaign_id,
    c.name,
    c.objective,
    c.status,
    c.daily_budget,
    c.lifetime_budget,
    c.start_time,
    c.stop_time,
    c.created_time,
    c.updated_time
  FROM campaigns c
  WHERE c.account_id = v_account_record_id
    AND c.user_id = v_user_id
  ORDER BY c.created_time DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_campaigns_for_account(TEXT) TO authenticated;

-- Create RPC function to get user's ad accounts
CREATE OR REPLACE FUNCTION get_my_ad_accounts()
RETURNS TABLE (
  id UUID,
  account_id TEXT,
  account_name TEXT,
  currency TEXT,
  status TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Return ad accounts for this user
  RETURN QUERY
  SELECT 
    maa.id,
    maa.account_id,
    maa.account_name,
    maa.currency,
    maa.status,
    maa.is_active,
    maa.created_at,
    maa.updated_at
  FROM meta_ad_accounts maa
  WHERE maa.user_id = v_user_id
  ORDER BY maa.account_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_my_ad_accounts() TO authenticated;