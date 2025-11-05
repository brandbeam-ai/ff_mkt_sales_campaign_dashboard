/**
 * Standalone script to update cache directly without requiring the server
 * This uses Node.js to directly call the fetchAndCacheFunnelData function
 * 
 * Usage:
 *   node scripts/update-cache-direct.js
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

// Import Airtable directly and create the cache
(async () => {
  try {
    console.log('Starting direct cache update...');
    
    // Import Airtable
    const Airtable = require('airtable');
    const { writeFile, mkdir } = require('fs').promises;
    const { join } = require('path');
    
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID || 'app0YMWSt1LtrGu7S'
    );
    
    console.log('Fetching data from Airtable...');
    
    // Fetch all data in parallel
    const results = await Promise.allSettled([
      base('Sent Email Log')
        .select({
          fields: [
            'Email',
            'Report date',
            'Week start of report date',
            'Sequence',
            'Source (from Lead list)',
          ],
        })
        .all(),
      base('Email interaction')
        .select({
          fields: [
            'Email',
            'Event',
            'Report date',
            'Week start of report date',
            'Source (from Lead list)',
            'mailgun_tags',
          ],
        })
        .all(),
      base('DM_replied')
        .select({
          fields: [
            'Lead LK URL',
            'Total messages',
            'Last message sent date',
            'Week start of report date',
            'Source (from Lead list)',
          ],
        })
        .all(),
      base('Linkedin DM log')
        .select({
          fields: [
            'Conversation_id',
            'Sender',
            'Sent time',
            'Week start of report date',
            'Link to DM_replied',
          ],
        })
        .all(),
      base('Lead list')
        .select({
          fields: [
            'Email',
            'Source',
            'Created',
            'DM Sent',
            'DM Replied',
            'Start DM sequence',
          ],
        })
        .all(),
      base('deck analysis website interaction')
        .select({
          fields: [
            'SessionID',
            'Session Duration (second)',
            'Upload file to analyze',
            'report date',
            'Week start of report date',
            'Medium',
            'Source / medium',
          ],
        })
        .all(),
      base('deck analysis reports')
        .select({
          fields: ['Email', 'Report date', 'Week start of report date'],
        })
        .all(),
      base('FF website interaction')
        .select({
          fields: [
            'SessionID',
            'Session Duration (second)',
            'Click book a call button',
            'Book a call video start',
            'report date',
            'Week start of report date',
            'Medium',
            'Source / medium',
          ],
        })
        .all(),
      base('Book a call')
        .select({
          fields: [
            'Email',
            'Meeting Status',
            'Report date',
            'Week start of report date',
          ],
        })
        .all(),
    ]);
    
    // Extract results
    const getData = (result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error('Error fetching table:', result.reason);
        return [];
      }
    };
    
    const sentEmailLog = getData(results[0]);
    const emailInteractions = getData(results[1]);
    const dmReplied = getData(results[2]);
    const linkedinDMLog = getData(results[3]);
    const leadList = getData(results[4]);
    const deckAnalysisInteractions = getData(results[5]);
    const deckReports = getData(results[6]);
    const ffInteractions = getData(results[7]);
    const bookACall = getData(results[8]);
    
    const data = {
      sentEmailLog: sentEmailLog.map((r) => r.fields),
      emailInteractions: emailInteractions.map((r) => r.fields),
      dmReplied: dmReplied.map((r) => r.fields),
      linkedinDMLog: linkedinDMLog.map((r) => r.fields),
      leadList: leadList.map((r) => r.fields),
      deckAnalysisInteractions: deckAnalysisInteractions.map((r) => r.fields),
      deckReports: deckReports.map((r) => r.fields),
      ffInteractions: ffInteractions.map((r) => r.fields),
      bookACall: bookACall.map((r) => r.fields),
      lastUpdated: new Date().toISOString(),
    };
    
    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'data');
    try {
      await mkdir(dataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Save to JSON file
    const filePath = join(dataDir, 'funnel-data.json');
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    
    console.log('✅ Cache updated successfully!');
    console.log(`   Last updated: ${data.lastUpdated}`);
    console.log(`   Cache file: ${filePath}`);
    console.log(`   Record counts:`, {
      sentEmailLog: data.sentEmailLog.length,
      emailInteractions: data.emailInteractions.length,
      linkedinDMLog: data.linkedinDMLog.length,
      leadList: data.leadList.length,
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating cache:', error);
    process.exit(1);
  }
})();

