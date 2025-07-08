#!/bin/bash

# 🚀 Auto-Deploy and Error Check Script
# Run this after making any changes to automatically deploy and verify

echo "🔄 Starting deployment process..."

# 1. Add and commit changes
echo "📝 Committing changes..."
git add .
read -p "Enter commit message: " commit_msg
git commit -m "$commit_msg"

# 2. Push to GitHub
echo "⬆️ Pushing to GitHub..."
git push origin main

# 3. Deploy to Vercel
echo "🚀 Deploying to Vercel..."
cd frontend
npx vercel --prod

# 4. Check for deployment errors
echo "🔍 Checking deployment logs..."
deployment_url=$(npx vercel ls | grep "frontend" | head -1 | awk '{print $2}')
npx vercel inspect --logs "$deployment_url"

echo "✅ Deployment process complete!"
echo "🌐 Live site: https://frontend-ten-eta-42.vercel.app"
echo "🔍 Debug tool: https://frontend-ten-eta-42.vercel.app/debug-campaigns"
