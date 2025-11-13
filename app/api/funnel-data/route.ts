import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    // Try to read from cached JSON file first
    const dataFilePath = join(process.cwd(), 'data', 'funnel-data.json');
    
    try {
      const fileContent = await readFile(dataFilePath, 'utf-8');
      const cachedData = JSON.parse(fileContent);
      
      // Return cached data if it exists
      return NextResponse.json(cachedData);
    } catch (fileError) {
      // If file doesn't exist or can't be read, check if we can fetch from Airtable
      console.warn('Cache file not found, checking Airtable access...', fileError);
      
      // Check if AIRTABLE_API_KEY is available
      if (!process.env.AIRTABLE_API_KEY) {
        return NextResponse.json(
          { 
            error: 'Cache file not found and AIRTABLE_API_KEY is not set. Please make sure AIRTABLE_API_KEY is set in your .env.local file and run npm run update-cache to create the cache file.',
            lastUpdated: null
          },
          { status: 500 }
        );
      }
    }

    // Only import Airtable if we need to fetch from it
    const base = (await import('@/lib/airtable')).default;

    // Fallback: Fetch all data from Airtable if cache doesn't exist
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

    return NextResponse.json({
      sentEmailLog: sentEmailLog.map((r: { fields: unknown }) => r.fields),
      emailInteractions: emailInteractions.map((r: { fields: unknown }) => r.fields),
      dmReplied: dmReplied.map((r: { fields: unknown }) => r.fields),
      linkedinDMLog: linkedinDMLog.map((r: { fields: unknown }) => r.fields),
      leadList: leadList.map((r: { fields: unknown }) => r.fields),
      deckAnalysisInteractions: deckAnalysisInteractions.map((r: { fields: unknown }) => r.fields),
      deckReports: deckReports.map((r: { fields: unknown }) => r.fields),
      ffInteractions: ffInteractions.map((r: { fields: unknown }) => r.fields),
      bookACall: bookACall.map((r: { fields: unknown }) => r.fields),
    });
  } catch (error) {
    console.error('Error fetching funnel data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funnel data' },
      { status: 500 }
    );
  }
}

