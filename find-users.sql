-- Find all users in the system
SELECT 
    p.id as user_id,
    au.email,
    p.created_at,
    CASE WHEN p.meta_access_token IS NOT NULL THEN 'Yes' ELSE 'No' END as has_meta_token,
    (SELECT COUNT(*) FROM meta_ad_accounts WHERE user_id = p.id) as ad_accounts_count
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
ORDER BY p.created_at DESC;
