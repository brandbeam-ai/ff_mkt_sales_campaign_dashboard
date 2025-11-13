#!/bin/bash

# Quick fix script to restart PM2 with updated environment variables
# Run this on your server: sudo bash fix-pm2-env.sh

set -e

echo "🔧 Fixing PM2 Environment Variables..."
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo "   Please create .env.local with required variables first."
    exit 1
fi

echo "✅ .env.local file found"
echo ""

# Stop and delete current PM2 process
echo "🛑 Stopping current PM2 process..."
pm2 stop ff-mkt-sale-dashboard 2>/dev/null || true
pm2 delete ff-mkt-sale-dashboard 2>/dev/null || true

echo "✅ Old process stopped"
echo ""

# Start with updated config (will load .env.local)
echo "🚀 Starting PM2 with updated ecosystem.config.js..."
pm2 start ecosystem.config.js

echo "✅ PM2 process started"
echo ""

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PM2 restarted with updated environment variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify environment variables are loaded
echo "🔍 Verifying environment variables in PM2..."
echo ""
if pm2 env ff-mkt-sale-dashboard 2>/dev/null | grep -q "AIRTABLE_API_KEY"; then
    echo "✅ AIRTABLE_API_KEY is now loaded in PM2"
else
    echo "⚠️  AIRTABLE_API_KEY still not found in PM2"
    echo "   Check ecosystem.config.js is updated correctly"
fi

echo ""
echo "📋 Next steps:"
echo "   1. Test API: curl http://localhost:3022/api/funnel-data"
echo "   2. Check logs: pm2 logs ff-mkt-sale-dashboard --lines 20"
echo "   3. Test domain: https://mktsaledashboard.11spark.org"
echo ""

