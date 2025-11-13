# Nginx Troubleshooting Guide

## Problem: Domain doesn't load data but IP address works

If `https://mktsaledashboard.11spark.org/` shows errors but `http://158.247.207.5:3022/` works, follow these steps:

## Step 1: Update Nginx Configuration

### Option A: If SSL is already set up

Run the update script on your server:

```bash
cd /root/ff_mkt_sale_dashboard  # or wherever your project is
sudo bash update-nginx-ssl.sh
```

### Option B: Manual Update

1. SSH into your server:
```bash
ssh root@158.247.207.5
```

2. Edit the nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/mktsaledashboard.11spark.org
```

3. Make sure the configuration includes explicit `/api/` handling (see the updated `setup-nginx.sh` file)

4. Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 2: Check Environment Variables

Make sure your `.env.local` file on the server has all required variables:

```bash
cd /root/ff_mkt_sale_dashboard  # or your project directory
cat .env.local
```

Required variables:
- `AIRTABLE_API_KEY=your-key-here`
- `AIRTABLE_BASE_ID=app0YMWSt1LtrGu7S`
- `ANTHROPIC_API_KEY=your-key-here` (for Claude reports)

## Step 3: Restart the Next.js Application

```bash
pm2 restart ff-mkt-sale-dashboard
# or
pm2 restart all
```

## Step 4: Check Logs

### Nginx Error Logs
```bash
sudo tail -f /var/log/nginx/mktsaledashboard.11spark.org.error.log
```

### Next.js Application Logs
```bash
pm2 logs ff-mkt-sale-dashboard
```

### Check for specific errors:
```bash
# Check if API routes are being hit
sudo tail -f /var/log/nginx/mktsaledashboard.11spark.org.access.log | grep /api
```

## Step 5: Verify API Routes Work

Test the API directly:
```bash
curl https://mktsaledashboard.11spark.org/api/funnel-data
```

If this fails, check:
1. Is the Next.js app running? `pm2 status`
2. Are environment variables loaded? Check PM2 ecosystem config
3. Is port 3022 accessible? `netstat -tlnp | grep 3022`

## Common Issues

### Issue 1: "Failed to fetch" error
**Cause**: API routes not being proxied correctly
**Solution**: Ensure `/api/` location block is in nginx config before the catch-all `/` block

### Issue 2: CORS errors
**Cause**: Missing headers in nginx config
**Solution**: Ensure `X-Forwarded-Proto`, `X-Forwarded-Host` headers are set

### Issue 3: Timeout errors
**Cause**: API calls taking too long
**Solution**: Increase timeout values in nginx config (already set to 120s for API routes)

### Issue 4: Environment variables not available
**Cause**: PM2 not loading `.env.local` file
**Solution**: 
1. Check `ecosystem.config.js` - ensure env vars are set there OR
2. Use `dotenv` in your Next.js app OR
3. Set environment variables in PM2: `pm2 restart ff-mkt-sale-dashboard --update-env`

## Quick Fix Commands

```bash
# 1. Update nginx config
sudo bash /root/ff_mkt_sale_dashboard/update-nginx-ssl.sh

# 2. Restart services
sudo systemctl reload nginx
pm2 restart ff-mkt-sale-dashboard

# 3. Check status
pm2 status
sudo systemctl status nginx

# 4. Test
curl -I https://mktsaledashboard.11spark.org/api/funnel-data
```

## Still Not Working?

1. Check firewall: `sudo ufw status`
2. Verify DNS: `nslookup mktsaledashboard.11spark.org`
3. Check SSL certificate: `sudo certbot certificates`
4. Review all logs: `sudo journalctl -u nginx -n 50`

