#!/bin/bash

# Script to update Nginx SSL configuration with proper API route handling
# Run this AFTER Certbot has set up SSL
# Usage: sudo bash update-nginx-ssl.sh

set -e

DOMAIN="mktsaledashboard.11spark.org"
CONFIG_FILE="/etc/nginx/sites-available/${DOMAIN}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔧 Updating Nginx SSL configuration for ${DOMAIN}...${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}❌ Please run as root (use sudo)${NC}"
  exit 1
fi

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${RED}❌ Configuration file not found: ${CONFIG_FILE}${NC}"
  exit 1
fi

# Backup existing config
cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✅ Backup created${NC}"

# Check if SSL config exists (has listen 443)
if ! grep -q "listen 443" "$CONFIG_FILE"; then
  echo -e "${YELLOW}⚠️  SSL configuration not found. Please run Certbot first.${NC}"
  exit 1
fi

# Create updated configuration
cat > "$CONFIG_FILE" << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name mktsaledashboard.11spark.org;
    
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name mktsaledashboard.11spark.org;

    # SSL Configuration (Certbot will manage these)
    ssl_certificate /etc/letsencrypt/live/mktsaledashboard.11spark.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mktsaledashboard.11spark.org/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Logging
    access_log /var/log/nginx/mktsaledashboard.11spark.org.access.log;
    error_log /var/log/nginx/mktsaledashboard.11spark.org.error.log;

    # Client body size (for file uploads)
    client_max_body_size 50M;
    
    # Buffer sizes for large responses (especially for HTTP/2)
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    proxy_temp_file_write_size 256k;
    
    # Large client header buffers (replaces obsolete http2_max_field_size/http2_max_header_size)
    large_client_header_buffers 4 64k;
    
    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Explicit API routes handling (no caching)
    # Use prefix match (without trailing slash) to match /api and /api/*
    location /api {
        proxy_pass http://localhost:3022;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Buffer settings for large API responses
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 8 256k;
        proxy_busy_buffers_size 512k;
        
        # Timeouts for API calls
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Cache static files
    location /_next/static {
        proxy_pass http://localhost:3022;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
        proxy_set_header Host $host;
    }

    # Handle Next.js image optimization
    location /_next/image {
        proxy_pass http://localhost:3022;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy settings for Next.js (catch-all)
    location / {
        proxy_pass http://localhost:3022;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

echo -e "${GREEN}✅ Configuration updated${NC}"

echo -e "${YELLOW}🧪 Testing Nginx configuration...${NC}"
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    echo -e "${YELLOW}Restoring backup...${NC}"
    cp "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)" "$CONFIG_FILE"
    exit 1
fi

echo -e "${YELLOW}🔄 Reloading Nginx...${NC}"
systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Nginx SSL configuration updated successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Next steps:"
echo "  1. Test your domain: https://${DOMAIN}"
echo "  2. Check API routes: https://${DOMAIN}/api/funnel-data"
echo "  3. View logs: tail -f /var/log/nginx/mktsaledashboard.11spark.org.error.log"
echo ""

