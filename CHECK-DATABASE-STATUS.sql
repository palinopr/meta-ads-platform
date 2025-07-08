-- 🔍 CHECK DATABASE STATUS
-- Run this first to see what tables exist and what went wrong

SELECT 'Current database status:' as info;

-- Check which tables exist
SELECT 'EXISTING TABLES:' as section;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check for any campaigns-related tables
SELECT 'CAMPAIGN-RELATED OBJECTS:' as section;
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%campaign%' OR table_name LIKE '%meta%')
ORDER BY table_name;

-- Check if profiles table exists
SELECT 'PROFILES TABLE STATUS:' as section;
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check for any errors in recent operations
SELECT 'READY FOR REBUILD' as status;
