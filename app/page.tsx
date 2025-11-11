'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
          calculateMKTOutreachMetrics,
          calculateNurtureEmailMetrics,
          calculateOutreachEmailInteractionMetrics,
          calculateNurtureEmailInteractionMetrics,
          calculateAnalysisResultEmailInteractionMetrics,
          calculateDMMetrics,
          calculateDMLeadRepliedMetrics,
          calculateDMFollowupMetrics,
          calculateLeadMagnetLeads,
          calculateBookACallLeads,
          calculateLeadMagnetMetrics,
          calculateSalesFunnelMetrics,
          type Metric,
        } from '@/lib/calculate-metrics';
import { calculateDMDetails, DMDetailMetrics } from '@/lib/calculate-dm-details';
import MetricSection from '@/components/MetricSection';
import DMDetailsSection from '@/components/DMDetailsSection';
import InfoBox from '@/components/InfoBox';
import { formatWeekRange, getWeekStart, parseWeekStart, sortWeeksChronologically } from '@/lib/utils';

interface FunnelData {
  sentEmailLog?: unknown[];
  emailInteractions?: unknown[];
  dmReplied?: unknown[];
  linkedinDMLog?: unknown[];
  leadList?: unknown[];
  deckAnalysisInteractions?: unknown[];
  deckReports?: unknown[];
  ffInteractions?: unknown[];
  bookACall?: unknown[];
  lastUpdated?: string;
  error?: string;
}

type TabId = 'summary' | 'marketing' | 'linkedinDm' | 'sales';

type TabConfig = {
  id: TabId;
  label: string;
  content: ReactNode;
};

type MarketingTabId = 'emailOutreach' | 'emailNurture' | 'newOrganicLeads' | 'lmPerformance';

const MARKETING_SUB_TABS: { id: MarketingTabId; label: string }[] = [
  { id: 'emailOutreach', label: 'Email Outreach' },
  { id: 'emailNurture', label: 'Email Nurture' },
  { id: 'newOrganicLeads', label: 'New Organic Leads' },
  { id: 'lmPerformance', label: 'LM Performance' },
];

interface SummaryValueFormatting {
  unit?: string;
  decimals?: number;
  suffix?: string;
  valueFormatter?: (value: number) => string;
}

interface SummaryCardOptions extends SummaryValueFormatting {
  secondary?: (metric: Metric, previous?: Metric) => string | undefined;
  note?: (metric: Metric, previous?: Metric) => string | undefined;
}

interface SummaryCard {
  key: string;
  title: string;
  weekLabel?: string;
  valueLabel: string;
  change?: number | null;
  previousLabel?: string;
  secondaryLabel?: string;
  note?: string;
}

interface SummaryCardContext {
  lastWeek?: Metric;
  previous?: Metric;
}

function getMetricNumericValue(metric?: Metric): number | null {
  if (!metric) {
    return null;
  }

  const rawValue = metric.value;

  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return rawValue;
  }

  if (typeof rawValue === 'string') {
    const parsed = parseFloat(rawValue);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function formatSummaryValue(value: number, options: SummaryValueFormatting = {}): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  if (options.valueFormatter) {
    return options.valueFormatter(value);
  }

  const decimals = options.decimals ?? 0;
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (options.suffix) {
    return `${formatted}${options.suffix}`;
  }

  if (options.unit) {
    return `${formatted} ${options.unit}`;
  }

  return formatted;
}

function getRecentMetricsForSummary(metricSeries: Metric[]): SummaryCardContext {
  if (!Array.isArray(metricSeries)) {
    return {};
  }

  const validMetrics = metricSeries.filter(
    (metric) => metric && typeof metric.week === 'string'
  );

  const sorted = [...validMetrics].sort((a, b) => sortWeeksChronologically(a.week, b.week));
  if (sorted.length === 0) {
    return {};
  }

  let filtered = sorted;
  try {
    const currentWeekStartDate = getWeekStart(new Date());
    const filteredByWeek = sorted.filter((metric) => {
      try {
        const metricDate = parseWeekStart(String(metric.week));
        return metricDate.getTime() < currentWeekStartDate.getTime();
      } catch {
        return false;
      }
    });

    if (filteredByWeek.length > 0) {
      filtered = filteredByWeek;
    }
  } catch {
    // Ignore errors and fall back to sorted list
  }

  const lastWeek = filtered[filtered.length - 1];
  const previous = filtered.length > 1 ? filtered[filtered.length - 2] : undefined;

  return { lastWeek, previous };
}

function buildSummaryCard(
  key: string,
  title: string,
  series: Metric[],
  options: SummaryCardOptions = {}
): { card: SummaryCard | null; context: SummaryCardContext } {
  const context = getRecentMetricsForSummary(series);
  const { lastWeek, previous } = context;

  if (!lastWeek) {
    return { card: null, context };
  }

  const valueNumber = getMetricNumericValue(lastWeek);
  if (valueNumber === null) {
    return { card: null, context };
  }

  const previousValueNumber = previous ? getMetricNumericValue(previous) : null;
  const change =
    typeof lastWeek.change === 'number' && Number.isFinite(lastWeek.change)
      ? lastWeek.change
      : null;

  const card: SummaryCard = {
    key,
    title,
    weekLabel: typeof lastWeek.week === 'string' ? formatWeekRange(lastWeek.week) : undefined,
    valueLabel: formatSummaryValue(valueNumber, options),
    change,
    previousLabel:
      previousValueNumber !== null ? formatSummaryValue(previousValueNumber, options) : undefined,
    secondaryLabel: options.secondary ? options.secondary(lastWeek, previous) : undefined,
    note: options.note ? options.note(lastWeek, previous) : undefined,
  };

  return { card, context };
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FunnelData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [activeMarketingTab, setActiveMarketingTab] = useState<MarketingTabId>('emailOutreach');

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/funnel-data');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const linkedinDMLogData = useMemo(() => (
    Array.isArray(data?.linkedinDMLog) ? data.linkedinDMLog : []
  ), [data?.linkedinDMLog]);

  // Calculate all metrics
  const mktOutreachMetrics = calculateMKTOutreachMetrics(
    data?.sentEmailLog ?? [],
    data?.emailInteractions ?? []
  );
  const nurtureEmailMetrics = calculateNurtureEmailMetrics(
    data?.sentEmailLog ?? [],
    data?.emailInteractions ?? []
  );
  const outreachEmailInteractionMetrics = calculateOutreachEmailInteractionMetrics(
    data?.emailInteractions ?? []
  );
  const nurtureEmailInteractionMetrics = calculateNurtureEmailInteractionMetrics(
    data?.emailInteractions ?? []
  );
  const analysisResultEmailInteractionMetrics = calculateAnalysisResultEmailInteractionMetrics(
    data?.emailInteractions ?? []
  );
  const dmMetrics = calculateDMMetrics(linkedinDMLogData);
  const dmLeadRepliedMetrics = calculateDMLeadRepliedMetrics(linkedinDMLogData);
  const dmFollowupMetrics = calculateDMFollowupMetrics(linkedinDMLogData);

  const dmDetails = useMemo<DMDetailMetrics[]>(() => {
    let details: DMDetailMetrics[] = [];

    try {
      if (Array.isArray(linkedinDMLogData) && linkedinDMLogData.length > 0) {
        const result = calculateDMDetails(linkedinDMLogData);
        if (Array.isArray(result)) {
          details = result;
        } else {
          console.warn('calculateDMDetails returned non-array:', result);
          details = [];
        }
      }
    } catch (error) {
      console.error('Error calculating DM details:', error);
      details = [];
    }

    if (!Array.isArray(details)) {
      console.error('dmDetails is not an array, resetting:', details);
      details = [];
    }

    return details.filter((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return false;
      }
      if ('error' in item) {
        console.warn('Found error object in dmDetails, removing:', item);
        return false;
      }
      return true;
    });
  }, [linkedinDMLogData]);

  const leadMagnetLeadsMetrics = calculateLeadMagnetLeads(data?.leadList ?? []);
  const bookACallLeadsMetrics = calculateBookACallLeads(data?.leadList ?? []);
  const leadMagnetMetrics = calculateLeadMagnetMetrics(
    data?.deckAnalysisInteractions ?? [],
    data?.deckReports ?? []
  );
  const salesFunnelMetrics = calculateSalesFunnelMetrics(
    data?.ffInteractions ?? [],
    data?.bookACall ?? []
  );

  const {
    clicks: salesClicks,
    clickToLanded: salesClickToLanded,
  } = salesFunnelMetrics;

  const marketingSummaryCards = useMemo<SummaryCard[]>(() => {
    const cards: SummaryCard[] = [];

    const formatWeekFromMetric = (metric?: Metric) =>
      metric && typeof metric.week === 'string' ? formatWeekRange(metric.week) : undefined;

    const outreachSentContext = getRecentMetricsForSummary(mktOutreachMetrics);
    const outreachSent = getMetricNumericValue(outreachSentContext.lastWeek);
    const outreachPrevSent = getMetricNumericValue(outreachSentContext.previous);
    const outreachOpensContext = getRecentMetricsForSummary(outreachEmailInteractionMetrics);
    const outreachOpens = getMetricNumericValue(outreachOpensContext.lastWeek);
    const outreachPrevOpens = getMetricNumericValue(outreachOpensContext.previous);
    const outreachClicks = typeof outreachOpensContext.lastWeek?.clicked === 'number'
      ? outreachOpensContext.lastWeek!.clicked
      : null;
    const outreachPrevClicks = typeof outreachOpensContext.previous?.clicked === 'number'
      ? outreachOpensContext.previous!.clicked
      : null;

    if (outreachSent !== null && outreachSent > 0 && outreachOpens !== null) {
      const rate = (outreachOpens / outreachSent) * 100;
      const prevRate =
        outreachPrevSent !== null && outreachPrevSent > 0 && outreachPrevOpens !== null
          ? (outreachPrevOpens / outreachPrevSent) * 100
          : null;
      const change =
        prevRate !== null && prevRate !== 0 ? ((rate - prevRate) / prevRate) * 100 : null;
      cards.push({
        key: 'outreach-open-rate',
        title: 'Outreach Email Open Rate',
        valueLabel: formatSummaryValue(rate, { decimals: 1, suffix: '%' }),
        change,
        previousLabel:
          prevRate !== null ? formatSummaryValue(prevRate, { decimals: 1, suffix: '%' }) : undefined,
        note: `Opens: ${Math.round(outreachOpens).toLocaleString()} • Sent: ${Math.round(outreachSent).toLocaleString()}`,
        weekLabel: formatWeekFromMetric(outreachSentContext.lastWeek),
      });

      const outreachRecipients = typeof outreachSentContext.lastWeek?.uniqueEmails === 'number'
        ? outreachSentContext.lastWeek!.uniqueEmails
        : null;
      const outreachOpenLeads = typeof outreachOpensContext.lastWeek?.uniqueEmailsOpened === 'number'
        ? outreachOpensContext.lastWeek!.uniqueEmailsOpened
        : null;
      if (outreachRecipients !== null && outreachOpenLeads !== null) {
        const notOpen = Math.max(outreachRecipients - outreachOpenLeads, 0);
        const prevRecipients = typeof outreachSentContext.previous?.uniqueEmails === 'number'
          ? outreachSentContext.previous!.uniqueEmails
          : null;
        const prevOpenLeads = typeof outreachOpensContext.previous?.uniqueEmailsOpened === 'number'
          ? outreachOpensContext.previous!.uniqueEmailsOpened
          : null;
        const prevNotOpen =
          prevRecipients !== null && prevOpenLeads !== null
            ? Math.max(prevRecipients - prevOpenLeads, 0)
            : null;
        const changeNotOpen =
          prevNotOpen !== null && prevNotOpen !== 0 ? ((notOpen - prevNotOpen) / prevNotOpen) * 100 : null;
        cards.push({
          key: 'outreach-no-open',
          title: 'Leads Not Opening Outreach Email',
          valueLabel: formatSummaryValue(notOpen),
          change: changeNotOpen,
          previousLabel: prevNotOpen !== null ? formatSummaryValue(prevNotOpen) : undefined,
          note: `Recipients: ${outreachRecipients.toLocaleString()} • Opened: ${outreachOpenLeads.toLocaleString()}`,
          weekLabel: formatWeekFromMetric(outreachSentContext.lastWeek),
        });
      }
    }

    if (outreachOpens !== null && outreachOpens > 0 && outreachClicks !== null) {
      const rate = (outreachClicks / outreachOpens) * 100;
      const prevRate =
        outreachPrevOpens !== null && outreachPrevOpens > 0 && outreachPrevClicks !== null
          ? (outreachPrevClicks / outreachPrevOpens) * 100
          : null;
      const change =
        prevRate !== null && prevRate !== 0 ? ((rate - prevRate) / prevRate) * 100 : null;
      cards.push({
        key: 'outreach-click-rate',
        title: 'Outreach Email Click Rate',
        valueLabel: formatSummaryValue(rate, { decimals: 1, suffix: '%' }),
        change,
        previousLabel:
          prevRate !== null ? formatSummaryValue(prevRate, { decimals: 1, suffix: '%' }) : undefined,
        note: `Clicks: ${outreachClicks.toLocaleString()} • Opens: ${Math.round(outreachOpens).toLocaleString()}`,
        weekLabel: formatWeekFromMetric(outreachOpensContext.lastWeek),
      });

      const outreachMultiOpens = typeof outreachOpensContext.lastWeek?.leadsOpenedMultiple === 'number'
        ? outreachOpensContext.lastWeek!.leadsOpenedMultiple
        : null;
      const outreachPrevMultiOpens = typeof outreachOpensContext.previous?.leadsOpenedMultiple === 'number'
        ? outreachOpensContext.previous!.leadsOpenedMultiple
        : null;
      if (outreachMultiOpens !== null) {
        const changeMulti =
          outreachPrevMultiOpens !== null && outreachPrevMultiOpens !== 0
            ? ((outreachMultiOpens - outreachPrevMultiOpens) / outreachPrevMultiOpens) * 100
            : null;
        cards.push({
          key: 'outreach-repeat-openers',
          title: 'Leads Opening Outreach Email >1x',
          valueLabel: formatSummaryValue(outreachMultiOpens),
          change: changeMulti,
          previousLabel:
            outreachPrevMultiOpens !== null ? formatSummaryValue(outreachPrevMultiOpens) : undefined,
          note: 'Count of leads with multiple outreach opens last week',
          weekLabel: formatWeekFromMetric(outreachOpensContext.lastWeek),
        });
      }
    }

    const nurtureSentContext = getRecentMetricsForSummary(nurtureEmailMetrics);
    const nurtureSent = getMetricNumericValue(nurtureSentContext.lastWeek);
    const nurturePrevSent = getMetricNumericValue(nurtureSentContext.previous);
    const nurtureOpensContext = getRecentMetricsForSummary(nurtureEmailInteractionMetrics);
    const nurtureOpens = getMetricNumericValue(nurtureOpensContext.lastWeek);
    const nurturePrevOpens = getMetricNumericValue(nurtureOpensContext.previous);
    const nurtureClicks = typeof nurtureOpensContext.lastWeek?.clicked === 'number'
      ? nurtureOpensContext.lastWeek!.clicked
      : null;
    const nurturePrevClicks = typeof nurtureOpensContext.previous?.clicked === 'number'
      ? nurtureOpensContext.previous!.clicked
      : null;

    if (nurtureSent !== null && nurtureSent > 0 && nurtureOpens !== null) {
      const rate = (nurtureOpens / nurtureSent) * 100;
      const prevRate =
        nurturePrevSent !== null && nurturePrevSent > 0 && nurturePrevOpens !== null
          ? (nurturePrevOpens / nurturePrevSent) * 100
          : null;
      const change =
        prevRate !== null && prevRate !== 0 ? ((rate - prevRate) / prevRate) * 100 : null;
      cards.push({
        key: 'nurture-open-rate',
        title: 'Nurture Email Open Rate',
        valueLabel: formatSummaryValue(rate, { decimals: 1, suffix: '%' }),
        change,
        previousLabel:
          prevRate !== null ? formatSummaryValue(prevRate, { decimals: 1, suffix: '%' }) : undefined,
        note: `Opens: ${Math.round(nurtureOpens).toLocaleString()} • Sent: ${Math.round(nurtureSent).toLocaleString()}`,
        weekLabel: formatWeekFromMetric(nurtureSentContext.lastWeek),
      });
    }

    if (nurtureOpens !== null && nurtureOpens > 0 && nurtureClicks !== null) {
      const rate = (nurtureClicks / nurtureOpens) * 100;
      const prevRate =
        nurturePrevOpens !== null && nurturePrevOpens > 0 && nurturePrevClicks !== null
          ? (nurturePrevClicks / nurturePrevOpens) * 100
          : null;
      const change =
        prevRate !== null && prevRate !== 0 ? ((rate - prevRate) / prevRate) * 100 : null;
      cards.push({
        key: 'nurture-click-rate',
        title: 'Nurture Email Click Rate',
        valueLabel: formatSummaryValue(rate, { decimals: 1, suffix: '%' }),
        change,
        previousLabel:
          prevRate !== null ? formatSummaryValue(prevRate, { decimals: 1, suffix: '%' }) : undefined,
        note: `Clicks: ${nurtureClicks.toLocaleString()} • Opens: ${Math.round(nurtureOpens).toLocaleString()}`,
        weekLabel: formatWeekFromMetric(nurtureOpensContext.lastWeek),
      });
    }

    return cards;
  }, [
    mktOutreachMetrics,
    nurtureEmailInteractionMetrics,
    nurtureEmailMetrics,
    outreachEmailInteractionMetrics,
  ]);

  const salesSummaryCards = useMemo<SummaryCard[]>(() => {
    const cards: SummaryCard[] = [];

    const bookCallCtrCard = buildSummaryCard('book-call-ctr', 'Book a Call CTR', salesClickToLanded, {
      suffix: '%',
      decimals: 1,
      note: (metric) => {
        const clicks = typeof metric?.clicked === 'number' ? metric.clicked : undefined;
        const landed = getMetricNumericValue(metric);
        const parts: string[] = [];
        if (clicks !== undefined) {
          parts.push(`Clicks: ${clicks.toLocaleString()}`);
        }
        if (landed !== null) {
          parts.push(`Sessions: ${Math.round(landed).toLocaleString()}`);
        }
        return parts.join(' • ') || undefined;
      },
    });
    if (bookCallCtrCard.card) {
      cards.push(bookCallCtrCard.card);
    }

    const clicksContext = getRecentMetricsForSummary(salesClicks);
    const leadsContext = getRecentMetricsForSummary(bookACallLeadsMetrics);
    const clicksValue = getMetricNumericValue(clicksContext.lastWeek);
    const leadsValue = getMetricNumericValue(leadsContext.lastWeek);
    const prevClicksValue = getMetricNumericValue(clicksContext.previous);
    const prevLeadsValue = getMetricNumericValue(leadsContext.previous);

    if (clicksValue !== null && clicksValue > 0 && leadsValue !== null) {
      const rate = (leadsValue / clicksValue) * 100;
      const prevRate =
        prevClicksValue !== null && prevClicksValue > 0 && prevLeadsValue !== null
          ? (prevLeadsValue / prevClicksValue) * 100
          : null;
      const change =
        prevRate !== null && prevRate !== 0 ? ((rate - prevRate) / prevRate) * 100 : null;
      const noteParts: string[] = [
        `Leads: ${Math.round(leadsValue).toLocaleString()}`,
        `Clicks: ${Math.round(clicksValue).toLocaleString()}`,
      ];
      cards.push({
        key: 'book-call-click-to-lead',
        title: 'Book a Call Click-to-Lead Rate',
        valueLabel: formatSummaryValue(rate, { decimals: 1, suffix: '%' }),
        change,
        previousLabel:
          prevRate !== null ? formatSummaryValue(prevRate, { decimals: 1, suffix: '%' }) : undefined,
        note: noteParts.join(' • '),
      });
    }

    return cards;
  }, [
    bookACallLeadsMetrics,
    salesClickToLanded,
    salesClicks,
  ]);

  const linkedinSummaryCards = useMemo<SummaryCard[]>(() => {
    const cards: SummaryCard[] = [];

    const formatWeekFromMetric = (metric?: Metric) =>
      metric && typeof metric.week === 'string' ? formatWeekRange(metric.week) : undefined;

    const repliesContext = getRecentMetricsForSummary(dmLeadRepliedMetrics);
    const replies = getMetricNumericValue(repliesContext.lastWeek);
    const prevReplies = getMetricNumericValue(repliesContext.previous);
    if (replies !== null) {
      const change =
        prevReplies !== null && prevReplies !== 0 ? ((replies - prevReplies) / prevReplies) * 100 : null;
      cards.push({
        key: 'dm-replies-count',
        title: 'LinkedIn DM Replies',
        valueLabel: formatSummaryValue(replies),
        change,
        previousLabel:
          prevReplies !== null ? formatSummaryValue(prevReplies) : undefined,
        note: 'Conversations with lead replies last week',
        weekLabel: formatWeekFromMetric(repliesContext.lastWeek),
      });
    }

    const dmContext = getRecentMetricsForSummary(dmMetrics);
    const dmMetric = dmContext.lastWeek;
    const dmPrevious = dmContext.previous;
    const newConversations = getMetricNumericValue(dmMetric);
    const prevNewConversations = getMetricNumericValue(dmPrevious);
    if (newConversations !== null) {
      const changeNew =
        prevNewConversations !== null && prevNewConversations !== 0
          ? ((newConversations - prevNewConversations) / prevNewConversations) * 100
          : null;
      cards.push({
        key: 'dm-new-conversations',
        title: 'New LinkedIn Conversations',
        valueLabel: formatSummaryValue(newConversations),
        change: changeNew,
        previousLabel:
          prevNewConversations !== null ? formatSummaryValue(prevNewConversations) : undefined,
        note: 'Unique conversations started last week',
        weekLabel: formatWeekFromMetric(dmMetric),
      });
    }

    const dmRate = typeof dmMetric?.percentage === 'number' ? dmMetric.percentage : null;
    const dmPrevRate = typeof dmPrevious?.percentage === 'number' ? dmPrevious.percentage : null;
    if (dmRate !== null) {
      const change =
        dmPrevRate !== null && dmPrevRate !== 0 ? ((dmRate - dmPrevRate) / dmPrevRate) * 100 : null;
      const noteParts: string[] = [];
      if (newConversations !== null) {
        noteParts.push(`New conversations: ${Math.round(newConversations).toLocaleString()}`);
      }
      cards.push({
        key: 'dm-reply-rate',
        title: 'LinkedIn DM Reply Rate (New)',
        valueLabel: formatSummaryValue(dmRate, { decimals: 1, suffix: '%' }),
        change,
        previousLabel:
          dmPrevRate !== null ? formatSummaryValue(dmPrevRate, { decimals: 1, suffix: '%' }) : undefined,
        note: noteParts.join(' • ') || undefined,
        weekLabel: formatWeekFromMetric(dmMetric),
      });
    }

    const followupContext = getRecentMetricsForSummary(dmFollowupMetrics);
    const followups = getMetricNumericValue(followupContext.lastWeek);
    const prevFollowups = getMetricNumericValue(followupContext.previous);
    if (followups !== null) {
      const change =
        prevFollowups !== null && prevFollowups !== 0
          ? ((followups - prevFollowups) / prevFollowups) * 100
          : null;
      cards.push({
        key: 'dm-followup-rate',
        title: 'LinkedIn DM Followup Rate',
        valueLabel: formatSummaryValue(followups),
        change,
        previousLabel:
          prevFollowups !== null ? formatSummaryValue(prevFollowups) : undefined,
        note: 'Conversations with ME followups after a reply',
        weekLabel: formatWeekFromMetric(followupContext.lastWeek),
      });
    }

    return cards;
  }, [dmFollowupMetrics, dmLeadRepliedMetrics, dmMetrics]);

  const renderSummaryCard = useCallback(
    (card: SummaryCard) => {
      const changeColor =
        typeof card.change === 'number'
          ? card.change > 0
            ? 'text-green-600'
            : card.change < 0
            ? 'text-red-600'
            : 'text-gray-600'
          : 'text-gray-500';

      const changeIcon =
        typeof card.change === 'number'
          ? card.change > 0
            ? '↑'
            : card.change < 0
            ? '↓'
            : '→'
          : null;

      return (
        <div
          key={card.key}
          className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 flex flex-col gap-3"
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-700">{card.title}</h3>
            {card.weekLabel && <p className="text-xs text-gray-500 mt-1">{card.weekLabel}</p>}
          </div>
          <div className="text-3xl font-bold text-gray-900">{card.valueLabel}</div>
          {card.secondaryLabel && (
            <p className="text-xs font-semibold text-indigo-600">{card.secondaryLabel}</p>
          )}
          {typeof card.change === 'number' && (
            <p className={`text-sm font-semibold ${changeColor}`}>
              {changeIcon} {Math.abs(card.change).toFixed(1)}% WoW
            </p>
          )}
          {card.previousLabel && (
            <p className="text-xs text-gray-500">Previous week: {card.previousLabel}</p>
          )}
          {card.note && <p className="text-xs text-gray-500 leading-relaxed">{card.note}</p>}
        </div>
      );
    },
    []
  );

  const marketingSubTabContent = useMemo<Record<MarketingTabId, ReactNode>>(
    () => ({
      emailOutreach: (
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Outreach</h3>
            <InfoBox title="About Outreach">
              <p className="mb-2">
                This section tracks MKT Outreach email campaigns and their engagement:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>MKT Outreach - Sent:</strong> Total number of outbound marketing emails sent (each record = 1 email). Also shows unique leads who received emails. One lead can receive multiple emails per week.</li>
                <li><strong>Outreach Emails - Opens &amp; Clicks:</strong> Engagement metrics for MKT Outreach emails filtered by <code className="bg-gray-100 px-1 rounded">mailgun_tags</code> containing &quot;outreach&quot; or &quot;mkt outreach&quot;</li>
                <li><strong>Opens:</strong> Total number of email open events (main metric shown)</li>
                <li><strong>Clicks:</strong> Total number of email click events (shown in card)</li>
                <li><strong>Unique Leads Opened:</strong> Number of unique email addresses that opened emails (shown in card and chart tooltip)</li>
                <li><strong>Unique Leads Clicked:</strong> Number of unique email addresses that clicked links (shown in card and chart tooltip)</li>
                <li><strong>% Clicked over Opened:</strong> Click-through rate from opens to clicks (shown in chart tooltip)</li>
                <li>Charts display the latest 12 weeks of data for better trend visualization</li>
                <li>Data is tracked week-over-week to monitor campaign performance and engagement rates</li>
              </ul>
            </InfoBox>

            <div className="space-y-6">
              <MetricSection
                title="MKT Outreach - Sent"
                metrics={mktOutreachMetrics}
                showPercentage={false}
                unit="emails"
                showChart={true}
                chartType="line"
              />
              <MetricSection
                title="Outreach Emails - Opens &amp; Clicks"
                metrics={outreachEmailInteractionMetrics}
                showPercentage={false}
                unit="opens"
                showChart={true}
                chartType="line"
              />
            </div>
          </div>
        </div>
      ),
      emailNurture: (
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Nurture</h3>
            <InfoBox title="About Nurture">
              <p className="mb-2">
                This section tracks Nurture email campaigns and their engagement:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Nurture Emails - Sent:</strong> Total number of follow-up emails sent to nurture existing leads (General Nurture, Win-back Sequence). Also shows unique leads who received emails. One lead can receive multiple emails per week.</li>
                <li><strong>Nurture Emails - Opens &amp; Clicks:</strong> Engagement metrics for Nurture sequence emails filtered by <code className="bg-gray-100 px-1 rounded">mailgun_tags</code> containing &quot;nurture&quot;, &quot;win-back&quot;, or &quot;general nurture&quot;</li>
                <li><strong>Opens:</strong> Total number of email open events (main metric shown)</li>
                <li><strong>Clicks:</strong> Total number of email click events (shown in card)</li>
                <li><strong>Unique Leads Opened:</strong> Number of unique email addresses that opened emails (shown in card and chart tooltip)</li>
                <li><strong>Unique Leads Clicked:</strong> Number of unique email addresses that clicked links (shown in card and chart tooltip)</li>
                <li><strong>% Clicked over Opened:</strong> Click-through rate from opens to clicks (shown in chart tooltip)</li>
                <li>Charts display the latest 12 weeks of data for better trend visualization</li>
                <li>Data is tracked week-over-week to monitor nurture campaign performance</li>
              </ul>
            </InfoBox>

            <div className="space-y-6">
              <MetricSection
                title="Nurture Emails - Sent"
                metrics={nurtureEmailMetrics}
                showPercentage={false}
                unit="emails"
                showChart={true}
                chartType="line"
              />
              <MetricSection
                title="Nurture Emails - Opens &amp; Clicks"
                metrics={nurtureEmailInteractionMetrics}
                showPercentage={false}
                unit="opens"
                showChart={true}
                chartType="line"
              />
            </div>
          </div>
        </div>
      ),
      newOrganicLeads: (
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">New Organic Leads</h3>
            <InfoBox title="About New Organic Leads">
              <p className="mb-2">
                This section tracks leads that come to you organically (not from outbound campaigns):
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Lead Magnet Leads:</strong> Count of leads from the <code className="bg-gray-100 px-1 rounded">Lead list</code> table where <code className="bg-gray-100 px-1 rounded">Source</code> = &quot;Lead magnet&quot;. These are leads who discovered you through lead magnet content.</li>
                <li><strong>Book a Call Leads:</strong> Count of leads from the <code className="bg-gray-100 px-1 rounded">Lead list</code> table where <code className="bg-gray-100 px-1 rounded">Source</code> = &quot;Book a call&quot;. These are leads who directly requested a call without being contacted first.</li>
                <li>These leads represent inbound interest and are typically higher quality than outbound leads</li>
                <li>Charts display the latest 12 weeks of data for better trend visualization</li>
                <li>Tracked week-over-week to monitor organic growth and brand awareness</li>
              </ul>
            </InfoBox>

            <div className="space-y-6">
              <MetricSection
                title="Lead Magnet Leads"
                metrics={leadMagnetLeadsMetrics}
                unit="leads"
                showChart={true}
                chartType="bar"
              />
              <MetricSection
                title="Book a Call Leads"
                metrics={bookACallLeadsMetrics}
                unit="leads"
                showChart={true}
                chartType="bar"
              />
            </div>
          </div>
        </div>
      ),
      lmPerformance: (
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Lead Magnet Performance</h3>
            <InfoBox title="About Lead Magnet Performance">
              <p className="mb-2">
                This section tracks the performance of your lead magnet landing pages (deck analysis tools):
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Landed:</strong> Total number of unique sessions on the lead magnet landing page (each <code className="bg-gray-100 px-1 rounded">SessionID</code> = 1 session)</li>
                <li><strong>Unique Lead Visitors:</strong> Number of unique mediums (where medium contains &quot;rec&quot;) that visited the page. Multiple sessions can share the same medium, so this counts unique lead sources. If medium doesn&apos;t contain &quot;rec&quot;, it&apos;s not counted as a unique lead visitor.</li>
                <li><strong>Avg. Session Duration:</strong> Average time (in seconds) visitors spend on the page per session. Calculated as total duration ÷ number of sessions. Higher duration indicates better content engagement and lead quality.</li>
                <li><strong>Deck Submission:</strong> Total number of pitch decks submitted for analysis. Also shows unique leads who submitted (one lead can submit multiple decks). This is the conversion metric from landing to submission.</li>
                <li><strong>Analysis Result Email Interactions:</strong> Opens and clicks on lead magnet deck analysis report emails, filtered by <code className="bg-gray-100 px-1 rounded">mailgun_tags</code> containing &quot;analysis result&quot; or &quot;analysis&quot;. Shows total opens, clicks, and unique leads who opened/clicked.</li>
                <li>Charts display the latest 12 weeks of data for better trend visualization</li>
                <li>Track conversion rate from landed to submission to optimize the funnel</li>
              </ul>
            </InfoBox>

            <div className="space-y-6">
              <MetricSection
                title="Landed"
                metrics={leadMagnetMetrics.landed}
                formatValue={(val) => `${Math.round(val)}`}
                unit="sessions"
                showChart={true}
                chartType="line"
              />
              <MetricSection
                title="Unique Lead Visitors"
                metrics={leadMagnetMetrics.uniqueVisits}
                formatValue={(val) => `${Math.round(val)}`}
                unit="visitors"
                showChart={true}
                chartType="line"
              />
              <MetricSection
                title="Avg. Session Duration"
                metrics={leadMagnetMetrics.avgDuration}
                formatValue={(val) => `${Math.round(val)}s`}
                unit=""
                showChart={true}
                chartType="line"
              />
              <MetricSection
                title="Deck Submission"
                metrics={leadMagnetMetrics.submissions}
                unit="submissions"
                showChart={true}
                chartType="bar"
              />
              <MetricSection
                title="Analysis Result Email Interactions"
                metrics={analysisResultEmailInteractionMetrics}
                showPercentage={false}
                unit="opens"
                showChart={true}
                chartType="line"
              />
            </div>
          </div>
        </div>
      ),
    }),
    [
      leadMagnetLeadsMetrics,
      leadMagnetMetrics,
      mktOutreachMetrics,
      nurtureEmailInteractionMetrics,
      nurtureEmailMetrics,
      outreachEmailInteractionMetrics,
      bookACallLeadsMetrics,
      analysisResultEmailInteractionMetrics,
    ]
  );

  const linkedinDmContent = useMemo<ReactNode>(() => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-800">DM Outreach</h3>
        <InfoBox title="About DM Outreach">
          <p className="mb-2">
            This section tracks LinkedIn Direct Message outreach and engagement:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>New DMs Conversation Start:</strong> Number of unique new conversations started each week where you sent the first DM. Uses <code className="bg-gray-100 px-1 rounded">Conversation_id</code> to identify unique conversations and counts each conversation in the week it first appeared.</li>
            <li><strong>Lead Replied Conversations:</strong> Total number of unique conversations in that week where a correspondent (the lead) sent at least one message.</li>
            <li><strong>No Reply:</strong> New conversations where only you sent messages (lead didn&apos;t respond).</li>
            <li><strong>% Lead Replied over DMed:</strong> Response rate for new conversations (Lead Replied ÷ New DMs) × 100. This is an engagement quality metric.</li>
            <li><strong>Followup Conversations:</strong> Number of conversations in that week where ME sent a message after a lead had already replied (counts followups whenever they happen).</li>
            <li><strong>Note:</strong> New DMs are counted in the week they start; reply and followup counts reflect activity in the week the messages were sent.</li>
            <li>Charts display the latest 12 weeks of data for better trend visualization.</li>
            <li>The detailed breakdown below shows message counts by sender (You vs. Correspondent) and identifies the most active conversations.</li>
          </ul>
        </InfoBox>

        <div className="space-y-6">
          <MetricSection
            title="New DMs Conversation Start"
            metrics={dmMetrics}
            showPercentage={true}
            percentageLabel="Lead Replied"
            unit="conversations"
            showChart={true}
            chartType="line"
          />
          <MetricSection
            title="Lead Replied Conversations"
            metrics={dmLeadRepliedMetrics}
            unit="conversations"
            showChart={true}
            chartType="line"
          />
          <MetricSection
            title="Followup Conversations"
            metrics={dmFollowupMetrics}
            unit="conversations"
            showChart={true}
            chartType="line"
          />
        </div>

        {dmDetails.length > 0 && <DMDetailsSection details={dmDetails} />}
      </div>
    </div>
  ), [dmDetails, dmFollowupMetrics, dmLeadRepliedMetrics, dmMetrics]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      {
        id: 'summary',
        label: 'Summary',
        content: (
          <div className="space-y-12">
            <section>
              <h2 className="text-3xl font-bold mb-4 text-indigo-700">Weekly Snapshot</h2>
              <p className="text-gray-600">
                Overview of the last completed week across marketing and sales funnels.
              </p>
              <InfoBox title="How These Metrics Are Calculated">
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>
                    <strong>Outreach Email Open Rate:</strong> Outreach email opens ÷ outreach emails sent for the last completed week.
                  </li>
                  <li>
                    <strong>Outreach Email Click Rate:</strong> Outreach email clicks ÷ outreach email opens for the week.
                  </li>
                  <li>
                    <strong>Nurture Email Open Rate:</strong> Nurture email opens ÷ nurture emails sent for the week.
                  </li>
                  <li>
                    <strong>Nurture Email Click Rate:</strong> Nurture email clicks ÷ nurture email opens for the week.
                  </li>
                  <li>
                    <strong>LinkedIn DM Replies:</strong> Conversations where the correspondent replied at least once last week.
                  </li>
                  <li>
                    <strong>LinkedIn DM Reply Rate (New):</strong> New conversations with a lead reply ÷ new conversations started last week.
                  </li>
                  <li>
                    <strong>LinkedIn DM Followup Rate:</strong> Conversations where ME sent a followup after the lead replied last week.
                  </li>
                  <li>
                    <strong>Book a Call CTR:</strong> Button clicks ÷ landing sessions for the last completed week.
                  </li>
                  <li>
                    <strong>Click-to-Lead Rate:</strong> Book a call leads recorded ÷ button clicks for the week.
                  </li>
                  <li>
                    <strong>Leads Not Opening Outreach Email:</strong> Outreach recipients who had no open events last week (unique recipients − unique opens).
                  </li>
                  <li>
                    <strong>Leads Opening Outreach Email &gt;1x:</strong> Count of leads with more than one outreach open event last week.
                  </li>
                  <li>
                    Week-over-week changes compare to the prior completed week; current calendar week is excluded.
                  </li>
                </ul>
              </InfoBox>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Marketing Snapshot</h3>
                <span className="text-xs text-gray-500">Excludes current calendar week</span>
              </div>
              {marketingSummaryCards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {marketingSummaryCards.map(renderSummaryCard)}
                </div>
              ) : (
                <p className="text-gray-500">No marketing data available.</p>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Sales Snapshot</h3>
                <span className="text-xs text-gray-500">Excludes current calendar week</span>
              </div>
              {salesSummaryCards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {salesSummaryCards.map(renderSummaryCard)}
                </div>
              ) : (
                <p className="text-gray-500">No sales data available.</p>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">LinkedIn DM Snapshot</h3>
              </div>
              {linkedinSummaryCards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {linkedinSummaryCards.map(renderSummaryCard)}
                </div>
              ) : (
                <p className="text-gray-500">No LinkedIn DM data available.</p>
              )}
            </section>
          </div>
        ),
      },
      {
        id: 'marketing',
        label: 'Marketing Funnel',
        content: (
          <div className="space-y-12">
            <section>
              <h2 className="text-3xl font-bold mb-6 text-blue-700">Marketing Funnel (WoW)</h2>

              <div className="border-b border-gray-200 mb-8">
                <nav className="-mb-px flex space-x-6">
                  {MARKETING_SUB_TABS.map((subTab) => (
                    <button
                      key={subTab.id}
                      type="button"
                      onClick={() => setActiveMarketingTab(subTab.id)}
                      className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                        activeMarketingTab === subTab.id
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="space-y-8">
                {marketingSubTabContent[activeMarketingTab] ?? null}
              </div>
            </section>
          </div>
        ),
      },
      {
        id: 'linkedinDm',
        label: 'LinkedIn DM',
        content: <div className="space-y-12">{linkedinDmContent}</div>,
      },
      {
        id: 'sales',
        label: 'Sales Funnel',
        content: (
          <div className="space-y-12">
            <section>
              <h2 className="text-3xl font-bold mb-6 text-green-700">Sales Funnel (WoW)</h2>

              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">FF Landing Page</h3>
                <InfoBox title="About FF Landing Page">
                  <p className="mb-2">
                    This section tracks the main Fundraising Flywheel landing page performance:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Landed:</strong> Total number of unique sessions on the main landing page (each <code className="bg-gray-100 px-1 rounded">SessionID</code> = 1 session)</li>
                    <li><strong>Unique Lead Visitors:</strong> Number of unique mediums (where medium contains &quot;rec&quot;) that visited the page. Multiple sessions can share the same medium, so this counts unique lead sources. If medium doesn&apos;t contain &quot;rec&quot;, it&apos;s not counted as a unique lead visitor.</li>
                    <li><strong>Avg. Session Duration:</strong> Average time (in seconds) visitors spend exploring the page per session. Calculated as total duration ÷ number of sessions. Higher duration suggests better fit and higher conversion potential.</li>
                    <li>This is the entry point for your sales funnel - visitors come here to learn about your services</li>
                    <li>Charts display the latest 12 weeks of data for better trend visualization</li>
                    <li>Monitor trends to understand traffic quality and optimize page content</li>
                  </ul>
                </InfoBox>
                <MetricSection
                  title="Landed"
                  metrics={salesFunnelMetrics.landed}
                  formatValue={(val) => `${Math.round(val)}`}
                  unit="sessions"
                  showChart={true}
                  chartType="line"
                />
                <div className="mb-6">
                  <MetricSection
                    title="Unique Lead Visitors"
                    metrics={salesFunnelMetrics.uniqueVisits}
                    formatValue={(val) => `${Math.round(val)}`}
                    unit="visitors"
                    showChart={true}
                    chartType="line"
                  />
                </div>
                <MetricSection
                  title="Avg. Session Duration"
                  metrics={salesFunnelMetrics.avgDuration}
                  formatValue={(val) => `${Math.round(val)}s`}
                  unit=""
                  showChart={true}
                  chartType="line"
                />
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Book a Call</h3>
                <InfoBox title="About Book a Call">
                  <p className="mb-2">
                    This section tracks the final conversion step in your sales funnel:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Total Clicks:</strong> Number of times the &quot;Book a Call&quot; button was clicked on the FF landing page (counted in the week the click occurred)</li>
                    <li><strong>% of Landed vs Clicked Book a Call:</strong> Click-through rate showing what percentage of visitors who landed on the FF landing page clicked the &quot;Book a Call&quot; button</li>
                    <li><strong>How it works:</strong> The metric calculates (Button Clicks ÷ Landed Sessions) × 100</li>
                    <li><strong>What it means:</strong> Of all visitors who landed on the FF landing page in a given week, what percentage clicked the &quot;Book a Call&quot; button?</li>
                    <li><strong>Example:</strong> If 1000 people landed on the FF landing page and 50 clicked the &quot;Book a Call&quot; button, the click-through rate is 5%</li>
                    <li><strong>Why this matters:</strong> This metric measures the effectiveness of your call-to-action. A higher percentage indicates that visitors are interested and engaged enough to click the button.</li>
                    <li>A lower percentage may indicate that the button placement, visibility, or messaging needs improvement</li>
                    <li>A higher percentage indicates a strong call-to-action and good visitor engagement</li>
                    <li>Track week-over-week trends to identify if changes to the landing page or button improve or worsen click-through rates</li>
                    <li>Note: This metric will continue to be tracked until the &quot;Book a Call&quot; feature is officially removed</li>
                  </ul>
                </InfoBox>
                <MetricSection
                  title="Total Clicks on Book a Call Button"
                  metrics={salesFunnelMetrics.clicks}
                  unit="clicks"
                  showChart={true}
                  chartType="bar"
                />
                <MetricSection
                  title="% of Landed vs Clicked Book a Call"
                  metrics={salesFunnelMetrics.clickToLanded}
                  showPercentage={false}
                  unit="%"
                  showChart={true}
                  chartType="line"
                />
              </div>
            </section>
          </div>
        ),
      },
    ],
    [
      activeMarketingTab,
      linkedinDmContent,
      linkedinSummaryCards,
      marketingSubTabContent,
      marketingSummaryCards,
      renderSummaryCard,
      salesFunnelMetrics,
      salesSummaryCards,
    ]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-gray-900">Loading dashboard...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-red-600">Error: {error}</h1>
          <p className="text-gray-700">
            Please make sure AIRTABLE_API_KEY is set in your .env.local file
          </p>
        </div>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-red-600">Error: {data.error}</h1>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-gray-900">Marketing & Sales Funnel Dashboard</h1>
            <p className="text-gray-700 mb-2 font-medium">Week-over-Week Metrics</p>
            {data.lastUpdated && typeof data.lastUpdated === 'string' && (
              <p className="text-sm text-gray-500">
                Last updated: {new Date(data.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div>{tabs.find((tab) => tab.id === activeTab)?.content}</div>
      </div>
    </div>
  );
}
