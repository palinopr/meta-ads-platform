#!/bin/bash

echo "🚀 Deploying Supabase Edge Functions"
echo "===================================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    brew install supabase/tap/supabase
fi

# Login to Supabase
echo "📝 Logging in to Supabase..."
supabase login

# Link to project
echo "🔗 Linking to project..."
supabase link --project-ref igeuyfuxezvvenxjfnnn

# Deploy functions
echo "📦 Deploying meta-accounts function..."
supabase functions deploy meta-accounts

echo "📦 Deploying meta-sync function..."
supabase functions deploy meta-sync

# Set secrets
echo "🔐 Setting secrets..."
supabase secrets set META_APP_ID=1349075236218599
supabase secrets set META_APP_SECRET=7c301f1ac1404565f26462e3c734194c

echo ""
echo "✅ Edge Functions deployed successfully!"
echo ""
echo "Test URLs:"
echo "- https://igeuyfuxezvvenxjfnnn.supabase.co/functions/v1/meta-accounts"
echo "- https://igeuyfuxezvvenxjfnnn.supabase.co/functions/v1/meta-sync"