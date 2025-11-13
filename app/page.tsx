'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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

interface ClaudeAnalysis {
  weekRange?: string;
  marketingFunnel?: {
    highlight: string[];
    hypothesis: string[];
    nextAction: string[];
  };
  salesFunnel?: {
    highlight: string[];
    hypothesis: string[];
    nextAction: string[];
  };
  // Legacy fields for backward compatibility
  marketingHighlights?: string[];
  salesHighlights?: string[];
  risks?: string[];
  nextActions?: string[];
}

interface ClaudeReport {
  generatedAt: string;
  weekRange: string;
  marketingMetrics?: unknown;
  salesMetrics?: unknown;
  analysis: ClaudeAnalysis;
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

function formatWeekFromMetric(metric?: Metric) {
  return metric && typeof metric.week === 'string' ? formatWeekRange(metric.week) : undefined;
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

function combineEmailMetrics(sentMetrics: Metric[], interactionMetrics: Metric[]): Metric[] {
  const weekMap = new Map<string, Metric>();

  sentMetrics.forEach((metric) => {
    if (!metric || typeof metric.week !== 'string') return;
    const uniqueSent = typeof metric.uniqueEmails === 'number'
      ? metric.uniqueEmails
      : typeof metric.value === 'number'
      ? metric.value
      : 0;

    weekMap.set(metric.week, {
      week: metric.week,
      value: uniqueSent,
      uniqueEmails: uniqueSent,
      change: metric.change,
      previousWeek: metric.previousWeek,
    });
  });

  interactionMetrics.forEach((metric) => {
    if (!metric || typeof metric.week !== 'string') return;

    const existing = weekMap.get(metric.week) || {
      week: metric.week,
      value: 0,
    };

    const uniqueSent = typeof existing.uniqueEmails === 'number' ? existing.uniqueEmails : 0;
    const uniqueOpened = typeof metric.uniqueEmailsOpened === 'number' ? metric.uniqueEmailsOpened : undefined;
    const uniqueClicked = typeof metric.uniqueEmailsClicked === 'number' ? metric.uniqueEmailsClicked : undefined;

    weekMap.set(metric.week, {
      ...existing,
      value: uniqueSent,
      uniqueEmails: uniqueSent,
      uniqueEmailsOpened: uniqueOpened,
      uniqueEmailsClicked: uniqueClicked,
      links: metric.links,
      clickLinksByEmail: metric.clickLinksByEmail,
      leadsOpenedMultiple: metric.leadsOpenedMultiple,
    });
  });

  const combined = Array.from(weekMap.values()).map((metric) => ({
    ...metric,
    value: typeof metric.uniqueEmails === 'number' ? metric.uniqueEmails : 0,
  }));

  combined.sort((a, b) => sortWeeksChronologically(a.week, b.week));

  return combined;
}

function trimMetricsBeforeFirstSend(metrics: Metric[]): Metric[] {
  const firstIndex = metrics.findIndex((metric) => (metric.uniqueEmails ?? 0) > 0);
  if (firstIndex === -1) {
    return [];
  }

  return metrics.map((metric, index) => {
    if (index < firstIndex) {
      return {
        ...metric,
        value: 0,
        uniqueEmails: undefined,
        uniqueEmailsOpened: undefined,
        uniqueEmailsClicked: undefined,
      };
    }
    return metric;
  });
}

function recalculateMetricChanges(metrics: Metric[]): Metric[] {
  return metrics.map((metric, index) => {
    const currentValue = typeof metric.uniqueEmails === 'number' ? metric.uniqueEmails : 0;

    if (index === 0) {
      return {
        ...metric,
        previousWeek: undefined,
        change: 0,
        value: currentValue,
      };
    }

    const prevMetric = metrics[index - 1];
    const prevValue = typeof prevMetric.uniqueEmails === 'number' ? prevMetric.uniqueEmails : 0;

    return {
      ...metric,
      previousWeek: prevValue,
      change: prevValue > 0 ? ((currentValue - prevValue) / prevValue) * 100 : 0,
      value: currentValue,
    };
  });
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FunnelData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [activeMarketingTab, setActiveMarketingTab] = useState<MarketingTabId>('emailOutreach');
  const [claudeReport, setClaudeReport] = useState<ClaudeReport | null>(null);
  const [inactiveLeads, setInactiveLeads] = useState<{ email: string; linkedInUrl: string | null }[]>([]);
  const [inactiveLeadsLoading, setInactiveLeadsLoading] = useState(false);
  const isRegeneratingRef = useRef(false);
  const lastCheckedWeekRef = useRef<string | undefined>(undefined);

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

  const outreachCombinedMetrics = useMemo(
    () => {
      const combined = combineEmailMetrics(mktOutreachMetrics, outreachEmailInteractionMetrics);
      const trimmed = trimMetricsBeforeFirstSend(combined);
      return recalculateMetricChanges(trimmed);
    },
    [mktOutreachMetrics, outreachEmailInteractionMetrics]
  );

  const nurtureCombinedMetrics = useMemo(
    () => {
      const combined = combineEmailMetrics(nurtureEmailMetrics, nurtureEmailInteractionMetrics);
      return recalculateMetricChanges(combined);
    },
    [nurtureEmailMetrics, nurtureEmailInteractionMetrics]
  );

  const marketingSummaryCards = useMemo<SummaryCard[]>(() => {
    const cards: SummaryCard[] = [];

    const outreachCombinedContext = getRecentMetricsForSummary(outreachCombinedMetrics);
    const outreachMetric = outreachCombinedContext.lastWeek;
    const outreachPrevious = outreachCombinedContext.previous;

    if (outreachMetric) {
      const sent = typeof outreachMetric.uniqueEmails === 'number' ? outreachMetric.uniqueEmails : 0;
      const opened = typeof outreachMetric.uniqueEmailsOpened === 'number' ? outreachMetric.uniqueEmailsOpened : 0;
      const clicked = typeof outreachMetric.uniqueEmailsClicked === 'number' ? outreachMetric.uniqueEmailsClicked : 0;
      const prevSent = outreachPrevious && typeof outreachPrevious.uniqueEmails === 'number' ? outreachPrevious.uniqueEmails : 0;
      const prevOpened = outreachPrevious && typeof outreachPrevious.uniqueEmailsOpened === 'number' ? outreachPrevious.uniqueEmailsOpened : 0;
      const prevClicked = outreachPrevious && typeof outreachPrevious.uniqueEmailsClicked === 'number' ? outreachPrevious.uniqueEmailsClicked : 0;
      const changeSent = prevSent > 0 ? ((sent - prevSent) / prevSent) * 100 : null;
      const changeOpened = prevOpened > 0 ? ((opened - prevOpened) / prevOpened) * 100 : null;
      const changeClicked = prevClicked > 0 ? ((clicked - prevClicked) / prevClicked) * 100 : null;

      cards.push({
        key: 'outreach-unique-sent',
        title: 'Outreach Unique Leads Reached',
        valueLabel: sent.toLocaleString(),
        change: changeSent ?? undefined,
        weekLabel: formatWeekFromMetric(outreachMetric),
      });
      cards.push({
        key: 'outreach-unique-opened',
        title: 'Outreach Unique Leads Opened',
        valueLabel: opened.toLocaleString(),
        change: changeOpened ?? undefined,
        weekLabel: formatWeekFromMetric(outreachMetric),
      });
      cards.push({
        key: 'outreach-unique-clicked',
        title: 'Outreach Unique Leads Clicked',
        valueLabel: clicked.toLocaleString(),
        change: changeClicked ?? undefined,
        weekLabel: formatWeekFromMetric(outreachMetric),
      });
    }

    const nurtureCombinedContext = getRecentMetricsForSummary(nurtureCombinedMetrics);
    const nurtureMetric = nurtureCombinedContext.lastWeek;
    const nurturePrevious = nurtureCombinedContext.previous;

    if (nurtureMetric) {
      const sent = typeof nurtureMetric.uniqueEmails === 'number' ? nurtureMetric.uniqueEmails : 0;
      const opened = typeof nurtureMetric.uniqueEmailsOpened === 'number' ? nurtureMetric.uniqueEmailsOpened : 0;
      const clicked = typeof nurtureMetric.uniqueEmailsClicked === 'number' ? nurtureMetric.uniqueEmailsClicked : 0;
      const prevSent = nurturePrevious && typeof nurturePrevious.uniqueEmails === 'number' ? nurturePrevious.uniqueEmails : 0;
      const prevOpened = nurturePrevious && typeof nurturePrevious.uniqueEmailsOpened === 'number' ? nurturePrevious.uniqueEmailsOpened : 0;
      const prevClicked = nurturePrevious && typeof nurturePrevious.uniqueEmailsClicked === 'number' ? nurturePrevious.uniqueEmailsClicked : 0;
      const changeSent = prevSent > 0 ? ((sent - prevSent) / prevSent) * 100 : null;
      const changeOpened = prevOpened > 0 ? ((opened - prevOpened) / prevOpened) * 100 : null;
      const changeClicked = prevClicked > 0 ? ((clicked - prevClicked) / prevClicked) * 100 : null;

      cards.push({
        key: 'nurture-unique-sent',
        title: 'Nurture Unique Leads Reached',
        valueLabel: sent.toLocaleString(),
        change: changeSent ?? undefined,
        weekLabel: formatWeekFromMetric(nurtureMetric),
      });
      cards.push({
        key: 'nurture-unique-opened',
        title: 'Nurture Unique Leads Opened',
        valueLabel: opened.toLocaleString(),
        change: changeOpened ?? undefined,
        weekLabel: formatWeekFromMetric(nurtureMetric),
      });
      cards.push({
        key: 'nurture-unique-clicked',
        title: 'Nurture Unique Leads Clicked',
        valueLabel: clicked.toLocaleString(),
        change: changeClicked ?? undefined,
        weekLabel: formatWeekFromMetric(nurtureMetric),
      });
    }

    const leadMagnetSubmissionContext = getRecentMetricsForSummary(leadMagnetMetrics.submissions);
    const leadMagnetSubmissionMetric = leadMagnetSubmissionContext.lastWeek;
    const leadMagnetSubmissionPrev = leadMagnetSubmissionContext.previous;
    if (leadMagnetSubmissionMetric) {
      const submissions = typeof leadMagnetSubmissionMetric.uniqueLeads === 'number' ? leadMagnetSubmissionMetric.uniqueLeads : 0;
      const prevSubmissions = leadMagnetSubmissionPrev && typeof leadMagnetSubmissionPrev.uniqueLeads === 'number' ? leadMagnetSubmissionPrev.uniqueLeads : 0;
      const changeSubmissions = prevSubmissions > 0 ? ((submissions - prevSubmissions) / prevSubmissions) * 100 : null;
      cards.push({
        key: 'lead-magnet-unique-submissions',
        title: 'Lead Magnet Unique Lead Submissions',
        valueLabel: submissions.toLocaleString(),
        change: changeSubmissions ?? undefined,
        weekLabel: formatWeekFromMetric(leadMagnetSubmissionMetric),
      });
    }

    const leadMagnetVisitsContext = getRecentMetricsForSummary(leadMagnetMetrics.uniqueVisits);
    const leadMagnetVisitsMetric = leadMagnetVisitsContext.lastWeek;
    const leadMagnetVisitsPrev = leadMagnetVisitsContext.previous;
    if (leadMagnetVisitsMetric) {
      const visits = typeof leadMagnetVisitsMetric.value === 'number' ? leadMagnetVisitsMetric.value : 0;
      const prevVisits = leadMagnetVisitsPrev && typeof leadMagnetVisitsPrev.value === 'number' ? leadMagnetVisitsPrev.value : 0;
      const changeVisits = prevVisits > 0 ? ((visits - prevVisits) / prevVisits) * 100 : null;
      cards.push({
        key: 'lead-magnet-unique-visits',
        title: 'Lead Magnet Unique Visitors',
        valueLabel: visits.toLocaleString(),
        change: changeVisits ?? undefined,
        weekLabel: formatWeekFromMetric(leadMagnetVisitsMetric),
      });
    }

    const leadMagnetDurationContext = getRecentMetricsForSummary(leadMagnetMetrics.avgDuration);
    const leadMagnetDurationMetric = leadMagnetDurationContext.lastWeek;
    const leadMagnetDurationPrev = leadMagnetDurationContext.previous;
    if (leadMagnetDurationMetric) {
      const highInterest = typeof leadMagnetDurationMetric.highInterestCount === 'number' ? leadMagnetDurationMetric.highInterestCount : 0;
      const bounce = typeof leadMagnetDurationMetric.bounceCount === 'number' ? leadMagnetDurationMetric.bounceCount : 0;
      const prevHighInterest = leadMagnetDurationPrev && typeof leadMagnetDurationPrev.highInterestCount === 'number' ? leadMagnetDurationPrev.highInterestCount : 0;
      const prevBounce = leadMagnetDurationPrev && typeof leadMagnetDurationPrev.bounceCount === 'number' ? leadMagnetDurationPrev.bounceCount : 0;
      const changeHighInterest = prevHighInterest > 0 ? ((highInterest - prevHighInterest) / prevHighInterest) * 100 : null;
      const changeBounce = prevBounce > 0 ? ((bounce - prevBounce) / prevBounce) * 100 : null;
      cards.push({
        key: 'lead-magnet-high-interest',
        title: 'Lead Magnet Leads > 20s',
        valueLabel: highInterest.toLocaleString(),
        change: changeHighInterest ?? undefined,
        weekLabel: formatWeekFromMetric(leadMagnetDurationMetric),
      });
      cards.push({
        key: 'lead-magnet-bounce',
        title: 'Lead Magnet Leads < 10s',
        valueLabel: bounce.toLocaleString(),
        change: changeBounce ?? undefined,
        weekLabel: formatWeekFromMetric(leadMagnetDurationMetric),
      });
    }

    return cards;
  }, [outreachCombinedMetrics, nurtureCombinedMetrics, leadMagnetMetrics.submissions, leadMagnetMetrics.uniqueVisits, leadMagnetMetrics.avgDuration]);

  const salesSummaryCards = useMemo<SummaryCard[]>(() => {
    const cards: SummaryCard[] = [];

    const ffDurationContext = getRecentMetricsForSummary(salesFunnelMetrics.avgDuration);
    const ffDurationMetric = ffDurationContext.lastWeek;
    const ffDurationPrev = ffDurationContext.previous;

    if (ffDurationMetric) {
      const highInterest = typeof ffDurationMetric.highInterestCount === 'number' ? ffDurationMetric.highInterestCount : 0;
      const bounce = typeof ffDurationMetric.bounceCount === 'number' ? ffDurationMetric.bounceCount : 0;
      const prevHighInterest = ffDurationPrev && typeof ffDurationPrev.highInterestCount === 'number' ? ffDurationPrev.highInterestCount : 0;
      const prevBounce = ffDurationPrev && typeof ffDurationPrev.bounceCount === 'number' ? ffDurationPrev.bounceCount : 0;
      const changeHighInterest = prevHighInterest > 0 ? ((highInterest - prevHighInterest) / prevHighInterest) * 100 : null;
      const changeBounce = prevBounce > 0 ? ((bounce - prevBounce) / prevBounce) * 100 : null;

      cards.push({
        key: 'ff-high-interest',
        title: 'FF Leads > 20s',
        valueLabel: highInterest.toLocaleString(),
        change: changeHighInterest ?? undefined,
        weekLabel: formatWeekFromMetric(ffDurationMetric),
      });
      cards.push({
        key: 'ff-bounce',
        title: 'FF Leads < 10s',
        valueLabel: bounce.toLocaleString(),
        change: changeBounce ?? undefined,
        weekLabel: formatWeekFromMetric(ffDurationMetric),
      });
    }

    const ffUniqueVisitsContext = getRecentMetricsForSummary(salesFunnelMetrics.uniqueVisits);
    const ffUniqueVisitsMetric = ffUniqueVisitsContext.lastWeek;
    const ffUniqueVisitsPrev = ffUniqueVisitsContext.previous;
    if (ffUniqueVisitsMetric) {
      const uniqueVisits = typeof ffUniqueVisitsMetric.value === 'number' ? ffUniqueVisitsMetric.value : 0;
      const prevUniqueVisits = ffUniqueVisitsPrev && typeof ffUniqueVisitsPrev.value === 'number' ? ffUniqueVisitsPrev.value : 0;
      const changeUniqueVisits = prevUniqueVisits > 0 ? ((uniqueVisits - prevUniqueVisits) / prevUniqueVisits) * 100 : null;
      cards.push({
        key: 'ff-unique-visits',
        title: 'FF Unique Visitors',
        valueLabel: uniqueVisits.toLocaleString(),
        change: changeUniqueVisits ?? undefined,
        weekLabel: formatWeekFromMetric(ffUniqueVisitsMetric),
      });
    }

    const bookClickContext = getRecentMetricsForSummary(salesFunnelMetrics.clicks);
    const bookClickMetric = bookClickContext.lastWeek;
    const bookClickPrev = bookClickContext.previous;
    if (bookClickMetric) {
      const uniqueClickLeads = Array.isArray(bookClickMetric.clickLeadEmails) ? bookClickMetric.clickLeadEmails.length : 0;
      const prevUniqueClickLeads = bookClickPrev && Array.isArray(bookClickPrev.clickLeadEmails) ? bookClickPrev.clickLeadEmails.length : 0;
      const changeUniqueClickLeads = prevUniqueClickLeads > 0 ? ((uniqueClickLeads - prevUniqueClickLeads) / prevUniqueClickLeads) * 100 : null;
      cards.push({
        key: 'book-call-unique-clicks',
        title: 'Leads Clicking Book a Call',
        valueLabel: uniqueClickLeads.toLocaleString(),
        change: changeUniqueClickLeads ?? undefined,
        weekLabel: formatWeekFromMetric(bookClickMetric),
      });
    }

    return cards;
  }, [
    salesFunnelMetrics.avgDuration,
    salesFunnelMetrics.uniqueVisits,
    salesFunnelMetrics.clicks,
  ]);

  const lastCompletedWeekInfo = useMemo(() => {
    const allSeries = [
      ...outreachCombinedMetrics,
      ...nurtureCombinedMetrics,
      ...(leadMagnetMetrics.submissions ?? []),
      ...(salesFunnelMetrics.uniqueVisits ?? []),
      ...(dmMetrics ?? []),
    ];
    const { lastWeek } = getRecentMetricsForSummary(allSeries);
    if (lastWeek && typeof lastWeek.week === 'string') {
      return {
        label: formatWeekRange(lastWeek.week),
        weekStart: lastWeek.week,
        weekDate: parseWeekStart(lastWeek.week),
      };
    }
    return { label: undefined, weekStart: undefined, weekDate: undefined };
  }, [
    outreachCombinedMetrics,
    nurtureCombinedMetrics,
    leadMagnetMetrics.submissions,
    salesFunnelMetrics.uniqueVisits,
    dmMetrics,
  ]);

  useEffect(() => {
    async function fetchClaudeReport() {
      try {
        const res = await fetch('/api/claude-report');
        if (!res.ok) {
          throw new Error('Failed to fetch Claude report');
        }
        const json = (await res.json()) as ClaudeReport;
        setClaudeReport(json);
        lastCheckedWeekRef.current = json.weekRange;
      } catch (error) {
        console.warn('Unable to load Claude report:', error);
        setClaudeReport(null);
      }
    }

    fetchClaudeReport();
  }, []);

  useEffect(() => {
    async function ensureFreshReport() {
      if (!lastCompletedWeekInfo.label || !lastCompletedWeekInfo.weekDate) {
        return;
      }

      // If we already checked this week, don't check again
      if (lastCheckedWeekRef.current === lastCompletedWeekInfo.label) {
        return;
      }

      // If report already matches, mark as checked and return
      if (claudeReport?.weekRange === lastCompletedWeekInfo.label) {
        lastCheckedWeekRef.current = lastCompletedWeekInfo.label;
        return;
      }

      // If already regenerating, don't start another regeneration
      if (isRegeneratingRef.current) {
        return;
      }

      isRegeneratingRef.current = true;
      try {
        const res = await fetch('/api/claude-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ regenerate: true }),
        });

        if (!res.ok) {
          throw new Error('Failed to regenerate Claude report');
        }

        const json = (await res.json()) as ClaudeReport;
        setClaudeReport(json);
        lastCheckedWeekRef.current = json.weekRange;
      } catch (error) {
        console.warn('Unable to automatically regenerate Claude report:', error);
      } finally {
        isRegeneratingRef.current = false;
      }
    }

    ensureFreshReport();
  }, [lastCompletedWeekInfo.label, lastCompletedWeekInfo.weekDate, claudeReport?.weekRange]);

  // Fetch inactive leads (visited but didn't submit) for last week
  useEffect(() => {
    async function fetchInactiveLeads() {
      if (!lastCompletedWeekInfo.weekStart) return;
      
      setInactiveLeadsLoading(true);
      try {
        // Format date as DD/MM/YYYY for the API
        const weekDate = parseWeekStart(lastCompletedWeekInfo.weekStart);
        const formattedDate = `${String(weekDate.getDate()).padStart(2, '0')}/${String(weekDate.getMonth() + 1).padStart(2, '0')}/${weekDate.getFullYear()}`;
        
        const response = await fetch(`/api/lead-magnet-inactive?from=${formattedDate}`);
        if (!response.ok) {
          throw new Error('Failed to fetch inactive leads');
        }
        const result = await response.json();
        setInactiveLeads(result.leads || []);
      } catch (err) {
        console.error('Error fetching inactive leads:', err);
        setInactiveLeads([]);
      } finally {
        setInactiveLeadsLoading(false);
      }
    }

    fetchInactiveLeads();
  }, [lastCompletedWeekInfo.weekStart]);

  const linkedinSummaryCards = useMemo<SummaryCard[]>(() => {
    const cards: SummaryCard[] = [];

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
            <details className="border border-gray-200 rounded-lg">
              <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none px-4 py-3">
                About Outreach
              </summary>
              <div className="px-4 pb-4">
                    <InfoBox title="About Outreach">
                      <p className="mb-2">
                    This section tracks unique outreach engagement metrics:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                    <li><strong>Unique Leads Sent:</strong> Number of distinct leads who received an outreach email in the week.</li>
                    <li><strong>Unique Leads Opened:</strong> Distinct leads who opened at least one outreach email that week.</li>
                    <li><strong>Unique Leads Clicked:</strong> Distinct leads who clicked any outreach link that week. Clicked links per lead are shown in the card.</li>
                    <li><strong>Trend Chart:</strong> Visualizes unique leads sent, opened, and clicked per week.</li>
                      </ul>
                    </InfoBox>
                    </div>
            </details>

            <div className="space-y-6">
                      <MetricSection
                title="Outreach Emails - Unique Leads"
                metrics={outreachCombinedMetrics}
                        showPercentage={false}
                unit="leads"
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
            <details className="border border-gray-200 rounded-lg">
              <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none px-4 py-3">
                About Nurture
              </summary>
              <div className="px-4 pb-4">
                    <InfoBox title="About Nurture">
                      <p className="mb-2">
                    This section concentrates on unique nurture engagement metrics:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                    <li><strong>Unique Leads Sent:</strong> Distinct leads who received nurture emails during the week.</li>
                    <li><strong>Unique Leads Opened:</strong> Distinct leads who opened nurture emails.</li>
                    <li><strong>Unique Leads Clicked:</strong> Distinct leads who clicked nurture links (all links listed in the card).</li>
                    <li><strong>Trend Chart:</strong> Shows unique leads sent, opened, and clicked week-over-week.</li>
                      </ul>
                    </InfoBox>
                    </div>
            </details>

            <div className="space-y-6">
                      <MetricSection
                title="Nurture Emails - Unique Leads"
                metrics={nurtureCombinedMetrics}
                        showPercentage={false}
                unit="leads"
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
            <details className="border border-gray-200 rounded-lg">
              <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none px-4 py-3">
                About New Organic Leads
              </summary>
              <div className="px-4 pb-4">
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
              </div>
            </details>

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
            <details className="border border-gray-200 rounded-lg">
              <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none px-4 py-3">
                About Lead Magnet Performance
              </summary>
              <div className="px-4 pb-4">
                <InfoBox title="About Lead Magnet Performance">
                      <p className="mb-2">
                        This section tracks the performance of your lead magnet landing pages (deck analysis tools):
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Landed:</strong> Total number of unique sessions on the lead magnet landing page (each <code className="bg-gray-100 px-1 rounded">SessionID</code> = 1 session)</li>
                        <li><strong>Unique Lead Visitors:</strong> Number of unique mediums (where medium contains &quot;rec&quot;) that visited the page. Multiple sessions can share the same medium, so this counts unique lead sources. If medium doesn&apos;t contain &quot;rec&quot;, it&apos;s not counted as a unique lead visitor.</li>
                    <li><strong>Session Engagement Duration:</strong> Highlights leads staying &gt; 20 seconds (engaged) and &lt; 10 seconds (immediate bounce), with lead lists for each.</li>
                        <li><strong>Deck Submission:</strong> Total number of pitch decks submitted for analysis. Also shows unique leads who submitted (one lead can submit multiple decks). This is the conversion metric from landing to submission.</li>
                        <li><strong>Analysis Result Email Interactions:</strong> Opens and clicks on lead magnet deck analysis report emails, filtered by <code className="bg-gray-100 px-1 rounded">mailgun_tags</code> containing &quot;analysis result&quot; or &quot;analysis&quot;. Shows total opens, clicks, and unique leads who opened/clicked.</li>
                        <li>Charts display the latest 12 weeks of data for better trend visualization</li>
                        <li>Track conversion rate from landed to submission to optimize the funnel</li>
                      </ul>
                    </InfoBox>
              </div>
            </details>

            <div className="space-y-6">
              <details className="border border-gray-200 rounded-lg p-4">
                <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none">Landed</summary>
                <div className="mt-4">
                      <MetricSection
                        title="Landed"
                        metrics={leadMagnetMetrics.landed}
                        formatValue={(val) => `${Math.round(val)}`}
                        unit="sessions"
                        showChart={true}
                        chartType="line"
                    hideTitle
                      />
                    </div>
              </details>
                      <MetricSection
                        title="Unique Lead Visitors"
                        metrics={leadMagnetMetrics.uniqueVisits}
                        formatValue={(val) => `${Math.round(val)}`}
                        unit="visitors"
                        showChart={true}
                        chartType="line"
                      />
                      <MetricSection
                title="Session Engagement Duration"
                        metrics={leadMagnetMetrics.avgDuration}
                formatValue={(val) => `${Math.round(val).toLocaleString()}`}
                unit="leads"
                showChart={false}
                hideTitle={false}
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
      outreachCombinedMetrics,
      nurtureCombinedMetrics,
      bookACallLeadsMetrics,
      analysisResultEmailInteractionMetrics,
    ]
  );

  const linkedinDmContent = useMemo<ReactNode>(() => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-800">DM Outreach</h3>
        <details className="border border-gray-200 rounded-lg">
          <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none px-4 py-3">
            About DM Outreach
          </summary>
          <div className="px-4 pb-4">
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
          </div>
        </details>

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
              <details className="border border-gray-200 rounded-lg">
                <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none px-4 py-3">
                  How These Metrics Are Calculated
                </summary>
                <div className="px-4 pb-4">
                  <InfoBox title="How These Metrics Are Calculated">
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li>
                        <strong>Outreach Unique Leads Reached:</strong> Distinct leads who received an outreach email last week.
                      </li>
                      <li>
                        <strong>Outreach Unique Leads Opened:</strong> Distinct leads who opened an outreach email (same week).
                      </li>
                      <li>
                        <strong>Outreach Unique Leads Clicked:</strong> Distinct leads who clicked any outreach link last week.
                      </li>
                      <li>
                        <strong>Nurture Unique Leads Reached:</strong> Distinct leads who received nurture emails last week.
                      </li>
                      <li>
                        <strong>Nurture Unique Leads Opened:</strong> Distinct nurture recipients who opened at least one email.
                      </li>
                      <li>
                        <strong>Nurture Unique Leads Clicked:</strong> Distinct nurture recipients who clicked any link.
                      </li>
                      <li>
                        <strong>Lead Magnet Unique Lead Submissions:</strong> Distinct leads who submitted decks during the week.
                      </li>
                      <li>
                        <strong>Lead Magnet Unique Visitors:</strong> Distinct leads who landed on the lead magnet pages (medium contains “rec”).
                      </li>
                      <li>
                        <strong>Lead Magnet Engagement:</strong> Leads spending &gt; 20 seconds (engaged) and &lt; 10 seconds (bounce) on lead magnet pages.
                      </li>
                      <li>
                        <strong>FF Unique Visitors:</strong> Distinct leads who landed on the FF site (medium contains “rec”).
                      </li>
                      <li>
                        <strong>Leads Clicking Book a Call:</strong> Distinct leads who clicked the Book a Call button last week.
                      </li>
                      <li>
                        <strong>FF Landing Engagement:</strong> Leads spending &gt; 20 seconds (engaged) and &lt; 10 seconds (bounce) on the FF landing page.
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
                        Week-over-week changes compare to the prior completed week; current calendar week is excluded.
                      </li>
                    </ul>
                  </InfoBox>
                </div>
              </details>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  Marketing Snapshot{lastCompletedWeekInfo.label ? ` (${lastCompletedWeekInfo.label})` : ''}
                </h3>
                <span className="text-xs text-gray-500">Excludes current calendar week</span>
              </div>
              {claudeReport && claudeReport.analysis && (claudeReport.analysis.marketingFunnel || claudeReport.analysis.marketingHighlights) && (
                <div className="bg-white border border-indigo-200 rounded-lg p-6 mb-6 shadow-sm">
                  <h4 className="text-sm font-semibold text-indigo-700 mb-4">Claude Marketing Funnel Analysis</h4>
                  {claudeReport.analysis.marketingFunnel ? (
                    <div className="space-y-4 text-sm text-gray-700">
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-2">Highlight</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {(claudeReport.analysis.marketingFunnel.highlight ?? []).map((item: string, idx: number) => (
                            <li key={`marketing-highlight-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-2">Hypothesis</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {(claudeReport.analysis.marketingFunnel.hypothesis ?? []).map((item: string, idx: number) => (
                            <li key={`marketing-hypothesis-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-2">Next Action</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {(claudeReport.analysis.marketingFunnel.nextAction ?? []).map((item: string, idx: number) => (
                            <li key={`marketing-action-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    // Legacy format fallback
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-1">Marketing Highlights</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {(claudeReport.analysis.marketingHighlights ?? []).map((item: string, idx: number) => (
                            <li key={`marketing-highlight-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-1">Risks</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {(claudeReport.analysis.risks ?? []).map((item: string, idx: number) => (
                            <li key={`marketing-risk-${idx}`}>{item}</li>
                          ))}
                        </ul>
                        <h5 className="font-semibold text-gray-800 mt-3 mb-1">Next Actions</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {(claudeReport.analysis.nextActions ?? []).map((item: string, idx: number) => (
                            <li key={`marketing-action-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                <h3 className="text-xl font-semibold text-gray-800">
                  Sales Snapshot{lastCompletedWeekInfo.label ? ` (${lastCompletedWeekInfo.label})` : ''}
                </h3>
                <span className="text-xs text-gray-500">Excludes current calendar week</span>
              </div>
              {claudeReport && claudeReport.analysis && (claudeReport.analysis.salesFunnel || claudeReport.analysis.salesHighlights) && (
                <div className="bg-white border border-green-200 rounded-lg p-6 mb-6 shadow-sm">
                  <h4 className="text-sm font-semibold text-green-700 mb-4">Claude Sales Funnel Analysis</h4>
                  {claudeReport.analysis.salesFunnel ? (
                    <div className="space-y-4 text-sm text-gray-700">
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-2">Highlight</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {(claudeReport.analysis.salesFunnel.highlight ?? []).map((item: string, idx: number) => (
                            <li key={`sales-highlight-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-2">Hypothesis</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {(claudeReport.analysis.salesFunnel.hypothesis ?? []).map((item: string, idx: number) => (
                            <li key={`sales-hypothesis-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-2">Next Action</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {(claudeReport.analysis.salesFunnel.nextAction ?? []).map((item: string, idx: number) => (
                            <li key={`sales-action-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    // Legacy format fallback
                    <ul className="list-disc list-inside mt-3 space-y-1">
                      {(claudeReport.analysis.salesHighlights ?? []).map((item: string, idx: number) => (
                        <li key={`sales-highlight-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
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
                <h3 className="text-xl font-semibold text-gray-800">
                  LinkedIn DM Snapshot{lastCompletedWeekInfo.label ? ` (${lastCompletedWeekInfo.label})` : ''}
                </h3>
              </div>
              {linkedinSummaryCards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {linkedinSummaryCards.map(renderSummaryCard)}
                </div>
              ) : (
                <p className="text-gray-500">No LinkedIn DM data available.</p>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  Lead Magnet Inactive Leads{lastCompletedWeekInfo.label ? ` (${lastCompletedWeekInfo.label})` : ''}
                </h3>
                <span className="text-xs text-gray-500">Visited but didn't submit</span>
              </div>
              <details className="border border-gray-200 rounded-lg mb-4">
                <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none px-4 py-3">
                  About Inactive Leads
                </summary>
                <div className="px-4 pb-4">
                  <InfoBox title="About Inactive Leads">
                    <p className="text-sm text-gray-700">
                      This list shows leads who visited either the primary or redemptive lead magnet sites but have never submitted a deck analysis. 
                      These are potential leads to re-engage with follow-up outreach.
                    </p>
                  </InfoBox>
                </div>
              </details>
              {inactiveLeadsLoading ? (
                <div className="text-center py-8 text-gray-500">Loading inactive leads...</div>
              ) : inactiveLeads.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            LinkedIn
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {inactiveLeads.map((lead, index) => (
                          <tr key={`inactive-lead-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {lead.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {lead.linkedInUrl ? (
                                <a
                                  href={lead.linkedInUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 hover:underline"
                                >
                                  View Profile
                                </a>
                              ) : (
                                <span className="text-gray-400">Not available</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Total: <span className="font-semibold">{inactiveLeads.length}</span> leads
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No inactive leads found for this week.</p>
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
            <details className="border border-gray-200 rounded-lg">
              <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none px-4 py-3">
                About FF Landing Page
              </summary>
              <div className="px-4 pb-4">
            <InfoBox title="About FF Landing Page">
              <p className="mb-2">
                This section tracks the main Fundraising Flywheel landing page performance:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Landed:</strong> Total number of unique sessions on the main landing page (each <code className="bg-gray-100 px-1 rounded">SessionID</code> = 1 session)</li>
                <li><strong>Unique Lead Visitors:</strong> Number of unique mediums (where medium contains &quot;rec&quot;) that visited the page. Multiple sessions can share the same medium, so this counts unique lead sources. If medium doesn&apos;t contain &quot;rec&quot;, it&apos;s not counted as a unique lead visitor.</li>
                    <li><strong>Session Engagement Duration:</strong> Highlights leads staying &gt; 20 seconds (engaged) and &lt; 10 seconds (immediate bounce), including who they are.</li>
                <li>This is the entry point for your sales funnel - visitors come here to learn about your services</li>
                <li>Charts display the latest 12 weeks of data for better trend visualization</li>
                <li>Monitor trends to understand traffic quality and optimize page content</li>
              </ul>
            </InfoBox>
              </div>
            </details>
            <details className="border border-gray-200 rounded-lg p-4">
              <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none">Landed</summary>
              <div className="mt-4">
            <MetricSection
              title="Landed"
              metrics={salesFunnelMetrics.landed}
              formatValue={(val) => `${Math.round(val)}`}
              unit="sessions"
              showChart={true}
              chartType="line"
                  hideTitle
            />
              </div>
            </details>
            <div className="mb-6 mt-6">
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
              title="Session Engagement Duration"
              metrics={salesFunnelMetrics.avgDuration}
              formatValue={(val) => `${Math.round(val).toLocaleString()}`}
              unit="leads"
              showChart={false}
            />
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Book a Call</h3>
            <details className="border border-gray-200 rounded-lg">
              <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none px-4 py-3">
                About Book a Call
              </summary>
              <div className="px-4 pb-4">
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
              </div>
            </details>
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
      lastCompletedWeekInfo,
      claudeReport,
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
