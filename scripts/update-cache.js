/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Script to update the cached funnel data from Airtable
 * Can be run manually or scheduled via cron/Task Scheduler
 * 
 * This script directly calls the fetchAndCacheFunnelData function
 * without requiring the Next.js server to be running.
 * 
 * Usage:
 *   node scripts/update-cache.js
 * 
 * Or schedule with cron (Linux/Mac):
 *   0 2 * * * cd /path/to/project && node scripts/update-cache.js
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
  } else {
    console.error('❌ Error: .env.local file not found!');
    console.error('   Please create .env.local with AIRTABLE_API_KEY');
    process.exit(1);
  }
}

loadEnv();

// Check if AIRTABLE_API_KEY is set
if (!process.env.AIRTABLE_API_KEY) {
  console.error('❌ Error: AIRTABLE_API_KEY is not set in .env.local!');
  process.exit(1);
}

// Use dynamic import for ES modules
(async () => {
  try {
    console.log('Starting cache update...');
    console.log('Loading fetchAndCacheFunnelData function...');
    
    // Import the compiled JavaScript file (Next.js compiles TS to JS in .next directory)
    // For production builds, we need to use the compiled version
    // Try to import from the compiled source
    
    // Since we're in a production build, the TypeScript files are compiled
    // We need to use tsx or ts-node to run TypeScript directly, or import from compiled JS
    // For simplicity, let's use require with a workaround to load the module
    
    // Option 1: Try to use tsx if available (requires tsx package)
    // Option 2: Import from compiled .next files (complex)
    // Option 3: Use a standalone script that doesn't require Next.js compilation
    
    // Best approach: Create a standalone version that uses Airtable directly
    // But for now, let's try to import the compiled module
    
    try {
      // Try to import the compiled version
      // In production, Next.js compiles to .next/server/app/api/update-cache/route.js
      // But we need the lib function directly
      
      // Use require with the compiled path
      // Since Next.js builds to .next, we need to check if it exists
      const buildPath = path.join(__dirname, '..', '.next', 'server', 'lib', 'fetch-and-cache-data.js');
      
      if (fs.existsSync(buildPath)) {
        // Import from compiled build
        const { fetchAndCacheFunnelData } = require(buildPath);
        const data = await fetchAndCacheFunnelData();
        console.log('✅ Cache updated successfully!');
        console.log(`   Last updated: ${data.lastUpdated}`);
        console.log(`   Record counts:`, {
          sentEmailLog: data.sentEmailLog.length,
          emailInteractions: data.emailInteractions.length,
          linkedinDMLog: data.linkedinDMLog.length,
          deckAnalysisInteractions: data.deckAnalysisInteractions.length,
          redemptiveDeckAnalysisInteractions: data.deckAnalysisInteractions.filter((item: any) => item.__deckSource === 'redemptive').length,
          ffInteractions: data.ffInteractions.length,
          leadList: data.leadList.length,
        });
        process.exit(0);
      } else {
        // Fallback: Use the API endpoint (requires server to be running)
        console.log('Build not found, trying API endpoint...');
        throw new Error('Build not found, will try API');
      }
    } catch (importError) {
      // Fallback to API endpoint method
      console.log('Direct import failed, trying API endpoint...');
      console.log('Note: This requires the server to be running');
      
      const https = require('https');
      const http = require('http');
      
      const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3022';
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
          console.error('❌ Cannot connect to server.');
          console.error('   The server must be running for API endpoint method.');
          console.error('   Start the server first, then run this script.');
          console.error('   Or wait for the build to complete and use the compiled version.');
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
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();

