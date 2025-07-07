#!/bin/bash

# Add environment variables to Vercel
echo "NEXT_PUBLIC_SUPABASE_URL=https://igeuyfuxezvvenxjfnnn.supabase.co" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZXV5ZnV4ZXp2dmVueGpmbm5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MTExMzcsImV4cCI6MjA2MDQ4NzEzN30.bRT4u9_vtyhzlSIby_7DoK-EKhrtKTrQkrUM90m8IPQ" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "NEXT_PUBLIC_FACEBOOK_APP_ID=1349075236218599" | npx vercel env add NEXT_PUBLIC_FACEBOOK_APP_ID production

echo "Environment variables added to Vercel!"