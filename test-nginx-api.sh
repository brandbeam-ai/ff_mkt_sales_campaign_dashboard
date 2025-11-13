#!/bin/bash

# Test script to diagnose nginx API routing issues
# Run this on your server

echo "🧪 Testing API Endpoints..."
echo ""

# Test 1: Direct connection to Next.js (should work)
echo "1️⃣ Testing direct connection to Next.js (port 3022):"
DIRECT_RESPONSE=$(curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3022/api/funnel-data)
echo "   Result: $DIRECT_RESPONSE"
echo ""

# Test 2: Via nginx HTTP (port 80)
echo "2️⃣ Testing via nginx HTTP (port 80):"
NGINX_HTTP_RESPONSE=$(curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost/api/funnel-data 2>&1)
echo "   Result: $NGINX_HTTP_RESPONSE"
echo ""

# Test 3: Via nginx HTTPS (port 443)
echo "3️⃣ Testing via nginx HTTPS (port 443):"
NGINX_HTTPS_RESPONSE=$(curl -s -k -o /dev/null -w "HTTP %{http_code}" https://localhost/api/funnel-data 2>&1)
echo "   Result: $NGINX_HTTPS_RESPONSE"
echo ""

# Test 4: Via domain (external)
echo "4️⃣ Testing via domain (external):"
DOMAIN_RESPONSE=$(curl -s -k -o /dev/null -w "HTTP %{http_code}" https://mktsaledashboard.11spark.org/api/funnel-data 2>&1)
echo "   Result: $DOMAIN_RESPONSE"
echo ""

# Test 5: Check nginx config for /api/ location
echo "5️⃣ Checking nginx configuration for /api/ location:"
if grep -q "location /api/" /etc/nginx/sites-available/mktsaledashboard.11spark.org; then
    echo "   ✅ /api/ location block found in nginx config"
    echo ""
    echo "   Configuration:"
    grep -A 10 "location /api/" /etc/nginx/sites-available/mktsaledashboard.11spark.org | head -12
else
    echo "   ❌ /api/ location block NOT found in nginx config"
    echo "   This is the problem! Nginx needs explicit /api/ handling"
fi
echo ""

# Test 6: Check nginx error log for API requests
echo "6️⃣ Recent nginx errors related to /api/:"
sudo tail -20 /var/log/nginx/mktsaledashboard.11spark.org.error.log | grep -i api || echo "   No API-related errors found"
echo ""

# Test 7: Check if nginx is proxying correctly
echo "7️⃣ Testing nginx proxy headers:"
curl -s -I http://localhost/api/funnel-data 2>&1 | head -10
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Summary:"
echo ""
if [ "$DIRECT_RESPONSE" = "HTTP 200" ]; then
    echo "✅ Direct connection works - Next.js is running correctly"
else
    echo "❌ Direct connection failed - Next.js might not be running"
fi

if echo "$NGINX_HTTP_RESPONSE" | grep -q "200"; then
    echo "✅ Nginx HTTP proxy works"
else
    echo "❌ Nginx HTTP proxy failed - check nginx config"
fi

if echo "$NGINX_HTTPS_RESPONSE" | grep -q "200"; then
    echo "✅ Nginx HTTPS proxy works"
else
    echo "❌ Nginx HTTPS proxy failed - check SSL config"
fi

if echo "$DOMAIN_RESPONSE" | grep -q "200"; then
    echo "✅ Domain access works"
else
    echo "❌ Domain access failed - this is the issue to fix"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

