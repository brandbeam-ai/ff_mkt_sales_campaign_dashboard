import { NextResponse } from 'next/server';
import base from '@/lib/airtable';

export async function GET() {
  try {
    // Get Sent Email Log data
    const sentEmailLog = await base('Sent Email Log')
      .select({
        fields: [
          'Email',
          'Report date',
          'Week start of report date',
          'Sequence',
          'Source (from Lead list)',
        ],
      })
      .all();

    // Get Email interaction data
    const emailInteractions = await base('Email interaction')
      .select({
        fields: [
          'Email',
          'Event',
          'Report date',
          'Week start of report date',
          'Source (from Lead list)',
        ],
      })
      .all();

    // Get DM_replied data
    const dmReplied = await base('DM_replied')
      .select({
        fields: [
          'Lead LK URL',
          'Total messages',
          'Last message sent date',
          'Week start of report date',
          'Source (from Lead list)',
        ],
      })
      .all();

    // Get Lead list data for organic leads
    const leadList = await base('Lead list')
      .select({
        fields: ['Email', 'Source', 'Created', 'Week start of report date'],
      })
      .all();

    // Get deck analysis website interaction
    const deckAnalysisInteractions = await base('deck analysis website interaction')
      .select({
        fields: [
          'SessionID',
          'Session Duration (second)',
          'Upload file to analyze',
          'report date',
          'Week start of report date',
        ],
      })
      .all();

    // Get deck analysis reports
    const deckReports = await base('deck analysis reports')
      .select({
        fields: ['Email', 'Report date', 'Week start of report date'],
      })
      .all();

    return NextResponse.json({
      sentEmailLog: sentEmailLog.map((r) => r.fields),
      emailInteractions: emailInteractions.map((r) => r.fields),
      dmReplied: dmReplied.map((r) => r.fields),
      leadList: leadList.map((r) => r.fields),
      deckAnalysisInteractions: deckAnalysisInteractions.map((r) => r.fields),
      deckReports: deckReports.map((r) => r.fields),
    });
  } catch (error) {
    console.error('Error fetching marketing funnel data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketing funnel data' },
      { status: 500 }
    );
  }
}

