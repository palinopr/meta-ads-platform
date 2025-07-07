const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://igeuyfuxezvvenxjfnnn.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseServiceKey) {
  console.error('Please set SUPABASE_SERVICE_KEY environment variable')
  console.log('You can find it at: https://app.supabase.com/project/igeuyfuxezvvenxjfnnn/settings/api')
  console.log('Look for "service_role" key (starts with eyJ...)')
  process.exit(1)
}

async function runMigration() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  const migration = `
    -- Add Meta OAuth token columns to profiles
    ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
    ADD COLUMN IF NOT EXISTS meta_user_id TEXT,
    ADD COLUMN IF NOT EXISTS meta_token_expires_at TIMESTAMPTZ;

    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_profiles_meta_user_id ON public.profiles(meta_user_id);

    -- Update RLS policy to allow users to update their own Meta tokens
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile" ON public.profiles
      FOR UPDATE USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  `

  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: migration })
    
    if (error) {
      console.error('Migration failed:', error)
    } else {
      console.log('Migration completed successfully!')
    }
  } catch (err) {
    console.error('Error running migration:', err)
  }
}

runMigration()