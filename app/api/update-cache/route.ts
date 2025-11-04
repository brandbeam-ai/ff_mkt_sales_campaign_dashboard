import { NextResponse } from 'next/server';
import { fetchAndCacheFunnelData } from '@/lib/fetch-and-cache-data';

export async function GET(request: Request) {
  try {
    // Check for authorization header (optional - you can add a secret key)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CACHE_UPDATE_SECRET;
    
    // Optional: Add security by requiring a secret token
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await fetchAndCacheFunnelData();
    
    return NextResponse.json({
      success: true,
      message: 'Data cache updated successfully',
      lastUpdated: data.lastUpdated,
      recordCounts: {
        sentEmailLog: data.sentEmailLog.length,
        emailInteractions: data.emailInteractions.length,
        linkedinDMLog: data.linkedinDMLog.length,
        leadList: data.leadList.length,
      },
    });
  } catch (error) {
    console.error('Error updating cache:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update cache',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

