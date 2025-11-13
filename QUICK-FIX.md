# Quick Fix for Domain Not Loading Data

## The Problem
The domain `https://mktsaledashboard.11spark.org/` shows "Failed to fetch" error, but `http://158.247.207.5:3022/` works.

## Root Cause
PM2 is not loading environment variables from `.env.local` file, so the app can't access Airtable API.

## Solution (3 Steps)

### Step 1: Update ecosystem.config.js on Server

SSH into your server and update the file:

```bash
ssh root@158.247.207.5
cd /root/ff_mkt_sale_dashboard  # or wherever your project is
```

The `ecosystem.config.js` has been updated to load `.env.local` automatically. Make sure you have the latest version.

### Step 2: Restart PM2 with Updated Config

```bash
# Stop the current process
pm2 stop ff-mkt-sale-dashboard

# Delete the old process
pm2 delete ff-mkt-sale-dashboard

# Start with the new config (this will load .env.local)
pm2 start ecosystem.config.js

# Save the PM2 configuration
pm2 save
```

### Step 3: Verify It Works

```bash
# Check if environment variables are loaded
pm2 env ff-mkt-sale-dashboard | grep AIRTABLE

# Test the API
curl http://localhost:3022/api/funnel-data

# Check PM2 logs
pm2 logs ff-mkt-sale-dashboard --lines 50
```

## Alternative: Manual Environment Variable Setup

If the automatic loading doesn't work, you can manually add env vars to PM2:

```bash
# Edit ecosystem.config.js and add env vars directly:
pm2 restart ff-mkt-sale-dashboard --update-env
```

Or edit `ecosystem.config.js` and add:
```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3022,
  AIRTABLE_API_KEY: 'your-key-here',
  AIRTABLE_BASE_ID: 'app0YMWSt1LtrGu7S',
  ANTHROPIC_API_KEY: 'your-key-here'
}
```

Then restart:
```bash
pm2 restart ff-mkt-sale-dashboard
```

## Verify Nginx Configuration

Also make sure nginx is properly configured:

```bash
# Update nginx config if needed
sudo bash /root/ff_mkt_sale_dashboard/update-nginx-ssl.sh

# Or manually check
sudo nano /etc/nginx/sites-available/mktsaledashboard.11spark.org
# Make sure there's a location /api/ block

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## Diagnostic Script

Run the diagnostic script to check everything:

```bash
cd /root/ff_mkt_sale_dashboard
bash check-server-env.sh
```

This will show you:
- If .env.local exists
- If PM2 has environment variables
- If the app is running
- If the cache file exists
- If the API endpoint works

## Still Not Working?

1. **Check PM2 logs:**
   ```bash
   pm2 logs ff-mkt-sale-dashboard --err
   ```

2. **Check nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/mktsaledashboard.11spark.org.error.log
   ```

3. **Verify .env.local exists and has correct values:**
   ```bash
   cat .env.local
   ```

4. **Make sure cache file exists:**
   ```bash
   npm run update-cache
   ```

