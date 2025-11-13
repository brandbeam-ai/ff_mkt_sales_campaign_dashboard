import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parse as parseDate, format, subDays } from 'date-fns';

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    
    // Calculate date range: use 'from' query param if provided, otherwise default to 7 days ago
    const today = new Date();
    let lastWeekStart: Date;
    
    if (fromParam) {
      // Try to parse the 'from' date
      try {
        // Try DD/MM/YYYY format first
        const parsed = parseDate(fromParam, 'dd/MM/yyyy', new Date());
        if (!isNaN(parsed.getTime())) {
          lastWeekStart = parsed;
        } else {
          // Try ISO format (YYYY-MM-DD)
          const isoParsed = parseDate(fromParam, 'yyyy-MM-dd', new Date());
          if (!isNaN(isoParsed.getTime())) {
            lastWeekStart = isoParsed;
          } else {
            // Try native Date parsing
            lastWeekStart = new Date(fromParam);
            if (isNaN(lastWeekStart.getTime())) {
              throw new Error('Invalid date format');
            }
          }
        }
      } catch {
        return NextResponse.json(
          { error: `Invalid 'from' date format. Use DD/MM/YYYY or YYYY-MM-DD format.` },
          { status: 400 }
        );
      }
    } else {
      // Default to 7 days ago
      lastWeekStart = subDays(today, 7);
    }
    
    const lastWeekStartDate = format(lastWeekStart, 'yyyy-MM-dd');
    const todayDate = format(today, 'yyyy-MM-dd');

    // Try to read from cached JSON file first
    const dataFilePath = join(process.cwd(), 'data', 'funnel-data.json');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let deckAnalysisInteractions: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let deckAnalysisInteractionsRedemptive: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let deckReports: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let leadList: any[] = [];

    try {
      const fileContent = await readFile(dataFilePath, 'utf-8');
      const cachedData = JSON.parse(fileContent);
      
      deckAnalysisInteractions = cachedData.deckAnalysisInteractions || [];
      deckReports = cachedData.deckReports || [];
      leadList = cachedData.leadList || [];
      
      // Filter for primary and redemptive deck interactions
      deckAnalysisInteractionsRedemptive = deckAnalysisInteractions.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (record: any) => record && record.__deckSource === 'redemptive'
      );
      deckAnalysisInteractions = deckAnalysisInteractions.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (record: any) => record && record.__deckSource === 'primary'
      );
    } catch (fileError) {
      // If file doesn't exist, fetch from Airtable
      console.warn('Cache file not found, fetching from Airtable...', fileError);
      
      if (!process.env.AIRTABLE_API_KEY) {
        return NextResponse.json(
          { 
            error: 'Cache file not found and AIRTABLE_API_KEY is not set.',
          },
          { status: 500 }
        );
      }

      const base = (await import('@/lib/airtable')).default;

      const results = await Promise.allSettled([
        base('tblu1ysfvNegTl5mU')
          .select({
            fields: [
              'SessionID',
              'Session Duration (second)',
              'report date',
              'Week start of report date',
              'Email (from Lead list)',
              'Source (from Lead list)',
              'Lead Linkedin Url (from Lead list)',
            ],
          })
          .all(),
        base('tblnpro0Nf39WIMK6')
          .select({
            fields: [
              'SessionID',
              'Session Duration (second)',
              'report date',
              'Week start of report date',
              'Email (from Lead list)',
              'Source (from Lead list)',
              'Lead Linkedin Url (from Lead list)',
            ],
          })
          .all(),
        base('deck analysis reports')
          .select({
            fields: ['Email', 'Report date', 'Week start of report date'],
          })
          .all(),
        base('Lead list')
          .select({
            fields: [
              'Email',
              'Source',
              'Person Linkedin Url',
            ],
          })
          .all(),
      ]);

      const [
        primaryDeckResult,
        redemptiveDeckResult,
        deckReportsResult,
        leadListResult,
      ] = results;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getData = (result: PromiseSettledResult<any>) => {
        if (result.status === 'fulfilled') {
          return result.value.map((r: { fields: unknown }) => r.fields);
        } else {
          console.error('Error fetching table:', result.reason);
          return [];
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deckAnalysisInteractions = getData(primaryDeckResult).map((record: any) => ({
        ...record,
        __deckSource: 'primary',
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deckAnalysisInteractionsRedemptive = getData(redemptiveDeckResult).map((record: any) => ({
        ...record,
        __deckSource: 'redemptive',
      }));
      deckReports = getData(deckReportsResult);
      leadList = getData(leadListResult);
    }

    // Helper function to extract email from record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getEmail = (record: any): string => {
      const emailField = record['Email (from Lead list)'] || record['Email'] || '';
      if (Array.isArray(emailField)) {
        return emailField.find((value) => value) || '';
      }
      return emailField.toString().trim().toLowerCase();
    };


    // Helper function to parse date from record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getRecordDate = (record: any): Date | null => {
      // Try report date first, then week start
      const reportDateStr = record['report date'] || record['Report date'];
      const weekStartStr = record['Week start of report date'];
      
      if (reportDateStr) {
        const parsed = parseDate(reportDateStr, 'dd/MM/yyyy', new Date());
        if (!isNaN(parsed.getTime())) return parsed;
        // Try ISO format
        const isoParsed = new Date(reportDateStr);
        if (!isNaN(isoParsed.getTime())) return isoParsed;
      }
      
      if (weekStartStr) {
        return parseDate(weekStartStr, 'dd/MM/yyyy', new Date());
      }
      
      return null;
    };

    // Track visits by email and deck source, and also track LinkedIn URLs from interaction records
    // Only count visits that occurred on or after the from date
    const visitMap = new Map<string, Set<'primary' | 'redemptive'>>();
    const emailToLinkedInFromInteractions = new Map<string, string>();
    
    // Process primary deck visits
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deckAnalysisInteractions.forEach((record: any) => {
      const email = getEmail(record);
      if (!email) return;
      
      const sourceFromLeadList = (record['Source (from Lead list)'] || '').toString().toLowerCase();
      const sourceMediumField = (record['Source / medium'] || '').toString().toLowerCase();
      // Filter out internal and test sources (consistent with calculate-metrics.ts)
      if (sourceFromLeadList.includes('internal') || sourceMediumField.includes('test')) {
        return;
      }

      // Filter by date: only count visits on or after the from date
      const recordDate = getRecordDate(record);
      if (!recordDate || recordDate < lastWeekStart) {
        return;
      }

      // Filter by medium: only count visits where medium contains "rec" (consistent with LM Performance)
      const medium = record['Medium'] || 
                     record['Source / medium'] || 
                     record['Medium (from Source / medium)'] ||
                     record['source_medium'] ||
                     '';
      const sourceMedium = record['Source / medium'] || record['Source/medium'] || '';
      const finalMedium = (medium || sourceMedium).trim().toLowerCase();
      if (!finalMedium || !finalMedium.includes('rec')) {
        return;
      }

      if (!visitMap.has(email)) {
        visitMap.set(email, new Set());
      }
      visitMap.get(email)!.add('primary');
      
      // Store LinkedIn URL from interaction record if available
      const linkedInUrl = record['Lead Linkedin Url (from Lead list)'] || '';
      if (linkedInUrl && !emailToLinkedInFromInteractions.has(email)) {
        emailToLinkedInFromInteractions.set(email, linkedInUrl.toString());
      }
    });

    // Process redemptive deck visits
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deckAnalysisInteractionsRedemptive.forEach((record: any) => {
      const email = getEmail(record);
      if (!email) return;
      
      const sourceFromLeadList = (record['Source (from Lead list)'] || '').toString().toLowerCase();
      const sourceMediumField = (record['Source / medium'] || '').toString().toLowerCase();
      // Filter out internal and test sources (consistent with calculate-metrics.ts)
      if (sourceFromLeadList.includes('internal') || sourceMediumField.includes('test')) {
        return;
      }

      // Filter by date: only count visits on or after the from date
      const recordDate = getRecordDate(record);
      if (!recordDate || recordDate < lastWeekStart) {
        return;
      }

      // Filter by medium: only count visits where medium contains "rec" (consistent with LM Performance)
      const medium = record['Medium'] || 
                     record['Source / medium'] || 
                     record['Medium (from Source / medium)'] ||
                     record['source_medium'] ||
                     '';
      const sourceMedium = record['Source / medium'] || record['Source/medium'] || '';
      const finalMedium = (medium || sourceMedium).trim().toLowerCase();
      if (!finalMedium || !finalMedium.includes('rec')) {
        return;
      }

      if (!visitMap.has(email)) {
        visitMap.set(email, new Set());
      }
      visitMap.get(email)!.add('redemptive');
      
      // Store LinkedIn URL from interaction record if available
      const linkedInUrl = record['Lead Linkedin Url (from Lead list)'] || '';
      if (linkedInUrl && !emailToLinkedInFromInteractions.has(email)) {
        emailToLinkedInFromInteractions.set(email, linkedInUrl.toString());
      }
    });

    // Find leads who visited either site (primary OR redemptive)
    const leadsWithEitherSite = Array.from(visitMap.entries())
      .filter(([, sites]) => sites.size >= 1) // Changed from >= 2 to >= 1
      .map(([email]) => email);

    // Track all submissions (ever, not just since from date)
    const allSubmissions = new Set<string>();
    deckReports.forEach((record) => {
      const email = getEmail(record);
      if (!email) return;
      // Add to set regardless of date - we want to exclude anyone who ever submitted
      allSubmissions.add(email);
    });

    // Filter leads who visited either site but never submitted any deck
    const inactiveLeads = leadsWithEitherSite.filter(
      (email) => !allSubmissions.has(email)
    );

    // Create email to LinkedIn URL mapping
    // Priority: 1) From interaction records, 2) From Lead list table
    const emailToLinkedIn = new Map<string, string>();
    
    // First, use LinkedIn URLs from interaction records (already collected above)
    emailToLinkedInFromInteractions.forEach((url, email) => {
      emailToLinkedIn.set(email, url);
    });
    
    // Then, fallback to Lead list table field "Person Linkedin Url" if not found in interactions
    leadList.forEach((record) => {
      const email = getEmail(record);
      if (!email) return;
      
      // Only add if we don't already have a LinkedIn URL from interactions
      if (!emailToLinkedIn.has(email)) {
        const linkedInUrl = record['Person Linkedin Url'] || '';
        if (linkedInUrl) {
          emailToLinkedIn.set(email, linkedInUrl.toString());
        }
      }
    });

    // Build result with LinkedIn information
    const result = inactiveLeads
      .map((email) => {
        const linkedInUrl = emailToLinkedIn.get(email);
        return {
          email,
          linkedInUrl: linkedInUrl || null,
        };
      });

    // Add debug information
    const debug = {
      totalVisitsTracked: visitMap.size,
      leadsWithEitherSite: leadsWithEitherSite.length,
      leadsWithPrimaryOnly: Array.from(visitMap.entries()).filter(([, sites]) => sites.has('primary') && !sites.has('redemptive')).length,
      leadsWithRedemptiveOnly: Array.from(visitMap.entries()).filter(([, sites]) => sites.has('redemptive') && !sites.has('primary')).length,
      leadsWithBothSites: Array.from(visitMap.entries()).filter(([, sites]) => sites.size >= 2).length,
      totalSubmissionsEver: allSubmissions.size,
      inactiveLeadsCount: inactiveLeads.length,
      leadsWithLinkedIn: result.filter((lead) => lead.linkedInUrl !== null).length,
      leadsWithoutLinkedIn: result.filter((lead) => lead.linkedInUrl === null).length,
    };

    return NextResponse.json({
      leads: result,
      count: result.length,
      dateRange: {
        from: lastWeekStartDate,
        to: todayDate,
      },
      criteria: {
        visitedEitherSite: true,
        noSubmission: true, // No submission ever (all time)
      },
      debug, // Include debug info to help troubleshoot
    });
  } catch (error) {
    console.error('Error fetching inactive lead magnet leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inactive lead magnet leads' },
      { status: 500 }
    );
  }
}

