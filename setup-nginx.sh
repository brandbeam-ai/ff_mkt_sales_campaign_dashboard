#!/bin/bash

# Nginx configuration script with SSL for creator.digicon.pro
# This script should be run ON THE VULTR SERVER
# Usage: bash setup-nginx.sh

set -e

# Configuration
DOMAIN="mkt_sale_dashboard.11spark.org"
APP_PORT="3022"
EMAIL="digicon@digicon.pro"  # Change this to your email for SSL certificate notifications

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔧 Setting up Nginx for ${DOMAIN}...${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}❌ Please run as root (use sudo)${NC}"
  exit 1
fi

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
  echo -e "${RED}❌ Nginx is not installed${NC}"
  exit 1
fi

# Check if Certbot is installed
if ! command -v certbot &> /dev/null; then
  echo -e "${RED}❌ Certbot is not installed${NC}"
  exit 1
fi

echo -e "${YELLOW}📝 Step 1: Creating initial Nginx configuration (HTTP only)...${NC}"

# Create initial HTTP-only configuration for Certbot verification
cat > /etc/nginx/sites-available/${DOMAIN} << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name mkt_sale_dashboard.11spark.org;

    # Logging
    access_log /var/log/nginx/mkt_sale_dashboard.11spark.org.access.log;
    error_log /var/log/nginx/mkt_sale_dashboard.11spark.org.error.log;

    # Client body size (for file uploads)
    client_max_body_size 50M;

    # Proxy settings for Next.js
    location / {
        proxy_pass http://localhost:3022;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Cache static files
    location /_next/static {
        proxy_pass http://localhost:3022;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Handle Next.js image optimization
    location /_next/image {
        proxy_pass http://localhost:3022;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo -e "${GREEN}✅ Nginx configuration created${NC}"

echo -e "${YELLOW}🔗 Step 2: Enabling site...${NC}"
# Create symbolic link to enable the site
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}

# Remove default site if exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
    echo -e "${GREEN}✅ Removed default site${NC}"
fi

echo -e "${YELLOW}🧪 Step 3: Testing Nginx configuration...${NC}"
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    exit 1
fi

echo -e "${YELLOW}🔄 Step 4: Reloading Nginx...${NC}"
systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded${NC}"

echo -e "${YELLOW}🔐 Step 5: Setting up SSL certificate with Certbot...${NC}"
echo "This may take a few moments..."

# Stop Nginx temporarily for Certbot standalone mode (optional, we're using webroot)
# systemctl stop nginx

# Obtain SSL certificate
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email ${EMAIL} --redirect

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSL certificate obtained and configured${NC}"
else
    echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
    echo "Please check:"
    echo "  1. DNS records are pointing to this server"
    echo "  2. Port 80 and 443 are open in firewall"
    echo "  3. Domain is accessible from internet"
    exit 1
fi

echo -e "${YELLOW}🔄 Step 6: Final Nginx reload...${NC}"
systemctl reload nginx

echo -e "${YELLOW}⚙️  Step 7: Setting up auto-renewal for SSL certificate...${NC}"
# Test auto-renewal
certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSL auto-renewal is configured${NC}"
else
    echo -e "${YELLOW}⚠️  SSL auto-renewal test had issues (but certificate is installed)${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📊 Configuration Summary:"
echo "  Domain: ${DOMAIN}"
echo "  Backend Port: ${APP_PORT}"
echo "  SSL: Enabled"
echo ""
echo "🌐 Your site is now available at:"
echo "  https://${DOMAIN}"
echo ""
echo "📋 Useful commands:"
echo "  systemctl status nginx    - Check Nginx status"
echo "  systemctl reload nginx    - Reload Nginx configuration"
echo "  certbot renew             - Manually renew SSL certificate"
echo "  certbot certificates      - List all certificates"
echo "  tail -f /var/log/nginx/mkt_sale_dashboard.11spark.org.access.log - View access logs"
echo "  tail -f /var/log/nginx/mkt_sale_dashboard.11spark.org.error.log  - View error logs"
echo ""
echo "🔐 SSL Certificate will auto-renew before expiration"
echo ""

