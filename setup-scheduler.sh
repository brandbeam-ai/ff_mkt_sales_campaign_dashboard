#!/bin/bash

# Script to setup the scheduler for weekly report generation
# Runs every Monday at 00:05 UTC

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}📅 Setting up weekly report generation cron job...${NC}"

REPORT_CRON_SCRIPT="$SCRIPT_DIR/generate-report-cron.sh"

# Create a cron script file for report generation
cat > "$REPORT_CRON_SCRIPT" << EOF
#!/bin/bash
# Auto-generated cron script for weekly report generation
# This script is run weekly on Monday at 00:05

cd "$SCRIPT_DIR"
export PATH=\$PATH:/usr/bin:/usr/local/bin
source ~/.bashrc 2>/dev/null || true

# Load environment variables if .env.local exists
if [ -f .env.local ]; then
    export \$(cat .env.local | grep -v '^#' | xargs)
fi

/usr/bin/npm run generate-report >> "$SCRIPT_DIR/logs/generate-report.log" 2>&1
EOF

chmod +x "$REPORT_CRON_SCRIPT"
echo -e "${GREEN}✅ Created helper script: $REPORT_CRON_SCRIPT${NC}"

# Ensure logs directory exists
mkdir -p "$SCRIPT_DIR/logs"

# Check if report cron job already exists
if crontab -l 2>/dev/null | grep -q "generate-report-cron.sh"; then
    echo -e "${YELLOW}⚠️  Report generation cron job already exists, skipping...${NC}"
else
    # Add cron job (runs weekly on Monday at 00:05)
    (crontab -l 2>/dev/null; echo "5 0 * * 1 $REPORT_CRON_SCRIPT") | crontab -
    echo -e "${GREEN}✅ Weekly report generation cron job added (runs Monday at 00:05)${NC}"
fi

echo -e "\n${GREEN}📋 Scheduler Setup Complete!${NC}"
echo -e "  ${YELLOW}•${NC} Schedule: Monday at 00:05"
echo -e "  ${YELLOW}•${NC} Log file: $SCRIPT_DIR/logs/generate-report.log"
