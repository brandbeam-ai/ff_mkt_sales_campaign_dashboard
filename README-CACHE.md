# Data Caching System

The dashboard now uses a cached JSON file instead of fetching from Airtable on every page load. This improves performance and reduces API calls.

## How It Works

1. **Cache File**: Data is stored in `data/funnel-data.json`
2. **API Route**: `/api/funnel-data` reads from the cache file first
3. **Update Endpoint**: `/api/update-cache` fetches fresh data from Airtable and updates the cache
4. **Fallback**: If cache doesn't exist, the API will fetch from Airtable (first time only)

## Setup

### 1. Initial Cache Creation

Run this once to create the initial cache:

```bash
npm run update-cache
```

Or manually trigger the endpoint:
```bash
curl http://localhost:3000/api/update-cache
```

### 2. Schedule Daily Updates

You have several options to schedule daily cache updates:

#### Option A: Using Windows Task Scheduler (Windows)

**Method 1: Using PowerShell script (recommended)**
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger to "Daily" at your preferred time (e.g., 2:00 AM)
4. Action: Start a program
5. Program: `powershell.exe`
6. Arguments: `-ExecutionPolicy Bypass -File "D:\Toan_Dev\ff_mkt_sale_dashboard\scripts\update-cache.ps1"`
7. Start in: `D:\Toan_Dev\ff_mkt_sale_dashboard`

**Method 2: Using Node.js directly**
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger to "Daily" at your preferred time (e.g., 2:00 AM)
4. Action: Start a program
5. Program: `node`
6. Arguments: `D:\Toan_Dev\ff_mkt_sale_dashboard\scripts\update-cache.js`
7. Start in: `D:\Toan_Dev\ff_mkt_sale_dashboard`
8. **Important**: Make sure your Next.js server is running (or use a service that keeps it running)

#### Option B: Using Cron (Linux/Mac)

Add to crontab (`crontab -e`):
```
0 2 * * * cd /path/to/ff_mkt_sale_dashboard && node scripts/update-cache.js
```
This runs at 2:00 AM daily.

#### Option C: Using a Cron Service (Vercel/Hosting)

If deploying to Vercel, you can use Vercel Cron Jobs:
1. Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/update-cache",
    "schedule": "0 2 * * *"
  }]
}
```

#### Option D: Manual Update

You can manually update the cache anytime:
```bash
npm run update-cache
```

Or visit: `http://localhost:3000/api/update-cache`

## Security (Optional)

To secure the update endpoint, add to `.env.local`:
```
CACHE_UPDATE_SECRET=your-secret-key-here
```

Then update the cron/webhook to include the Authorization header:
```
Authorization: Bearer your-secret-key-here
```

## Troubleshooting

- **Cache not updating**: Check that the `data` directory exists and is writable
- **Dashboard shows old data**: Run `npm run update-cache` to refresh
- **First load slow**: This is normal on first visit - the cache will be created automatically

## File Structure

```
├── data/
│   └── funnel-data.json    # Cached data (auto-generated)
├── scripts/
│   └── update-cache.js     # Script to update cache
├── lib/
│   └── fetch-and-cache-data.ts  # Cache fetching logic
└── app/
    └── api/
        ├── funnel-data/
        │   └── route.ts    # Reads from cache
        └── update-cache/
            └── route.ts    # Updates cache
```

