#!/bin/bash

# Diagnostic script to check server environment
# Run this on your Vultr server to diagnose environment variable issues
# Usage: bash check-server-env.sh

echo "🔍 Checking Server Environment..."
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local file exists"
    echo ""
    echo "📋 Environment variables in .env.local:"
    grep -E "^(AIRTABLE_API_KEY|AIRTABLE_BASE_ID|ANTHROPIC_API_KEY)=" .env.local | sed 's/=.*/=***HIDDEN***/'
    echo ""
else
    echo "❌ .env.local file NOT FOUND"
    echo "   Please create .env.local with required variables"
    echo ""
fi

# Check PM2 process
echo "📊 PM2 Process Status:"
pm2 list | grep -E "(ff-mkt|status|name)" || echo "   No PM2 processes found"
echo ""

# Check if Next.js app is running
echo "🌐 Checking if app is accessible:"
if curl -s http://localhost:3022 > /dev/null; then
    echo "✅ App is running on port 3022"
else
    echo "❌ App is NOT responding on port 3022"
fi
echo ""

# Check environment variables in PM2
echo "🔑 Environment variables in PM2:"
pm2 env ff-mkt-sale-dashboard 2>/dev/null | grep -E "(AIRTABLE|ANTHROPIC)" || echo "   No environment variables found in PM2"
echo ""

# Check nginx status
echo "🔧 Nginx Status:"
systemctl status nginx --no-pager -l | head -5
echo ""

# Check nginx error log for recent errors
echo "📝 Recent Nginx Errors (last 10 lines):"
tail -10 /var/log/nginx/mktsaledashboard.11spark.org.error.log 2>/dev/null || echo "   No error log found"
echo ""

# Check if cache file exists
echo "💾 Cache File Status:"
if [ -f "data/funnel-data.json" ]; then
    FILE_SIZE=$(du -h data/funnel-data.json | cut -f1)
    echo "✅ Cache file exists (size: $FILE_SIZE)"
    LAST_MODIFIED=$(stat -c %y data/funnel-data.json 2>/dev/null || stat -f %Sm data/funnel-data.json 2>/dev/null)
    echo "   Last modified: $LAST_MODIFIED"
else
    echo "❌ Cache file NOT FOUND"
    echo "   Run: npm run update-cache"
fi
echo ""

# Test API endpoint
echo "🧪 Testing API Endpoint:"
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3022/api/funnel-data)
if [ "$API_RESPONSE" = "200" ]; then
    echo "✅ API endpoint returns 200 OK"
elif [ "$API_RESPONSE" = "500" ]; then
    echo "❌ API endpoint returns 500 (check logs for details)"
    echo "   This might indicate missing AIRTABLE_API_KEY"
else
    echo "⚠️  API endpoint returns HTTP $API_RESPONSE"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Summary:"
echo ""
echo "If environment variables are missing in PM2:"
echo "  1. Check ecosystem.config.js has env variables"
echo "  2. Or restart PM2: pm2 restart ff-mkt-sale-dashboard --update-env"
echo ""
echo "If cache file is missing:"
echo "  1. Run: npm run update-cache"
echo ""
echo "If API returns 500:"
echo "  1. Check PM2 logs: pm2 logs ff-mkt-sale-dashboard"
echo "  2. Verify .env.local has AIRTABLE_API_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

