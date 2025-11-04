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
}

// Helper function to calculate email metrics for a specific sequence filter
function calculateEmailMetricsBySequence(
  sentEmailLog: any[],
  emailInteractions: any[],
  sequenceFilter: (sequence: string) => boolean
): Metric[] {
  const weekMap = new Map<string, { sent: number; success: number; failed: number }>();

  // Count sent emails by week for filtered sequence
  sentEmailLog.forEach((record) => {
    const weekStart = record['Week start of report date'];
    const sequence = record['Sequence'] || '';
    
    if (!weekStart || !sequenceFilter(sequence)) return;

    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, { sent: 0, success: 0, failed: 0 });
    }

    const weekData = weekMap.get(weekStart)!;
    weekData.sent++;
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

  const metrics: Metric[] = Array.from(weekMap.entries())
    .map(([week, data]) => ({
      week,
      value: data.sent,
      percentage: data.sent > 0 ? (data.success / data.sent) * 100 : 0,
      success: data.success,
      failed: data.failed,
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  // Calculate week-over-week change
  for (let i = 1; i < metrics.length; i++) {
    metrics[i].previousWeek = metrics[i - 1].value;
    metrics[i].change = metrics[i].previousWeek > 0
      ? ((metrics[i].value - metrics[i].previousWeek) / metrics[i].previousWeek) * 100
      : 0;
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
  const weekMap = new Map<string, { opened: number; clicked: number; unsubscribed: number }>();

  emailInteractions.forEach((record) => {
    const weekStart = record['Week start of report date'];
    const mailgunTag = record['mailgun_tags'] || '';
    
    if (!weekStart || !tagFilter(mailgunTag)) return;

    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, { opened: 0, clicked: 0, unsubscribed: 0 });
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

  const metrics: Metric[] = Array.from(weekMap.entries())
    .map(([week, data]) => ({
      week,
      value: data.opened,
      percentage: data.opened > 0 ? (data.clicked / data.opened) * 100 : 0,
      clicked: data.clicked,
      unsubscribed: data.unsubscribed,
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  for (let i = 1; i < metrics.length; i++) {
    metrics[i].previousWeek = metrics[i - 1].value;
    metrics[i].change = metrics[i].previousWeek > 0
      ? ((metrics[i].value - metrics[i].previousWeek) / metrics[i].previousWeek) * 100
      : 0;
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
  return calculateEmailInteractionMetricsByTag(
    emailInteractions,
    (tag) => {
      const tagLower = (tag || '').toLowerCase();
      return tagLower.includes('analysis') || 
             tagLower.includes('result') ||
             tagLower.includes('lead magnet') ||
             tagLower.includes('deck analysis') ||
             tagLower.includes('report');
    }
  );
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
    metrics[i].previousWeek = metrics[i - 1].value;
    metrics[i].change = metrics[i].previousWeek > 0
      ? ((metrics[i].value - metrics[i].previousWeek) / metrics[i].previousWeek) * 100
      : 0;
  }

  return metrics;
}

export function calculateOrganicLeads(leadList: any[]): Metric[] {
  const weekMap = new Map<string, number>();

  leadList.forEach((record) => {
    const source = record['Source'];
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
    metrics[i].previousWeek = metrics[i - 1].value;
    metrics[i].change = metrics[i].previousWeek > 0
      ? ((metrics[i].value - metrics[i].previousWeek) / metrics[i].previousWeek) * 100
      : 0;
  }

  return metrics;
}

export function calculateLeadMagnetMetrics(
  deckAnalysisInteractions: any[],
  deckReports: any[]
): { landed: Metric[]; submissions: Metric[]; avgDuration: Metric[] } {
  const landedWeekMap = new Map<string, { count: number; totalDuration: number; sessions: number }>();
  const submissionWeekMap = new Map<string, number>();

  // Process deck analysis interactions
  deckAnalysisInteractions.forEach((record) => {
    const weekStart = record['Week start of report date'];
    if (!weekStart) return;

    if (!landedWeekMap.has(weekStart)) {
      landedWeekMap.set(weekStart, { count: 0, totalDuration: 0, sessions: 0 });
    }

    const weekData = landedWeekMap.get(weekStart)!;
    weekData.sessions++;
    weekData.count++;

    const duration = record['Session Duration (second)'] || 0;
    weekData.totalDuration += duration;
  });

  // Process deck submissions
  deckReports.forEach((record) => {
    const weekStart = record['Week start of report date'];
    if (!weekStart) return;

    if (!submissionWeekMap.has(weekStart)) {
      submissionWeekMap.set(weekStart, 0);
    }
    submissionWeekMap.set(weekStart, submissionWeekMap.get(weekStart)! + 1);
  });

  const landedMetrics: Metric[] = Array.from(landedWeekMap.entries())
    .map(([week, data]) => ({
      week,
      value: data.count,
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  const avgDurationMetrics: Metric[] = Array.from(landedWeekMap.entries())
    .map(([week, data]) => ({
      week,
      value: data.sessions > 0 ? data.totalDuration / data.sessions : 0,
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  const submissionMetrics: Metric[] = Array.from(submissionWeekMap.entries())
    .map(([week, count]) => ({
      week,
      value: count,
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  // Calculate WoW changes
  [landedMetrics, avgDurationMetrics, submissionMetrics].forEach((metrics) => {
    for (let i = 1; i < metrics.length; i++) {
      metrics[i].previousWeek = metrics[i - 1].value;
      metrics[i].change = metrics[i].previousWeek > 0
        ? ((metrics[i].value - metrics[i].previousWeek) / metrics[i].previousWeek) * 100
        : 0;
    }
  });

  return {
    landed: landedMetrics,
    submissions: submissionMetrics,
    avgDuration: avgDurationMetrics,
  };
}

export function calculateSalesFunnelMetrics(
  ffInteractions: any[],
  bookACall: any[]
): { landed: Metric[]; avgDuration: Metric[]; clicks: Metric[]; clickToLanded: Metric[] } {
  const landedWeekMap = new Map<string, { count: number; totalDuration: number; sessions: number; clicks: number }>();

  // Process FF website interactions
  ffInteractions.forEach((record) => {
    const weekStart = record['Week start of report date'];
    if (!weekStart) return;

    if (!landedWeekMap.has(weekStart)) {
      landedWeekMap.set(weekStart, { count: 0, totalDuration: 0, sessions: 0, clicks: 0 });
    }

    const weekData = landedWeekMap.get(weekStart)!;
    weekData.sessions++;
    weekData.count++;

    const duration = record['Session Duration (second)'] || 0;
    weekData.totalDuration += duration;

    const clicks = record['Click book a call button'] || 0;
    weekData.clicks += clicks;
  });

  const landedMetrics: Metric[] = Array.from(landedWeekMap.entries())
    .map(([week, data]) => ({
      week,
      value: data.count,
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  const avgDurationMetrics: Metric[] = Array.from(landedWeekMap.entries())
    .map(([week, data]) => ({
      week,
      value: data.sessions > 0 ? data.totalDuration / data.sessions : 0,
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  const clicksMetrics: Metric[] = Array.from(landedWeekMap.entries())
    .map(([week, data]) => ({
      week,
      value: data.clicks,
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  const clickToLandedMetrics: Metric[] = Array.from(landedWeekMap.entries())
    .map(([week, data]) => ({
      week,
      value: data.clicks,
      percentage: data.clicks > 0 ? (data.count / data.clicks) * 100 : 0,
    }))
    .sort((a, b) => sortWeeksChronologically(a.week, b.week));

  // Calculate WoW changes
  [landedMetrics, avgDurationMetrics, clicksMetrics, clickToLandedMetrics].forEach((metrics) => {
    for (let i = 1; i < metrics.length; i++) {
      metrics[i].previousWeek = metrics[i - 1].value;
      metrics[i].change = metrics[i].previousWeek > 0
        ? ((metrics[i].value - metrics[i].previousWeek) / metrics[i].previousWeek) * 100
        : 0;
    }
  });

  return {
    landed: landedMetrics,
    avgDuration: avgDurationMetrics,
    clicks: clicksMetrics,
    clickToLanded: clickToLandedMetrics,
  };
}

