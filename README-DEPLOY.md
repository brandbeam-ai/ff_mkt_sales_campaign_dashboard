# Deployment Guide for Vultr Server

This guide explains how to deploy the Marketing & Sales Funnel Dashboard to a Vultr server using PM2.

## Prerequisites

1. **Vultr Server** with SSH access
2. **Node.js** (v18 or higher) installed on the server
3. **PM2** installed globally: `npm install -g pm2`
4. **Git** installed on the server
5. **GitHub repository** with your code

## Initial Server Setup

### 1. Connect to Your Vultr Server

```bash
ssh root@your-server-ip
```

### 2. Install Node.js (if not already installed)

```bash
# Using NodeSource (recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install PM2

```bash
npm install -g pm2
```

### 4. Clone Your Repository

```bash
cd /root
git clone https://github.com/your-username/ff_mkt_sale_dashboard.git
cd /root/ff_mkt_sales_campaign_dashboard
```

**Note:** The app directory on the server is `/root/ff_mkt_sales_campaign_dashboard`

### 5. Create Environment File

```bash
cd /root/ff_mkt_sales_campaign_dashboard
nano .env.local
```

Add your environment variables:
```env
AIRTABLE_API_KEY=your-api-key-here
AIRTABLE_BASE_ID=app0YMWSt1LtrGu7S
NEXT_PUBLIC_BASE_URL=http://your-domain.com:3021
# or if using reverse proxy:
# NEXT_PUBLIC_BASE_URL=http://your-domain.com
```

### 6. Create Initial Cache

```bash
cd /root/ff_mkt_sales_campaign_dashboard
npm install
npm run build
npm run update-cache
```

## Deployment

### Option 1: Using the Deployment Script (Recommended)

```bash
cd /root/ff_mkt_sales_campaign_dashboard
./deploy.sh
```

Or use npm:
```bash
npm run deploy
```

### Option 2: Manual Deployment

```bash
cd /root/ff_mkt_sales_campaign_dashboard

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
```

## PM2 Management

### View Application Status

```bash
pm2 status
pm2 list
```

### View Logs

```bash
# All logs
pm2 logs ff-mkt-sale-dashboard

# Error logs only
pm2 logs ff-mkt-sale-dashboard --err

# Real-time monitoring
pm2 monit
```

### Restart Application

```bash
pm2 restart ff-mkt-sale-dashboard
```

### Stop Application

```bash
pm2 stop ff-mkt-sale-dashboard
```

### Delete Application

```bash
pm2 delete ff-mkt-sale-dashboard
```

## Setup PM2 to Start on Server Reboot

```bash
# Generate startup script
pm2 startup

# Follow the instructions shown (usually involves running a sudo command)

# Save current PM2 process list
pm2 save
```

## Configure Reverse Proxy (Nginx)

If you want to use a domain name instead of IP:port, set up Nginx:

### Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/ff-dashboard
```

**Note:** If you're running as root, you may not need `sudo` for some commands.

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3021;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/ff-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Schedule Daily Cache Updates

The deployment script (`deploy.sh`) **automatically sets up a daily cron job** to update the cache at 2:00 AM. No manual setup needed!

### Automatic Setup (Recommended)

The `deploy.sh` script automatically:
- Creates a cron script at `update-cache-cron.sh`
- Adds a cron job that runs daily at 2:00 AM
- Logs cache updates to `logs/cache-update.log`

### Manual Setup (if needed)

If you need to manually set up or modify the cron job:

```bash
crontab -e
```

Add this line (runs at 2:00 AM daily):

```cron
0 2 * * * /root/ff_mkt_sales_campaign_dashboard/update-cache-cron.sh
```

### View Cron Jobs

```bash
# List all cron jobs
crontab -l

# View cron job logs
tail -f logs/cache-update.log
```

### Change Cache Update Time

To change when the cache updates (e.g., 3:00 AM instead of 2:00 AM):

```bash
# Remove old cron job
crontab -l | grep -v "update-cache-cron.sh" | crontab -

# Add new cron job (3:00 AM example)
(crontab -l 2>/dev/null; echo "0 3 * * * /root/ff_mkt_sales_campaign_dashboard/update-cache-cron.sh") | crontab -
```

## Troubleshooting

### Application Won't Start

1. Check PM2 logs:
   ```bash
   pm2 logs ff-mkt-sale-dashboard
   ```

2. Verify environment variables:
   ```bash
   cat .env.local
   ```

3. Check if port 3021 is available:
   ```bash
   sudo netstat -tulpn | grep 3021
   # or
   sudo ss -tulpn | grep 3021
   ```

### Build Fails

1. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run build
   ```

2. Check Node.js version:
   ```bash
   node --version  # Should be v18 or higher
   ```

### Cache Not Updating

1. Check if cache file exists:
   ```bash
   ls -la data/funnel-data.json
   ```

2. Manually update cache:
   ```bash
   npm run update-cache
   ```

3. Check Airtable API key:
   ```bash
   echo $AIRTABLE_API_KEY
   ```

## Security Considerations

1. **Firewall**: Configure your firewall to only allow necessary ports
   ```bash
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp     # HTTP (if using Nginx)
   sudo ufw allow 443/tcp    # HTTPS (if using SSL)
   sudo ufw enable
   ```

2. **Environment Variables**: Never commit `.env.local` to Git

3. **PM2 Access**: Consider using PM2's built-in authentication for remote access

## File Structure on Server

```
/root/ff_mkt_sales_campaign_dashboard/
├── .env.local              # Environment variables (not in git)
├── data/
│   └── funnel-data.json    # Cached data (auto-generated)
├── logs/                   # PM2 logs
├── .next/                  # Next.js build output
├── ecosystem.config.js     # PM2 configuration
├── deploy.sh              # Deployment script
├── update-cache-cron.sh   # Cron script for daily cache updates
└── ... (other project files)
```

## Quick Reference

```bash
# Navigate to app directory (always start here)
cd /root/ff_mkt_sales_campaign_dashboard

# Deploy (includes automatic cron setup)
npm run deploy
# or
./deploy.sh

# Update cache manually
npm run update-cache

# View app logs
pm2 logs ff-mkt-sale-dashboard

# View cache update logs
tail -f logs/cache-update.log

# Restart app
pm2 restart ff-mkt-sale-dashboard

# Check status
pm2 status

# Check cron jobs
crontab -l

# Test cron script manually
./update-cache-cron.sh
```

