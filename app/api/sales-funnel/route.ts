import { NextResponse } from 'next/server';
import base from '@/lib/airtable';

export async function GET() {
  try {
    // Get FF website interaction data
    const ffInteractions = await base('FF website interaction')
      .select({
        fields: [
          'SessionID',
          'Session Duration (second)',
          'Click book a call button',
          'Book a call video start',
          'report date',
          'Week start of report date',
        ],
      })
      .all();

    // Get Book a call data
    const bookACall = await base('Book a call')
      .select({
        fields: [
          'Email',
          'Meeting Status',
          'Report date',
          'Week start of report date',
        ],
      })
      .all();

    return NextResponse.json({
      ffInteractions: ffInteractions.map((r) => r.fields),
      bookACall: bookACall.map((r) => r.fields),
    });
  } catch (error) {
    console.error('Error fetching sales funnel data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales funnel data' },
      { status: 500 }
    );
  }
}

