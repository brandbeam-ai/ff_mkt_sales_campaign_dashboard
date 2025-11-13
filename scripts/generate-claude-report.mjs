import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { parse, format, addDays } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  try {
    const content = readFileSync(envPath, 'utf-8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...rest] = trimmed.split('=');
      if (!key || rest.length === 0) return;
      const value = rest.join('=').trim();
      if (value && !process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    // Silently ignore if file not found; env vars may be set elsewhere.
  }
}

loadEnv();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY environment variable. Please set it in .env.local.');
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: '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',
});

const WEEK_FORMAT = 'dd/MM/yyyy';

const parseWeekStart = (week) => parse(week, WEEK_FORMAT, new Date());

const compareWeeks = (a, b) => parseWeekStart(a).getTime() - parseWeekStart(b).getTime();

const getCurrentWeekStart = () => {
  const now = new Date();
  const day = now.getDay(); // Sunday=0
  const diff = now.getDate() - day;
  const weekStart = new Date(now);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

const formatWeekRange = (weekStr) => {
  if (!weekStr) return 'N/A';
  try {
    const weekStart = parseWeekStart(weekStr);
    const weekEnd = addDays(weekStart, 6);
    return `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
  } catch {
    return weekStr; // Return as-is if parsing fails
  }
};

const toTagList = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((t) => (t || '').toString().toLowerCase());
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }
  return [(tags || '').toString().toLowerCase()];
};

const eventType = (event) => (event || '').toString().toLowerCase();

const isCompletedWeek = (week) => {
  if (!week) return false;
  try {
    const start = parseWeekStart(week);
    return start.getTime() < getCurrentWeekStart().getTime();
  } catch {
    return false;
  }
};

const pickLastCompletedWeek = (weeksSet) => {
  const validWeeks = Array.from(weeksSet).filter(isCompletedWeek);
  if (validWeeks.length === 0) return undefined;
  validWeeks.sort(compareWeeks);
  return validWeeks[validWeeks.length - 1];
};

const safeWoW = (current, previous) => {
  if (previous && previous !== 0) {
    return ((current - previous) / previous) * 100;
  }
  return null;
};

(async () => {
  try {
    const dataPath = path.join(__dirname, '..', 'data', 'funnel-data.json');
    const raw = await fs.readFile(dataPath, 'utf-8');
    const funnelData = JSON.parse(raw);

    const sentEmailLog = funnelData.sentEmailLog ?? [];
    const emailInteractions = funnelData.emailInteractions ?? [];
    const deckReports = funnelData.deckReports ?? [];
    const deckAnalysis = funnelData.deckAnalysisInteractions ?? [];
    const ffInteractions = funnelData.ffInteractions ?? [];
    const bookACall = funnelData.bookACall ?? [];

    const allWeeks = new Set();
    const weekField = (record) => record['Week start of report date'];

    [sentEmailLog, emailInteractions, deckReports, deckAnalysis, ffInteractions, bookACall].forEach(
      (collection) => {
        collection.forEach((record) => {
          const week = weekField(record);
          if (typeof week === 'string' && week.trim()) {
            allWeeks.add(week.trim());
          }
        });
      }
    );

    const lastWeek = pickLastCompletedWeek(allWeeks);
    if (!lastWeek) {
      throw new Error('Unable to determine last completed week from data.');
    }

    const previousWeek = (() => {
      const weeksBefore = Array.from(allWeeks)
        .filter((week) => isCompletedWeek(week) && compareWeeks(week, lastWeek) < 0)
        .sort(compareWeeks);
      return weeksBefore.length > 0 ? weeksBefore[weeksBefore.length - 1] : undefined;
    })();

    const weekRange = formatWeekRange(lastWeek);

    const groupBySequence = (records, sequenceFilter) => {
      const set = new Set();
      records.forEach((record) => {
        const week = weekField(record);
        if (week !== lastWeek) return;
        const sequence = (record['Sequence'] || '').toString().toLowerCase();
        if (!sequenceFilter(sequence)) return;
        const email = (record['Email'] || '').toString().trim().toLowerCase();
        if (email) {
          set.add(email);
        }
      });
      return set;
    };

    const gatherEmailInteractions = (filterFn) => {
      const opened = new Set();
      const clicked = new Set();
      const openCounts = new Map();

      const prevOpened = new Set();
      const prevClicked = new Set();

      emailInteractions.forEach((record) => {
        const week = weekField(record);
        const tags = toTagList(record.mailgun_tags);
        if (!filterFn(tags)) return;
        const email = (record.Email || '').toString().trim().toLowerCase();
        if (!email) return;
        const event = eventType(record.Event);
        const targetSet =
          week === lastWeek ? [opened, clicked] : week === previousWeek ? [prevOpened, prevClicked] : null;
        if (!targetSet) return;
        if (event.includes('open')) {
          targetSet[0].add(email);
          if (week === lastWeek) {
            openCounts.set(email, (openCounts.get(email) || 0) + 1);
          }
        } else if (event.includes('click')) {
          targetSet[1].add(email);
        }
      });

      const multiOpens = Array.from(openCounts.values()).filter((count) => count > 1).length;

      return {
        lastWeek: {
          uniqueOpened: opened.size,
          uniqueClicked: clicked.size,
          leadsOpenedMultiple: multiOpens,
        },
        previousWeek: {
          uniqueOpened: prevOpened.size,
          uniqueClicked: prevClicked.size,
        },
      };
    };

    const outreachSent = groupBySequence(sentEmailLog, (sequence) =>
      sequence.includes('mkt outreach')
    );
    const outreachSentPrev = groupBySequence(
      sentEmailLog.filter((record) => weekField(record) === previousWeek),
      (sequence) => sequence.includes('mkt outreach')
    );
    const outreachInteractions = gatherEmailInteractions((tags) =>
      tags.some((tag) => tag.includes('outreach') || tag.includes('mkt outreach'))
    );

    const nurtureSent = groupBySequence(sentEmailLog, (sequence) =>
      sequence.includes('nurture') || sequence.includes('win-back') || sequence.includes('general nurture')
    );
    const nurtureSentPrev = groupBySequence(
      sentEmailLog.filter((record) => weekField(record) === previousWeek),
      (sequence) =>
        sequence.includes('nurture') || sequence.includes('win-back') || sequence.includes('general nurture')
    );
    const nurtureInteractions = gatherEmailInteractions((tags) =>
      tags.some((tag) => tag.includes('nurture') || tag.includes('win-back') || tag.includes('general nurture'))
    );

    const filterLeadMagnetRecords = () =>
      deckAnalysis.filter((record) => {
        if (weekField(record) !== lastWeek) return false;
        const source = (record['Source (from Lead list)'] || '').toString().toLowerCase();
        const medium = (record['Source / medium'] || '').toString().toLowerCase();
        if (source.includes('internal') || medium.includes('test')) return false;
        return true;
      });

    const leadMagnetSessionsLastWeek = filterLeadMagnetRecords();
    const leadMagnetSessionsPrevWeek = deckAnalysis.filter((record) => weekField(record) === previousWeek);

    const uniqueMediums = (records) => {
      const set = new Set();
      records.forEach((record) => {
        const medium =
          record['Medium'] ||
          record['Source / medium'] ||
          record['Medium (from Source / medium)'] ||
          record.source_medium ||
          '';
        if (typeof medium === 'string' && medium.toLowerCase().includes('rec')) {
          set.add(medium.trim());
        }
      });
      return set;
    };

    const durationBuckets = (records) => {
      const over20 = new Set();
      const under10 = new Set();
      records.forEach((record) => {
        const emailRaw = record['Email (from Lead list)'];
        const email = Array.isArray(emailRaw)
          ? (emailRaw.find((value) => value) || '').toString().trim().toLowerCase()
          : (emailRaw || '').toString().trim().toLowerCase();
        if (!email) return;
        const duration = Number(record['Session Duration (second)'] || 0);
        if (duration > 20) {
          over20.add(email);
        } else if (duration > 0 && duration < 10) {
          under10.add(email);
        }
      });
      return { over20, under10 };
    };

    const leadMagnetDurationLastWeekBuckets = durationBuckets(leadMagnetSessionsLastWeek);
    const leadMagnetDurationPrevBuckets = durationBuckets(leadMagnetSessionsPrevWeek);

    const leadMagnetSubmissionsLastWeek = new Set();
    const leadMagnetSubmissionsPrev = new Set();
    deckReports.forEach((record) => {
      const week = weekField(record);
      const email = (record.Email || '').toString().trim().toLowerCase();
      if (!email) return;
      if (week === lastWeek) leadMagnetSubmissionsLastWeek.add(email);
      if (week === previousWeek) leadMagnetSubmissionsPrev.add(email);
    });

    const ffSessionsLastWeek = ffInteractions.filter((record) => weekField(record) === lastWeek);
    const ffSessionsPrevWeek = ffInteractions.filter((record) => weekField(record) === previousWeek);

    const ffDurationLastWeekBuckets = durationBuckets(ffSessionsLastWeek);
    const ffDurationPrevBuckets = durationBuckets(ffSessionsPrevWeek);

    const ffUniqueVisitorsLastWeek = uniqueMediums(ffSessionsLastWeek);
    const ffUniqueVisitorsPrev = uniqueMediums(ffSessionsPrevWeek);

    const bookClickLeadsLastWeek = new Set();
    const bookClickLeadsPrev = new Set();
    ffInteractions.forEach((record) => {
      const week = weekField(record);
      const clicks = Number(record['Click book a call button'] || 0);
      if (!clicks) return;
      const emailRaw = record['Email (from Lead list)'];
      const email = Array.isArray(emailRaw)
        ? (emailRaw.find((value) => value) || '').toString().trim().toLowerCase()
        : (emailRaw || '').toString().trim().toLowerCase();
      if (!email) return;
      if (week === lastWeek) bookClickLeadsLastWeek.add(email);
      if (week === previousWeek) bookClickLeadsPrev.add(email);
    });

    const marketingMetrics = {
      weekRange,
      outreach: {
        uniqueSent: outreachSent.size,
        uniqueOpened: outreachInteractions.lastWeek.uniqueOpened,
        uniqueClicked: outreachInteractions.lastWeek.uniqueClicked,
        woWChange: {
          sent: safeWoW(outreachSent.size, outreachSentPrev.size),
          opened: safeWoW(
            outreachInteractions.lastWeek.uniqueOpened,
            outreachInteractions.previousWeek.uniqueOpened
          ),
          clicked: safeWoW(
            outreachInteractions.lastWeek.uniqueClicked,
            outreachInteractions.previousWeek.uniqueClicked
          ),
        },
      },
      nurture: {
        uniqueSent: nurtureSent.size,
        uniqueOpened: nurtureInteractions.lastWeek.uniqueOpened,
        uniqueClicked: nurtureInteractions.lastWeek.uniqueClicked,
        woWChange: {
          sent: safeWoW(nurtureSent.size, nurtureSentPrev.size),
          opened: safeWoW(
            nurtureInteractions.lastWeek.uniqueOpened,
            nurtureInteractions.previousWeek.uniqueOpened
          ),
          clicked: safeWoW(
            nurtureInteractions.lastWeek.uniqueClicked,
            nurtureInteractions.previousWeek.uniqueClicked
          ),
        },
      },
      leadMagnet: {
        uniqueSubmissions: leadMagnetSubmissionsLastWeek.size,
        uniqueVisitors: uniqueMediums(leadMagnetSessionsLastWeek).size,
        leadsOver20s: leadMagnetDurationLastWeekBuckets.over20.size,
        leadsUnder10s: leadMagnetDurationLastWeekBuckets.under10.size,
        woWChange: {
          submissions: safeWoW(
            leadMagnetSubmissionsLastWeek.size,
            leadMagnetSubmissionsPrev.size
          ),
          visitors: safeWoW(
            uniqueMediums(leadMagnetSessionsLastWeek).size,
            uniqueMediums(leadMagnetSessionsPrevWeek).size
          ),
          over20s: safeWoW(
            leadMagnetDurationLastWeekBuckets.over20.size,
            leadMagnetDurationPrevBuckets.over20.size
          ),
          under10s: safeWoW(
            leadMagnetDurationLastWeekBuckets.under10.size,
            leadMagnetDurationPrevBuckets.under10.size
          ),
        },
      },
    };

    const salesMetricsSummary = {
      weekRange,
      ffLanding: {
        leadsOver20s: ffDurationLastWeekBuckets.over20.size,
        leadsUnder10s: ffDurationLastWeekBuckets.under10.size,
        uniqueVisitors: ffUniqueVisitorsLastWeek.size,
        woWChange: {
          over20s: safeWoW(
            ffDurationLastWeekBuckets.over20.size,
            ffDurationPrevBuckets.over20.size
          ),
          under10s: safeWoW(
            ffDurationLastWeekBuckets.under10.size,
            ffDurationPrevBuckets.under10.size
          ),
          uniqueVisitors: safeWoW(ffUniqueVisitorsLastWeek.size, ffUniqueVisitorsPrev.size),
        },
      },
      bookACall: {
        leadsClicked: bookClickLeadsLastWeek.size,
        woWChange: safeWoW(bookClickLeadsLastWeek.size, bookClickLeadsPrev.size),
      },
    };

    const claudeInput = {
      weekRange,
      marketingMetrics,
      salesMetrics: salesMetricsSummary,
    };

    const prompt = `You are an analyst reviewing weekly marketing and sales funnel performance metrics. Using the JSON data provided, produce a concise analysis.

Marketing & Sales Funnel Flow:
1. Marketing Funnel:
   - Email Outreach: Send → Open → Click
   - Email Nurture: Send → Open → Click
   - Lead Magnet: Visitor → Submission (with session duration indicating interest)
2. Sales Funnel:
   - FF Landing Page: Visitor → Engagement (session duration >20s = interested, <10s = bounce)
   - Book a Call: Click button → Conversion

Return a JSON object with the following structure:
{
  "weekRange": string,
  "marketingFunnel": {
    "highlight": string[],
    "hypothesis": string[],
    "nextAction": string[]
  },
  "salesFunnel": {
    "highlight": string[],
    "hypothesis": string[],
    "nextAction": string[]
  }
}

Requirements:
- "highlight": Report the normal numbers/metrics for this week (just state the facts)
- "hypothesis": Explain why metrics increased or decreased, identify bottlenecks in the funnel flow based on the marketing & sales flow provided above
- "nextAction": Suggest specific actions to verify the hypotheses and improve performance

Focus on actionable observations, trends, and practical next steps. DO NOT include any text outside the JSON object.

Metrics:
${JSON.stringify(claudeInput, null, 2)}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response?.content?.[0]?.text;
    if (!textContent) {
      throw new Error('Claude API returned an unexpected response format.');
    }

    let jsonPayload = textContent.trim();
    if (jsonPayload.startsWith('```')) {
      const firstFenceEnd = jsonPayload.indexOf('\n');
      const lastFence = jsonPayload.lastIndexOf('```');
      if (firstFenceEnd !== -1 && lastFence !== -1 && lastFence > firstFenceEnd) {
        jsonPayload = jsonPayload.slice(firstFenceEnd + 1, lastFence).trim();
      }
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error(`Failed to parse Claude response as JSON. Raw response: ${textContent}`);
    }

    const report = {
      generatedAt: new Date().toISOString(),
      weekRange,
      marketingMetrics,
      salesMetrics: salesMetricsSummary,
      analysis,
    };

    const reportPath = path.join(__dirname, '..', 'data', 'claude-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log(`Claude analysis saved to ${reportPath}`);
  } catch (error) {
    console.error('Failed to generate Claude report:', error);
    process.exit(1);
  }
})();

