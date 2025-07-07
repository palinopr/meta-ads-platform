-- This is a temporary migration to help debug the issue
-- It ensures at least one test account exists in the database

-- First, let's check if we need to create a test user ID
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get any existing user ID from profiles
    SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
    
    -- If we have a user, insert a test account for debugging
    IF test_user_id IS NOT NULL THEN
        INSERT INTO public.meta_ad_accounts (
            user_id,
            account_id,
            account_name,
            currency,
            timezone_name,
            status,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            test_user_id,
            '787610255314938',
            'Test Ad Account',
            'USD',
            'America/New_York',
            'ACTIVE',
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (account_id, user_id) 
        DO UPDATE SET
            updated_at = NOW(),
            is_active = true;
        
        RAISE NOTICE 'Test account inserted/updated for user %', test_user_id;
    ELSE
        RAISE NOTICE 'No users found in profiles table';
    END IF;
END $$;