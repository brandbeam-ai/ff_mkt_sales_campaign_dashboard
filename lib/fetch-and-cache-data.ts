import base from '@/lib/airtable';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function fetchAndCacheFunnelData() {
  try {
    console.log('Starting data fetch from Airtable...');
    
    // Fetch all data in parallel with individual error handling
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

    // Extract results from Promise.allSettled
    const [
      sentEmailLogResult,
      emailInteractionsResult,
      dmRepliedResult,
      linkedinDMLogResult,
      leadListResult,
      deckAnalysisInteractionsResult,
      deckReportsResult,
      ffInteractionsResult,
      bookACallResult,
    ] = results;

    // Helper function to extract data or return empty array
    const getData = (result: PromiseSettledResult<any>) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error('Error fetching table:', result.reason);
        return [];
      }
    };

    const sentEmailLog = getData(sentEmailLogResult);
    const emailInteractions = getData(emailInteractionsResult);
    const dmReplied = getData(dmRepliedResult);
    const linkedinDMLog = getData(linkedinDMLogResult);
    const leadList = getData(leadListResult);
    const deckAnalysisInteractions = getData(deckAnalysisInteractionsResult);
    const deckReports = getData(deckReportsResult);
    const ffInteractions = getData(ffInteractionsResult);
    const bookACall = getData(bookACallResult);

    const data = {
      sentEmailLog: sentEmailLog.map((r: { fields: unknown }) => r.fields),
      emailInteractions: emailInteractions.map((r: { fields: unknown }) => r.fields),
      dmReplied: dmReplied.map((r: { fields: unknown }) => r.fields),
      linkedinDMLog: linkedinDMLog.map((r: { fields: unknown }) => r.fields),
      leadList: leadList.map((r: { fields: unknown }) => r.fields),
      deckAnalysisInteractions: deckAnalysisInteractions.map((r: { fields: unknown }) => r.fields),
      deckReports: deckReports.map((r: { fields: unknown }) => r.fields),
      ffInteractions: ffInteractions.map((r: { fields: unknown }) => r.fields),
      bookACall: bookACall.map((r: { fields: unknown }) => r.fields),
      lastUpdated: new Date().toISOString(),
    };

    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'data');
    try {
      await mkdir(dataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
    }

    // Save to JSON file
    const filePath = join(dataDir, 'funnel-data.json');
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    
    console.log(`Data successfully cached to ${filePath} at ${data.lastUpdated}`);
    return data;
  } catch (error) {
    console.error('Error fetching and caching funnel data:', error);
    throw error;
  }
}

