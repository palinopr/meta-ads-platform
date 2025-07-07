-- Check if profiles table exists and has company_name column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Temporarily disable RLS to test (RE-ENABLE AFTER TESTING!)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Alternative: Create a more permissive policy for inserts
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
CREATE POLICY "Enable insert for authenticated users only" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (true);

-- Make sure the table has all columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Test by checking the table structure again
SELECT * FROM public.profiles LIMIT 1;