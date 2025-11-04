#!/bin/bash

# Deployment script for Next.js app on Vultr server
# App runs on port 3022 and is managed by PM2

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ff_mkt_sale_dashboard"
APP_PORT=3022
PM2_APP_NAME="ff-mkt-sale-dashboard"
NODE_ENV="production"

echo -e "${GREEN}🚀 Starting deployment for ${APP_NAME}...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed. Installing PM2...${NC}"
    npm install -g pm2
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Configure firewall (ufw) to allow port 3022
echo -e "${YELLOW}🔥 Configuring firewall (ufw) to allow port $APP_PORT...${NC}"
if command -v ufw &> /dev/null; then
    # Check if ufw is active
    if ufw status | grep -q "Status: active"; then
        echo -e "${YELLOW}   UFW is active, checking if port $APP_PORT is already allowed...${NC}"
        if ufw status | grep -q "$APP_PORT"; then
            echo -e "${GREEN}✅ Port $APP_PORT is already allowed in UFW${NC}"
        else
            echo -e "${YELLOW}   Adding port $APP_PORT to UFW...${NC}"
            ufw allow $APP_PORT/tcp || echo -e "${YELLOW}⚠️  Could not add port to UFW (may need sudo)${NC}"
            echo -e "${GREEN}✅ Port $APP_PORT added to UFW${NC}"
        fi
    else
        echo -e "${YELLOW}   UFW is not active. Enabling UFW and allowing port $APP_PORT...${NC}"
        ufw allow $APP_PORT/tcp || echo -e "${YELLOW}⚠️  Could not add port to UFW (may need sudo)${NC}"
        ufw --force enable || echo -e "${YELLOW}⚠️  Could not enable UFW (may need sudo)${NC}"
        echo -e "${GREEN}✅ UFW enabled and port $APP_PORT allowed${NC}"
    fi
    echo -e "${YELLOW}   Current UFW status:${NC}"
    ufw status | head -5
else
    echo -e "${YELLOW}⚠️  UFW is not installed. Skipping firewall configuration.${NC}"
    echo -e "${YELLOW}   To install UFW: sudo apt-get install ufw${NC}"
    echo -e "${YELLOW}   To manually allow port: sudo ufw allow $APP_PORT/tcp${NC}"
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}📦 Pulling latest code from GitHub...${NC}"
git pull origin main || git pull origin master

echo -e "${YELLOW}📥 Installing dependencies...${NC}"
npm install --production=false

echo -e "${YELLOW}🔧 Building Next.js application...${NC}"
echo -e "${YELLOW}   Note: Next.js will use environment variables from .env.local${NC}"
# Ensure environment variables are available during build
export $(cat .env.local | grep -v '^#' | xargs) 2>/dev/null || true
npm run build

echo -e "${YELLOW}🔄 Updating cache (fetching fresh data from Airtable)...${NC}"
# Wait a moment for the build to complete
sleep 2

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ Error: .env.local file not found!${NC}"
    echo -e "${RED}   The build requires .env.local with AIRTABLE_API_KEY and other required variables.${NC}"
    echo -e "${YELLOW}   Please create .env.local file before deploying.${NC}"
    exit 1
fi

# Verify AIRTABLE_API_KEY is set
if ! grep -q "AIRTABLE_API_KEY=" .env.local || grep -q "^AIRTABLE_API_KEY=$" .env.local; then
    echo -e "${RED}❌ Error: AIRTABLE_API_KEY is not set in .env.local!${NC}"
    echo -e "${YELLOW}   Please add AIRTABLE_API_KEY=your-key-here to .env.local${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables file (.env.local) found${NC}"

# Stop existing PM2 process if it exists
if pm2 list | grep -q "$PM2_APP_NAME"; then
    echo -e "${YELLOW}🛑 Stopping existing PM2 process...${NC}"
    pm2 stop "$PM2_APP_NAME" || true
    pm2 delete "$PM2_APP_NAME" || true
fi

# Create PM2 ecosystem file if it doesn't exist
PM2_CONFIG_FILE="ecosystem.config.js"
if [ ! -f "$PM2_CONFIG_FILE" ]; then
    echo -e "${YELLOW}📝 Creating PM2 ecosystem config file...${NC}"
    cat > "$PM2_CONFIG_FILE" << EOF
module.exports = {
  apps: [{
    name: '$PM2_APP_NAME',
    script: 'npm',
    args: 'start',
    cwd: '$SCRIPT_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: '$NODE_ENV',
      PORT: $APP_PORT,
      NEXT_PUBLIC_BASE_URL: 'http://localhost:$APP_PORT'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
EOF
fi

# Create logs directory
mkdir -p logs

# Start the application with PM2
echo -e "${YELLOW}🚀 Starting application with PM2...${NC}"
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script (so it restarts on server reboot)
echo -e "${YELLOW}⚙️  Setting up PM2 startup script...${NC}"
pm2 startup || echo -e "${YELLOW}⚠️  Could not auto-generate startup script. You may need to run 'pm2 startup' manually.${NC}"

# Wait a moment for the app to start
sleep 3

# Check if the app is running
if pm2 list | grep -q "$PM2_APP_NAME.*online"; then
    echo -e "${GREEN}✅ Application is running successfully!${NC}"
    echo -e "${GREEN}📊 PM2 Status:${NC}"
    pm2 status
    
    echo -e "\n${GREEN}📝 Useful PM2 commands:${NC}"
    echo -e "  ${YELLOW}pm2 logs $PM2_APP_NAME${NC}     - View logs"
    echo -e "  ${YELLOW}pm2 restart $PM2_APP_NAME${NC}   - Restart app"
    echo -e "  ${YELLOW}pm2 stop $PM2_APP_NAME${NC}     - Stop app"
    echo -e "  ${YELLOW}pm2 monit${NC}                   - Monitor app"
    
    echo -e "\n${GREEN}🌐 Application should be accessible at: http://localhost:$APP_PORT${NC}"
    echo -e "${GREEN}   (Configure your reverse proxy/nginx to point to this port)${NC}"
else
    echo -e "${RED}❌ Application failed to start. Check logs with: pm2 logs $PM2_APP_NAME${NC}"
    exit 1
fi

# Update cache after deployment
echo -e "\n${YELLOW}🔄 Updating data cache (initial fetch)...${NC}"
echo -e "${YELLOW}   This will fetch fresh data from Airtable.${NC}"
# Wait for app to be fully started before updating cache
sleep 5

# Try to update cache (best effort, don't fail deployment if this fails)
if npm run update-cache 2>/dev/null; then
    echo -e "${GREEN}✅ Initial cache update completed${NC}"
else
    echo -e "${YELLOW}⚠️  Cache update failed (this is okay, it will be scheduled for daily updates)${NC}"
fi

# Setup cron job for daily cache updates
echo -e "\n${YELLOW}📅 Setting up daily cache update cron job...${NC}"

CRON_JOB="0 2 * * * cd $SCRIPT_DIR && /usr/bin/npm run update-cache >> $SCRIPT_DIR/logs/cache-update.log 2>&1"
CRON_SCRIPT="$SCRIPT_DIR/update-cache-cron.sh"

# Create a cron script file for easier management
cat > "$CRON_SCRIPT" << EOF
#!/bin/bash
# Auto-generated cron script for cache updates
# This script is run daily at 2:00 AM

cd "$SCRIPT_DIR"
export PATH=\$PATH:/usr/bin:/usr/local/bin
source ~/.bashrc 2>/dev/null || true

# Load environment variables if .env.local exists
if [ -f .env.local ]; then
    export \$(cat .env.local | grep -v '^#' | xargs)
fi

/usr/bin/npm run update-cache >> "$SCRIPT_DIR/logs/cache-update.log" 2>&1
EOF

chmod +x "$CRON_SCRIPT"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "update-cache-cron.sh"; then
    echo -e "${YELLOW}⚠️  Cron job already exists, skipping...${NC}"
else
    # Add cron job (runs daily at 2:00 AM)
    (crontab -l 2>/dev/null; echo "0 2 * * * $CRON_SCRIPT") | crontab -
    echo -e "${GREEN}✅ Daily cache update cron job added (runs at 2:00 AM daily)${NC}"
fi

# Ensure logs directory exists
mkdir -p "$SCRIPT_DIR/logs"

echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "\n${GREEN}📋 Summary:${NC}"
echo -e "  ${YELLOW}•${NC} Application running on port $APP_PORT"
echo -e "  ${YELLOW}•${NC} PM2 process: $PM2_APP_NAME"
echo -e "  ${YELLOW}•${NC} Firewall: Port $APP_PORT configured in UFW"
echo -e "  ${YELLOW}•${NC} Daily cache update: Scheduled for 2:00 AM"
echo -e "  ${YELLOW}•${NC} Cache update logs: $SCRIPT_DIR/logs/cache-update.log"
echo -e "\n${GREEN}📝 Useful commands:${NC}"
echo -e "  ${YELLOW}pm2 logs $PM2_APP_NAME${NC}              - View app logs"
echo -e "  ${YELLOW}tail -f $SCRIPT_DIR/logs/cache-update.log${NC}  - View cache update logs"
echo -e "  ${YELLOW}crontab -l${NC}                         - View cron jobs"
echo -e "  ${YELLOW}npm run update-cache${NC}                - Manually update cache"
echo -e "  ${YELLOW}ufw status${NC}                          - Check firewall status"
echo -e "\n${GREEN}🌐 Access your application:${NC}"
echo -e "  ${YELLOW}Local:${NC} http://localhost:$APP_PORT"
echo -e "  ${YELLOW}External:${NC} http://$(hostname -I | awk '{print $1}'):$APP_PORT"
echo -e "  ${YELLOW}Or use your server's IP address${NC}"

