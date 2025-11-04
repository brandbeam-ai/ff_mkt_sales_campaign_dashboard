/**
 * Script to update the cached funnel data from Airtable
 * Can be run manually or scheduled via cron/Task Scheduler
 * 
 * Usage:
 *   node scripts/update-cache.js
 * 
 * Or schedule with cron (Linux/Mac):
 *   0 2 * * * cd /path/to/project && node scripts/update-cache.js
 * 
 * Or schedule with Task Scheduler (Windows):
 *   Use scripts/update-cache.ps1 or configure to run this file directly
 */

/**
 * Script to update the cached funnel data from Airtable
 * Can be run manually or scheduled via cron/Task Scheduler
 * 
 * This script uses Node.js to directly call the cache function
 * without requiring the Next.js server to be running.
 */

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

// Simple env loader
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  }
}

loadEnv();

// Use dynamic import for ES modules
(async () => {
  try {
    // Import the function directly
    const modulePath = path.join(__dirname, '..', 'lib', 'fetch-and-cache-data.ts');
    // For TypeScript files, we need to use ts-node or compile first
    // Since Next.js compiles TS, we'll use the compiled version or use a different approach
    
    // Alternative: Use HTTP request to the API if server is running, or compile and run
    // For now, let's use a simpler approach - compile the TypeScript file
    console.log('Starting cache update...');
    
    // Import using require with ts-node or use tsx
    // For production, we'll use tsx or compile first
    // Let's use a simpler approach: make an HTTP request if server is running
    
    const https = require('https');
    const http = require('http');
    
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const url = new URL(`${BASE_URL}/api/update-cache`);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      timeout: 300000, // 5 minutes timeout for large datasets
    };
    
    console.log(`Connecting to ${BASE_URL}...`);
    
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log('✅ Cache updated successfully!');
            console.log(`   Last updated: ${response.lastUpdated}`);
            console.log(`   Record counts:`, response.recordCounts);
            process.exit(0);
          } else {
            console.error('❌ Error updating cache:', response);
            process.exit(1);
          }
        } catch (error) {
          console.error('❌ Error parsing response:', error);
          console.error('Response:', data);
          process.exit(1);
        }
      });
    });
    
    req.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        console.error('❌ Cannot connect to server. Please ensure the Next.js server is running.');
        console.error('   Start the server with: npm run dev');
        console.error('   Or use the direct cache update function instead.');
      } else {
        console.error('❌ Request error:', error);
      }
      process.exit(1);
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.error('❌ Request timed out after 5 minutes');
      process.exit(1);
    });
    
    req.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();

