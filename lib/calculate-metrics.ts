/* eslint-disable @typescript-eslint/no-explicit-any */
import { sortWeeksChronologically } from './utils';

export interface WeekData {
  weekStart: string;
  [key: string]: any;
}

export interface Metric {
  week: string;
  value: number;
  percentage?: number;
  previousWeek?: number;
  change?: number;
  uniqueEmails?: number;
  avgInteractionsPerLead?: number;
  clicked?: number;
  uniqueEmailsOpened?: number;
  uniqueEmailsClicked?: number;
  uniqueVisits?: number; // Unique visits based on medium containing "rec"
  uniqueLeads?: number; // Unique leads (for deck submissions)
  links?: string[];
  leadEmails?: string[];
  clickLeadEmails?: string[];
  clickLinksByEmail?: Record<string, string[]>;
  leadSessionCounts?: Record<string, number>;
  replied?: number;
  noReply?: number;
  success?: number;
  failed?: number;
  leadsOpenedMultiple?: number;
  highInterestCount?: number;
  bounceCount?: number;
  highInterestLeads?: string[];
  bounceLeads?: string[];
  leadCountLabel?: string;
  deckBreakdown?: {
    primaryCount?: number;
    redemptiveCount?: number;
    primaryAverageDuration?: number;
    redemptiveAverageDuration?: number;
    primaryUniqueVisits?: number;
    redemptiveUniqueVisits?: number;
  };
}

// Helper function to calculate email metrics for a specific sequence filter
function calculateEmailMetricsBySequence(
  sentEmailLog: any[],
  emailInteractions: any[],
  sequenceFilter: (sequence: string) => boolean
): Metric[] {
  const weekMap = new Map<string, { sent: number; success: number; failed: number }>();

  // Count sent emails by week for filtered sequence
  // Each record in sentEmailLog represents one email send
  sentEmailLog.forEach((record) => {
    const weekStart = record['Week start of report date'];
    const sequence = record['Sequence'] || '';
    
    if (!weekStart || !sequenceFilter(sequence)) return;

    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, { sent: 0, success: 0, failed: 0 });
    }

    const weekData = weekMap.get(weekStart)!;
    weekData.sent++; // Increment for every email sent (each record = one email)
    weekData.success++;
  });

  // Check for failed emails (undeliverable) from email interactions
  emailInteractions.forEach((record) => {
    if (record['Event'] === 'unsubscribed' || record['Event']?.toLowerCase().includes('fail')) {
      const weekStart = record['Week start of report date'];
      if (weekStart && weekMap.has(weekStart)) {
        const weekData = weekMap.get(weekStart)!;
        weekData.success--;
        weekData.failed++;
      }
    }
  });

  // Track unique emails per week
  // Note: If a lead receives multiple emails in the same week, they will have multiple records
  // in sentEmailLog. The Set automatically deduplicates, so uniqueEmails will be <= data.sent
  const uniqueEmailMap = new Map<string, Set<string>>();
  
  sentEmailLog.forEach((record) => {
    const weekStart = record['Week start of report date'];
    const email = record['Email'] || '';
    const sequence = record['Sequence'] || '';
    
    if (!weekStart || !email || !sequenceFilter(sequence)) return;
    
    if (!uniqueEmailMap.has(weekStart)) {
      uniqueEmailMap.set(weekStart, new Set<string>());
    }
    // Using Set ensures each email address is only counted once per week
    // If the same email appears in multiple records, it's only added once
    uniqueEmailMap.get(weekStart)!.add(email.toLowerCase());
  });

  const metrics: Metric[] = Array.from(weekMap.entries())
    .map(([week, data]) => {
      const uniqueEmails = uniqueEmailMap.get(week)?.size || 0;
      // data.sent = total number of email sends (each record = 1 send)
      // uniqueEmails = number of unique email addresses that received emails
      // If these are equal, it means each lead received exactly 1 email that week
      return {
        week,
        value: data.sent, // Total emails sent (counts all records)
        percentage: data.sent > 0 ? (data.success / data.sent) * 100 : 0,
        success: data.success,
        failed: data.failed,
        uniqueEmails: uniqueEmails, // Unique email addresses (deduplicated)
      };
    })
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  // Calculate week-over-week change
  for (let i = 1; i < metrics.length; i++) {
    const currentMetric = metrics[i];
    const previousMetric = metrics[i - 1];
    if (currentMetric && previousMetric) {
      const previousWeekValue = previousMetric.value;
      currentMetric.previousWeek = previousWeekValue;
      currentMetric.change = previousWeekValue > 0
        ? ((currentMetric.value - previousWeekValue) / previousWeekValue) * 100
        : 0;
    }
  }

  return metrics;
}

export function calculateEmailOutreachMetrics(
  sentEmailLog: any[],
  emailInteractions: any[]
): Metric[] {
  // Return combined metrics (for backward compatibility)
  return calculateEmailMetricsBySequence(
    sentEmailLog,
    emailInteractions,
    () => true // Include all sequences
  );
}

export function calculateMKTOutreachMetrics(
  sentEmailLog: any[],
  emailInteractions: any[]
): Metric[] {
  // Filter for MKT Outreach sequence
  return calculateEmailMetricsBySequence(
    sentEmailLog,
    emailInteractions,
    (sequence) => {
      const seqLower = (sequence || '').toLowerCase();
      return seqLower.includes('mkt outreach') || seqLower === 'mkt outreach';
    }
  );
}

export function calculateNurtureEmailMetrics(
  sentEmailLog: any[],
  emailInteractions: any[]
): Metric[] {
  // Filter for Nurture sequences (General Nurture, Win-back Sequence, etc.)
  return calculateEmailMetricsBySequence(
    sentEmailLog,
    emailInteractions,
    (sequence) => {
      const seqLower = (sequence || '').toLowerCase();
      return seqLower.includes('nurture') || 
             seqLower.includes('win-back') ||
             seqLower === 'general nurture';
    }
  );
}

// Helper function to calculate email interaction metrics filtered by mailgun_tags
function calculateEmailInteractionMetricsByTag(
  emailInteractions: any[],
  tagFilter: (tag: string) => boolean
): Metric[] {
  const weekMap = new Map<string, { opened: number; clicked: number; unsubscribed: number; uniqueEmailsOpened: Set<string>; uniqueEmailsClicked: Set<string>; clickLinks: Set<string>; }>();

  emailInteractions.forEach((record) => {
    const weekStart = record['Week start of report date'];
    const mailgunTag = record['mailgun_tags'] || '';
    
    if (!weekStart || !tagFilter(mailgunTag)) return;

    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, { opened: 0, clicked: 0, unsubscribed: 0, uniqueEmailsOpened: new Set(), uniqueEmailsClicked: new Set(), clickLinks: new Set() });
    }

    const weekData = weekMap.get(weekStart)!;
    const event = record['Event']?.toLowerCase() || '';

    if (event.includes('open') || event.includes('opened')) {
      weekData.opened++;
    } else if (event.includes('click') || event.includes('clicked')) {
      weekData.clicked++;
    } else if (event.includes('unsubscribe') || event.includes('unsubscribed')) {
      weekData.unsubscribed++;
    }
  });

  const uniqueEmailMap = new Map<string, Set<string>>();
  const emailInteractionCountMap = new Map<string, Map<string, number>>();
  const uniqueEmailsOpenedMap = new Map<string, Set<string>>();
  const uniqueEmailsClickedMap = new Map<string, Set<string>>();
  const clickLinkMap = new Map<string, Map<string, Set<string>>>(); // week -> email -> links
  const openCountMap = new Map<string, Map<string, number>>();

  emailInteractions.forEach((record) => {
    const weekStart = record['Week start of report date'];
    const email = record['Email'] || '';
    const mailgunTag = record['mailgun_tags'] || '';
    const event = record['Event']?.toLowerCase() || '';
    const clickLink = record['Click link'] || '';
    
    if (!weekStart || !email || !tagFilter(mailgunTag)) return;

    if (!uniqueEmailMap.has(weekStart)) {
      uniqueEmailMap.set(weekStart, new Set<string>());
    }
    uniqueEmailMap.get(weekStart)!.add(email.toLowerCase());

    if (!emailInteractionCountMap.has(weekStart)) {
      emailInteractionCountMap.set(weekStart, new Map<string, number>());
    }

    const emailCounts = emailInteractionCountMap.get(weekStart)!;
    const emailKey = email.toLowerCase();

    if (!emailCounts.has(emailKey)) {
      emailCounts.set(emailKey, 0);
    }
    emailCounts.set(emailKey, emailCounts.get(emailKey)! + 1);

    if (!uniqueEmailsOpenedMap.has(weekStart)) {
      uniqueEmailsOpenedMap.set(weekStart, new Set<string>());
    }

    if (!uniqueEmailsClickedMap.has(weekStart)) {
      uniqueEmailsClickedMap.set(weekStart, new Set<string>());
    }

    if (!clickLinkMap.has(weekStart)) {
      clickLinkMap.set(weekStart, new Map<string, Set<string>>());
    }

    if (!openCountMap.has(weekStart)) {
      openCountMap.set(weekStart, new Map<string, number>());
    }

    if (event.includes('open')) {
      uniqueEmailsOpenedMap.get(weekStart)!.add(emailKey);
      const openCounts = openCountMap.get(weekStart)!;
      openCounts.set(emailKey, (openCounts.get(emailKey) || 0) + 1);
    }

    if (event.includes('click')) {
      uniqueEmailsClickedMap.get(weekStart)!.add(emailKey);
      if (clickLink) {
        const linkMap = clickLinkMap.get(weekStart)!;
        if (!linkMap.has(emailKey)) {
          linkMap.set(emailKey, new Set<string>());
        }
        linkMap.get(emailKey)!.add(String(clickLink));
        weekMap.get(weekStart)?.clickLinks.add(String(clickLink));
      }
    }
  });

  const metrics: Metric[] = Array.from(weekMap.entries())
    .map(([week, data]) => {
      const uniqueEmails = uniqueEmailMap.get(week)?.size || 0;
      const uniqueOpened = uniqueEmailsOpenedMap.get(week)?.size || 0;
      const uniqueClicked = uniqueEmailsClickedMap.get(week)?.size || 0;
      const linksSet = data.clickLinks;
      const emailLinkMap = clickLinkMap.get(week) || new Map<string, Set<string>>();
      const clickLinksByEmail: Record<string, string[]> = {};
      emailLinkMap.forEach((set, email) => {
        clickLinksByEmail[email] = Array.from(set);
      });
      const openCounts = openCountMap.get(week) || new Map<string, number>();
      const leadsOpenedMultiple = Array.from(openCounts.values()).filter((count) => count > 1).length;

      return {
        week,
        value: data.opened,
        clicked: data.clicked,
        uniqueEmails,
        uniqueEmailsOpened: uniqueOpened,
        uniqueEmailsClicked: uniqueClicked,
        leadsOpenedMultiple,
        links: Array.from(linksSet.values()),
        clickLinksByEmail,
      };
    })
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  for (let i = 1; i < metrics.length; i++) {
    const currentMetric = metrics[i];
    const previousMetric = metrics[i - 1];
    if (currentMetric && previousMetric) {
      const previousWeekValue = previousMetric.value;
      currentMetric.previousWeek = previousWeekValue;
      currentMetric.change = previousWeekValue > 0
        ? ((currentMetric.value - previousWeekValue) / previousWeekValue) * 100
        : 0;
    }
  }

  return metrics;
}

export function calculateEmailInteractionMetrics(
  emailInteractions: any[]
): Metric[] {
  // Return combined metrics (for backward compatibility)
  return calculateEmailInteractionMetricsByTag(
    emailInteractions,
    () => true // Include all tags
  );
}

export function calculateOutreachEmailInteractionMetrics(
  emailInteractions: any[]
): Metric[] {
  // Filter for outreach email interactions
  return calculateEmailInteractionMetricsByTag(
    emailInteractions,
    (tag) => {
      const tagLower = (tag || '').toLowerCase();
      return tagLower.includes('outreach') || 
             tagLower.includes('mkt outreach') ||
             tagLower === 'outreach';
    }
  );
}

export function calculateNurtureEmailInteractionMetrics(
  emailInteractions: any[]
): Metric[] {
  // Filter for nurture email interactions
  return calculateEmailInteractionMetricsByTag(
    emailInteractions,
    (tag) => {
      const tagLower = (tag || '').toLowerCase();
      return tagLower.includes('nurture') || 
             tagLower.includes('win-back') ||
             tagLower === 'nurture';
    }
  );
}

export function calculateAnalysisResultEmailInteractionMetrics(
  emailInteractions: any[]
): Metric[] {
  // Filter for analysis result email interactions (lead magnet deck analysis reports)
  const metrics = calculateEmailInteractionMetricsByTag(
    emailInteractions,
    (tag) => {
      if (Array.isArray(tag)) {
        return tag.some((entry) => (entry || '').toString().toLowerCase().includes('analysis_result'));
      }
      const tagLower = (tag || '').toString().toLowerCase();
      return tagLower.includes('analysis_result');
    }
  );

  return metrics.map((metric) => ({
    ...metric,
    uniqueEmails: undefined,
  }));
}

export function calculateDMMetrics(linkedinDMLog: any[]): Metric[] {
  const weekMap = new Map<string, { 
    conversations: Set<string>; 
    repliedConversations: Set<string>;
  }>();

  // Track senders per conversation to identify replies
  const conversationSenders = new Map<string, Set<string>>();
  const conversationFirstWeek = new Map<string, string>(); // Track first week each conversation appeared

  // First pass: collect all conversation data and track senders
  linkedinDMLog.forEach((record) => {
    const weekStart = record['Week start of report date'];
    const conversationId = record['Conversation_id'];
    const sender = record['Sender']?.trim() || '';
    
    if (!weekStart || !conversationId) return;

    // Track unique conversations per week
    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, {
        conversations: new Set<string>(),
        repliedConversations: new Set<string>(),
      });
    }

    const weekData = weekMap.get(weekStart)!;
    weekData.conversations.add(conversationId);

    // Track first week this conversation appeared (for counting DMed)
    if (!conversationFirstWeek.has(conversationId)) {
      conversationFirstWeek.set(conversationId, weekStart);
    }

    // Track senders for each conversation
    if (!conversationSenders.has(conversationId)) {
      conversationSenders.set(conversationId, new Set<string>());
    }
    if (sender) {
      conversationSenders.get(conversationId)!.add(sender.toLowerCase());
    }
  });

  // Second pass: identify conversations with replies
  // A conversation has a reply if there are multiple unique senders
  // (meaning we sent a message and the lead replied)
  conversationSenders.forEach((senders, conversationId) => {
    // If there are multiple senders, it means lead replied
    if (senders.size > 1) {
      // Find the first week this conversation appeared and mark it as replied
      const firstWeek = conversationFirstWeek.get(conversationId);
      if (firstWeek) {
        const weekData = weekMap.get(firstWeek);
        if (weekData) {
          weekData.repliedConversations.add(conversationId);
        }
      }
    }
  });

  const metrics: Metric[] = Array.from(weekMap.entries())
    .map(([week, data]) => {
      const dmed = data.conversations.size;
      const replied = data.repliedConversations.size;
      const noReply = dmed - replied;
      
      return {
        week,
        value: dmed,
        percentage: dmed > 0 ? (replied / dmed) * 100 : 0,
        replied,
        noReply,
      };
    })
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  for (let i = 1; i < metrics.length; i++) {
    const currentMetric = metrics[i];
    const previousMetric = metrics[i - 1];
    if (currentMetric && previousMetric) {
      const previousWeekValue = previousMetric.value;
      currentMetric.previousWeek = previousWeekValue;
      currentMetric.change = previousWeekValue > 0
        ? ((currentMetric.value - previousWeekValue) / previousWeekValue) * 100
        : 0;
    }
  }

  return metrics;
}

/**
 * Calculate metrics for conversations where leads replied
 * Returns week-by-week count of unique conversations where the lead responded
 */
export function calculateDMLeadRepliedMetrics(linkedinDMLog: any[]): Metric[] {
  const weekMap = new Map<string, Set<string>>();

  linkedinDMLog.forEach((record) => {
    const weekStart = record['Week start of report date'];
    const conversationId = record['Conversation_id'];
    const sender = record['Sender']?.toString().trim().toLowerCase() || '';

    if (!weekStart || !conversationId) return;

    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, new Set<string>());
    }

    if (sender && sender !== 'me') {
      weekMap.get(weekStart)!.add(conversationId);
    }
  });

  const metrics: Metric[] = Array.from(weekMap.entries())
    .map(([week, data]) => ({
      week,
      value: data.size,
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  for (let i = 1; i < metrics.length; i++) {
    const currentMetric = metrics[i];
    const previousMetric = metrics[i - 1];
    if (currentMetric && previousMetric) {
      const previousWeekValue = previousMetric.value;
      currentMetric.previousWeek = previousWeekValue;
      currentMetric.change = previousWeekValue > 0
        ? ((currentMetric.value - previousWeekValue) / previousWeekValue) * 100
        : 0;
    }
  }

  return metrics;
}

/**
 * Calculate metrics for followup conversations
 * Followup = ME sent a DM AFTER the lead replied in that conversation
 * Returns week-by-week count of unique conversations where followup occurred
 */
export function calculateDMFollowupMetrics(linkedinDMLog: any[]): Metric[] {
  const weekMap = new Map<string, Set<string>>();

  const conversationMessages = new Map<string, Array<{ sender: string; week: string; sentTime: string }>>();

  linkedinDMLog.forEach((record) => {
    const weekStart = record['Week start of report date'];
    const conversationId = record['Conversation_id'];
    const sender = record['Sender']?.toString().trim().toLowerCase() || '';
    const sentTime = record['Sent time'] || '';

    if (!weekStart || !conversationId) return;

    if (!conversationMessages.has(conversationId)) {
      conversationMessages.set(conversationId, []);
    }

    conversationMessages.get(conversationId)!.push({
      sender,
      week: weekStart,
      sentTime: sentTime,
    });
  });

  conversationMessages.forEach((messages, conversationId) => {
    const sortedMessages = messages.sort((a, b) => {
      const timeA = a.sentTime ? new Date(a.sentTime).getTime() : 0;
      const timeB = b.sentTime ? new Date(b.sentTime).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) return timeA - timeB;
      return sortWeeksChronologically(a.week, b.week);
    });

    let leadHasReplied = false;

    sortedMessages.forEach((msg, index) => {
      const senderLower = msg.sender.toLowerCase();
      const isMeMessage = senderLower === '' || senderLower === 'me';
      const isCorrespondentMessage = senderLower !== '' && senderLower !== 'me';

      if (isCorrespondentMessage) {
        leadHasReplied = true;
        return;
      }

      if (!isMeMessage) {
        return;
      }

      if (!leadHasReplied) {
        return;
      }

      if (index === 0) {
        return;
      }

      if (!weekMap.has(msg.week)) {
        weekMap.set(msg.week, new Set<string>());
      }

      weekMap.get(msg.week)!.add(conversationId);
    });
  });

  const metrics: Metric[] = Array.from(weekMap.entries())
    .map(([week, data]) => ({
      week,
      value: data.size,
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  for (let i = 1; i < metrics.length; i++) {
    const currentMetric = metrics[i];
    const previousMetric = metrics[i - 1];
    if (currentMetric && previousMetric) {
      const previousWeekValue = previousMetric.value;
      currentMetric.previousWeek = previousWeekValue;
      currentMetric.change = previousWeekValue > 0
        ? ((currentMetric.value - previousWeekValue) / previousWeekValue) * 100
        : 0;
    }
  }

  return metrics;
}

// Helper function to calculate week start from Created date if Week start of report date is missing
function getWeekStart(record: any): string | null {
  let weekStart = record['Week start of report date'];
  
  // If no week start, try to calculate from Created date
  if (!weekStart && record['Created']) {
    const createdDate = new Date(record['Created']);
    if (!isNaN(createdDate.getTime())) {
      // Calculate week start (Sunday)
      const day = createdDate.getDay();
      const diff = createdDate.getDate() - day;
      const weekStartDate = new Date(createdDate);
      weekStartDate.setDate(diff);
      weekStart = weekStartDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  }
  
  return weekStart || null;
}

/**
 * Calculate metrics for leads from Lead Magnet
 */
export function calculateLeadMagnetLeads(leadList: any[]): Metric[] {
  const weekMap = new Map<string, number>();

  leadList.forEach((record) => {
    const source = record['Source'];
    const weekStart = getWeekStart(record);
    
    if (!weekStart) return;

    // Filter for Lead Magnet leads
    if (source === 'Lead magnet') {
      if (!weekMap.has(weekStart)) {
        weekMap.set(weekStart, 0);
      }
      weekMap.set(weekStart, weekMap.get(weekStart)! + 1);
    }
  });

  const metrics: Metric[] = Array.from(weekMap.entries())
    .map(([week, count]) => ({
      week,
      value: count,
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  for (let i = 1; i < metrics.length; i++) {
    const currentMetric = metrics[i];
    const previousMetric = metrics[i - 1];
    if (currentMetric && previousMetric) {
      const previousWeekValue = previousMetric.value;
      currentMetric.previousWeek = previousWeekValue;
      currentMetric.change = previousWeekValue > 0
        ? ((currentMetric.value - previousWeekValue) / previousWeekValue) * 100
        : 0;
    }
  }

  return metrics;
}

/**
 * Calculate metrics for leads from Book a Call
 */
export function calculateBookACallLeads(leadList: any[]): Metric[] {
  const weekMap = new Map<string, number>();

  leadList.forEach((record) => {
    const source = record['Source'];
    const weekStart = getWeekStart(record);
    
    if (!weekStart) return;

    // Filter for Book a Call leads
    if (source === 'Book a call') {
      if (!weekMap.has(weekStart)) {
        weekMap.set(weekStart, 0);
      }
      weekMap.set(weekStart, weekMap.get(weekStart)! + 1);
    }
  });

  const metrics: Metric[] = Array.from(weekMap.entries())
    .map(([week, count]) => ({
      week,
      value: count,
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  for (let i = 1; i < metrics.length; i++) {
    const currentMetric = metrics[i];
    const previousMetric = metrics[i - 1];
    if (currentMetric && previousMetric) {
      const previousWeekValue = previousMetric.value;
      currentMetric.previousWeek = previousWeekValue;
      currentMetric.change = previousWeekValue > 0
        ? ((currentMetric.value - previousWeekValue) / previousWeekValue) * 100
        : 0;
    }
  }

  return metrics;
}

/**
 * Calculate metrics for all organic leads (Lead Magnet + Book a Call)
 * Kept for backward compatibility
 */
export function calculateOrganicLeads(leadList: any[]): Metric[] {
  const weekMap = new Map<string, number>();

  leadList.forEach((record) => {
    const source = record['Source'];
    const weekStart = getWeekStart(record);
    
    if (!weekStart) return;

    // Filter for organic leads (Lead magnet or Book a call)
    if (source === 'Lead magnet' || source === 'Book a call') {
      if (!weekMap.has(weekStart)) {
        weekMap.set(weekStart, 0);
      }
      weekMap.set(weekStart, weekMap.get(weekStart)! + 1);
    }
  });

  const metrics: Metric[] = Array.from(weekMap.entries())
    .map(([week, count]) => ({
      week,
      value: count,
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  for (let i = 1; i < metrics.length; i++) {
    const currentMetric = metrics[i];
    const previousMetric = metrics[i - 1];
    if (currentMetric && previousMetric) {
      const previousWeekValue = previousMetric.value;
      currentMetric.previousWeek = previousWeekValue;
      currentMetric.change = previousWeekValue > 0
        ? ((currentMetric.value - previousWeekValue) / previousWeekValue) * 100
        : 0;
    }
  }

  return metrics;
}

export function calculateLeadMagnetMetrics(
  deckAnalysisInteractions: any[],
  deckReports: any[],
  redemptiveDeckAnalysisInteractions: any[] = []
): { landed: Metric[]; submissions: Metric[]; avgDuration: Metric[]; uniqueVisits: Metric[] } {
  const landedWeekMap = new Map<string, {
    count: number;
    totalDuration: number;
    sessions: number;
    uniqueMediums: Set<string>;
    leadEmails: Map<string, Set<string>>;
    primaryCount: number;
    redemptiveCount: number;
    primaryDuration: number;
    redemptiveDuration: number;
    primaryUniqueMediums: Set<string>;
    redemptiveUniqueMediums: Set<string>;
    primaryLeadEmails: Map<string, Set<string>>;
    redemptiveLeadEmails: Map<string, Set<string>>;
    leadSessionCounts: Map<string, { display: string; count: number }>;
    emailLookup: Map<string, string>;
    highInterestEmails: Set<string>;
    bounceEmails: Set<string>;
  }>();

  const processDeckInteraction = (record: any) => {
    if (!record || typeof record !== 'object') {
      return;
    }

    const weekStart = record['Week start of report date'];
    if (!weekStart) return;

    const sourceFromLeadList = (record['Source (from Lead list)'] || '').toString().toLowerCase();
    const sourceMediumField = (record['Source / medium'] || '').toString().toLowerCase();
    if (sourceFromLeadList.includes('internal') || sourceMediumField.includes('test')) {
      return;
    }

    if (!landedWeekMap.has(weekStart)) {
      landedWeekMap.set(weekStart, {
        count: 0,
        totalDuration: 0,
        sessions: 0,
        uniqueMediums: new Set<string>(),
        leadEmails: new Map<string, Set<string>>(),
        primaryCount: 0,
        redemptiveCount: 0,
        primaryDuration: 0,
        redemptiveDuration: 0,
        primaryUniqueMediums: new Set<string>(),
        redemptiveUniqueMediums: new Set<string>(),
        primaryLeadEmails: new Map<string, Set<string>>(),
        redemptiveLeadEmails: new Map<string, Set<string>>(),
        leadSessionCounts: new Map<string, { display: string; count: number }>(),
        emailLookup: new Map<string, string>(),
        highInterestEmails: new Set<string>(),
        bounceEmails: new Set<string>(),
      });
    }

    const weekData = landedWeekMap.get(weekStart)!;
    weekData.sessions++;
    weekData.count++;

    const deckSource = (record['__deckSource'] || 'primary') as 'primary' | 'redemptive';
    if (deckSource === 'primary') {
      weekData.primaryCount++;
    } else {
      weekData.redemptiveCount++;
    }

    const duration = Number(record['Session Duration (second)'] || 0);
    weekData.totalDuration += duration;
    const emailFieldRaw = record['Email (from Lead list)'];
    const emailDisplay = Array.isArray(emailFieldRaw)
      ? (emailFieldRaw.find((value) => value) ?? '')
      : (emailFieldRaw ?? '').toString();
    const emailKey = emailDisplay.trim().toLowerCase();
    if (emailKey) {
      if (!weekData.emailLookup.has(emailKey)) {
        weekData.emailLookup.set(emailKey, emailDisplay || emailKey);
      }

      const existingSessions = weekData.leadSessionCounts.get(emailKey);
      if (existingSessions) {
        existingSessions.count += 1;
        if (!existingSessions.display && emailDisplay) {
          existingSessions.display = emailDisplay;
        }
      } else {
        weekData.leadSessionCounts.set(emailKey, {
          display: emailDisplay || emailKey,
          count: 1,
        });
      }

      if (duration > 20) {
        weekData.highInterestEmails.add(emailKey);
      }

      if (duration > 0 && duration < 10) {
        weekData.bounceEmails.add(emailKey);
      }
    }

    // Track unique mediums where medium contains "rec"
    // Try multiple possible field names
    const medium = record['Medium'] || 
                   record['Source / medium'] || 
                   record['Medium (from Source / medium)'] ||
                   record['source_medium'] ||
                   '';
    
    // Also check if there's a Source/medium format in the data
    const sourceMedium = record['Source / medium'] || record['Source/medium'] || '';
    const finalMedium = (medium || sourceMedium).trim();

    const mediumLower = finalMedium.toLowerCase();
    if (mediumLower && mediumLower.includes('rec')) {
      weekData.uniqueMediums.add(finalMedium);
      if (!weekData.leadEmails.has(finalMedium)) {
        weekData.leadEmails.set(finalMedium, new Set<string>());
      }
      if (emailKey) {
        weekData.leadEmails.get(finalMedium)!.add(emailKey);
      }

      if (deckSource === 'primary') {
        weekData.primaryUniqueMediums.add(finalMedium);
        if (!weekData.primaryLeadEmails.has(finalMedium)) {
          weekData.primaryLeadEmails.set(finalMedium, new Set<string>());
        }
        if (emailKey) {
          weekData.primaryLeadEmails.get(finalMedium)!.add(emailKey);
        }
      } else {
        weekData.redemptiveUniqueMediums.add(finalMedium);
        if (!weekData.redemptiveLeadEmails.has(finalMedium)) {
          weekData.redemptiveLeadEmails.set(finalMedium, new Set<string>());
        }
        if (emailKey) {
          weekData.redemptiveLeadEmails.get(finalMedium)!.add(emailKey);
        }
      }
    }

  };

  deckAnalysisInteractions.forEach((record) => processDeckInteraction(record));
  redemptiveDeckAnalysisInteractions.forEach((record) => processDeckInteraction(record));

  // Process deck submissions - track both total submissions and unique leads
  const submissionWeekMap = new Map<string, { submissions: number; uniqueLeads: Map<string, { count: number; display: string }> }>();
  deckReports.forEach((record) => {
    const weekStart = record['Week start of report date'];
    const email = record['Email'] || '';
    
    if (!weekStart) return;

    if (!submissionWeekMap.has(weekStart)) {
      submissionWeekMap.set(weekStart, { submissions: 0, uniqueLeads: new Map<string, { count: number; display: string }>() });
    }
    
    const weekData = submissionWeekMap.get(weekStart)!;
    weekData.submissions++;
    
    if (email) {
      const emailKey = email.toString().trim().toLowerCase();
      const existing = weekData.uniqueLeads.get(emailKey);
      if (existing) {
        existing.count += 1;
        if (!existing.display && email) {
          existing.display = email.toString();
        }
      } else {
        weekData.uniqueLeads.set(emailKey, {
          count: 1,
          display: email.toString(),
        });
      }
    }
  });

  const landedMetrics: Metric[] = Array.from(landedWeekMap.entries())
    .map(([week, data]) => ({
      week,
      value: data.count,
      deckBreakdown: {
        primaryCount: data.primaryCount,
        redemptiveCount: data.redemptiveCount,
      },
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  const avgDurationMetrics: Metric[] = Array.from(landedWeekMap.entries())
    .map(([week, data]) => {
      const highInterestList = Array.from(data.highInterestEmails).map(
        (emailKey) => data.emailLookup.get(emailKey) || emailKey
      );
      const bounceList = Array.from(data.bounceEmails).map(
        (emailKey) => data.emailLookup.get(emailKey) || emailKey
      );

      return {
        week,
        value: highInterestList.length,
        highInterestCount: highInterestList.length,
        bounceCount: bounceList.length,
        highInterestLeads: highInterestList,
        bounceLeads: bounceList,
      };
    })
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  const submissionMetrics: Metric[] = Array.from(submissionWeekMap.entries())
    .map(([week, data]) => {
      const leadCounts: Record<string, number> = {};
      const leadEmailList: string[] = [];
      data.uniqueLeads.forEach(({ count, display }, emailKey) => {
        const label = display || emailKey;
        leadCounts[label] = (leadCounts[label] || 0) + count;
        leadEmailList.push(label);
      });

      return {
        week,
        value: data.submissions,
        uniqueLeads: data.uniqueLeads.size,
        leadEmails: leadEmailList,
        leadSessionCounts: leadCounts,
        leadCountLabel: 'Submissions',
      };
    })
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  const uniqueVisitsMetrics: Metric[] = Array.from(landedWeekMap.entries())
    .map(([week, data]) => {
      const leadSessionCounts: Record<string, number> = {};
      data.leadSessionCounts.forEach(({ display, count }) => {
        if (display) {
          leadSessionCounts[display] = (leadSessionCounts[display] || 0) + count;
        }
      });

      const leadEmailKeys = new Set<string>();
      data.leadEmails.forEach((set) => {
        set.forEach((emailKey) => {
          if (emailKey) {
            leadEmailKeys.add(emailKey);
          }
        });
      });

      const leadEmailsList = Array.from(leadEmailKeys)
        .map((emailKey) =>
          data.leadSessionCounts.get(emailKey)?.display || data.emailLookup.get(emailKey) || emailKey
        )
        .filter(Boolean);

      return {
        week,
        value: data.uniqueMediums.size,
        uniqueVisits: data.uniqueMediums.size,
        leadEmails: leadEmailsList,
        leadSessionCounts,
        leadCountLabel: 'Sessions',
        deckBreakdown: {
          primaryUniqueVisits: data.primaryUniqueMediums.size,
          redemptiveUniqueVisits: data.redemptiveUniqueMediums.size,
        },
      };
    })
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  // Calculate WoW changes
  [landedMetrics, avgDurationMetrics, submissionMetrics, uniqueVisitsMetrics].forEach((metrics) => {
    for (let i = 1; i < metrics.length; i++) {
      const currentMetric = metrics[i];
      const previousMetric = metrics[i - 1];
      if (currentMetric && previousMetric) {
        const previousWeekValue = previousMetric.value;
        currentMetric.previousWeek = previousWeekValue;
        currentMetric.change = previousWeekValue > 0
          ? ((currentMetric.value - previousWeekValue) / previousWeekValue) * 100
          : 0;
      }
    }
  });

  return {
    landed: landedMetrics,
    submissions: submissionMetrics,
    avgDuration: avgDurationMetrics,
    uniqueVisits: uniqueVisitsMetrics,
  };
}

export function calculateSalesFunnelMetrics(
  ffInteractions: any[],
  bookACall: any[]
): { landed: Metric[]; avgDuration: Metric[]; clicks: Metric[]; clickToLanded: Metric[]; uniqueVisits: Metric[] } {
  const landedWeekMap = new Map<string, { 
    count: number; 
    totalDuration: number; 
    sessions: number; 
    clicks: number;
    uniqueMediums: Set<string>; // Track unique mediums where medium contains "rec"
    leadEmails: Map<string, Set<string>>;
    clickEmails: Set<string>;
    emailLookup: Map<string, string>;
    highInterestEmails: Set<string>;
    bounceEmails: Set<string>;
  }>();

  // Track bookings completed (from Book a Call table)
  const bookingsWeekMap = new Map<string, number>();

  // Process Book a Call data to count actual bookings completed
  // Only count records that have a valid week start date
  // Note: Currently counting ALL records. If Meeting Status filtering is needed,
  // we should filter by status values like "Scheduled", "Completed", "Confirmed", etc.
  // and exclude "Cancelled", "No-show", etc.
  bookACall.forEach((record) => {
    const weekStart = record['Week start of report date'];
    if (!weekStart) return;

    // TODO: Add Meeting Status filter if needed
    // const meetingStatus = record['Meeting Status'] || '';
    // const statusLower = meetingStatus.toLowerCase();
    // // Only count completed/scheduled bookings, exclude cancelled/no-show
    // if (statusLower.includes('cancel') || statusLower.includes('no-show')) {
    //   return; // Skip cancelled/no-show bookings
    // }

    if (!bookingsWeekMap.has(weekStart)) {
      bookingsWeekMap.set(weekStart, 0);
    }
    bookingsWeekMap.set(weekStart, bookingsWeekMap.get(weekStart)! + 1);
  });

  // Process FF website interactions
  ffInteractions.forEach((record) => {
    const weekStart = record['Week start of report date'];
    if (!weekStart) return;

    const sourceFromLeadList = (record['Source (from Lead list)'] || '').toString().toLowerCase();
    const sourceMediumField = (record['Source / medium'] || '').toString().toLowerCase();
    if (sourceFromLeadList.includes('internal') || sourceMediumField.includes('test')) {
      return;
    }

    if (!landedWeekMap.has(weekStart)) {
      landedWeekMap.set(weekStart, { 
        count: 0, 
        totalDuration: 0, 
        sessions: 0, 
        clicks: 0,
        uniqueMediums: new Set<string>(),
        leadEmails: new Map<string, Set<string>>(),
        clickEmails: new Set<string>(),
        emailLookup: new Map<string, string>(),
        highInterestEmails: new Set<string>(),
        bounceEmails: new Set<string>(),
      });
    }

    const weekData = landedWeekMap.get(weekStart)!;
    weekData.sessions++;
    weekData.count++;

    const duration = Number(record['Session Duration (second)'] || 0);
    weekData.totalDuration += duration;

    const clicks = record['Click book a call button'] || 0;
    weekData.clicks += clicks;

    // Track unique mediums where medium contains "rec"
    // Try multiple possible field names
    const medium = record['Medium'] || 
                   record['Source / medium'] || 
                   record['Medium (from Source / medium)'] ||
                   record['source_medium'] ||
                   '';
    
    // Also check if there's a Source/medium format in the data
    const sourceMedium = record['Source / medium'] || record['Source/medium'] || '';
    const finalMedium = (medium || sourceMedium).trim(); // Trim whitespace
    
    const mediumLower = finalMedium.toLowerCase();
    // Check if medium contains "rec" (case-insensitive, after trimming)
    if (mediumLower && mediumLower.includes('rec')) {
      // Use the medium value as the unique identifier (trimmed)
      // Multiple sessionIDs can share the same medium
      weekData.uniqueMediums.add(finalMedium);
    }
    const emailFieldRaw = record['Email (from Lead list)'];
    const emailDisplay = Array.isArray(emailFieldRaw)
      ? (emailFieldRaw.find((value) => value) ?? '')
      : (emailFieldRaw ?? '').toString();
    const emailKey = emailDisplay.trim().toLowerCase();

    if (emailKey) {
      if (!weekData.emailLookup.has(emailKey)) {
        weekData.emailLookup.set(emailKey, emailDisplay || emailKey);
      }

      weekData.clickEmails.add(emailKey);
      if (!weekData.leadEmails.has(finalMedium)) {
        weekData.leadEmails.set(finalMedium, new Set<string>());
      }
      weekData.leadEmails.get(finalMedium)!.add(emailKey);

      if (duration > 20) {
        weekData.highInterestEmails.add(emailKey);
      }

      if (duration > 0 && duration < 10) {
        weekData.bounceEmails.add(emailKey);
      }
    }
  });

  const landedMetrics: Metric[] = Array.from(landedWeekMap.entries())
    .map(([week, data]) => ({
      week,
      value: data.count,
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  const avgDurationMetrics: Metric[] = Array.from(landedWeekMap.entries())
    .map(([week, data]) => {
      const highInterestList = Array.from(data.highInterestEmails).map(
        (emailKey) => data.emailLookup.get(emailKey) || emailKey
      );
      const bounceList = Array.from(data.bounceEmails).map(
        (emailKey) => data.emailLookup.get(emailKey) || emailKey
      );

      return {
        week,
        value: highInterestList.length,
        highInterestCount: highInterestList.length,
        bounceCount: bounceList.length,
        highInterestLeads: highInterestList,
        bounceLeads: bounceList,
      };
    })
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  const clicksMetrics: Metric[] = Array.from(landedWeekMap.entries())
    .map(([week, data]) => ({
      week,
      value: data.clicks,
      clickLeadEmails: Array.from(data.clickEmails).map((emailKey) => data.emailLookup.get(emailKey) || emailKey),
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  // Calculate % of Section vs Click Book a Call: (Clicks on button / Landed sessions) * 100
  // This shows what percentage of people who landed on the FF landing page clicked the "Book a Call" button
  const clickToLandedMetrics: Metric[] = Array.from(landedWeekMap.entries())
    .map(([week, data]) => {
      // Calculate click-through rate: (Clicks ÷ Landed sessions) × 100
      const percentage = data.count > 0 ? (data.clicks / data.count) * 100 : 0;
      return {
        week,
        value: percentage,
        percentage: percentage,
      };
    })
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  const uniqueVisitsMetrics: Metric[] = Array.from(landedWeekMap.entries())
    .map(([week, data]) => ({
      week,
      value: data.uniqueMediums.size,
      uniqueVisits: data.uniqueMediums.size,
      leadEmails: Array.from(new Set(Array.from(data.leadEmails.values()).flatMap((set) => Array.from(set))))
        .map((emailKey) => data.emailLookup.get(emailKey) || emailKey)
        .filter(Boolean),
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  // Calculate WoW changes
  [landedMetrics, avgDurationMetrics, clicksMetrics, clickToLandedMetrics, uniqueVisitsMetrics].forEach((metrics) => {
    for (let i = 1; i < metrics.length; i++) {
      const currentMetric = metrics[i];
      const previousMetric = metrics[i - 1];
      if (currentMetric && previousMetric) {
        const previousWeekValue = previousMetric.value;
        currentMetric.previousWeek = previousWeekValue;
        currentMetric.change = previousWeekValue > 0
          ? ((currentMetric.value - previousWeekValue) / previousWeekValue) * 100
          : 0;
      }
    }
  });

  return {
    landed: landedMetrics,
    avgDuration: avgDurationMetrics,
    clicks: clicksMetrics,
    clickToLanded: clickToLandedMetrics,
    uniqueVisits: uniqueVisitsMetrics,
  };
}

