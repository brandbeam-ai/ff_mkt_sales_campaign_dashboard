'use client';

import MetricCard from './MetricCard';
import MetricChart from './MetricChart';
import { sortWeeksChronologically, parseWeekStart } from '@/lib/utils';
import { Metric } from '@/lib/calculate-metrics';
import React from 'react';

// Helper function to get current week start (Sunday) in DD/MM/YYYY format
// This matches the "Week start of report date" field format from Airtable
// Week starts on Sunday (day 0)
function getCurrentWeekStart(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day;
  const weekStartDate = new Date(today);
  weekStartDate.setDate(diff);

  const dayStr = String(weekStartDate.getDate()).padStart(2, '0');
  const monthStr = String(weekStartDate.getMonth() + 1).padStart(2, '0');
  const yearStr = weekStartDate.getFullYear();

  return `${dayStr}/${monthStr}/${yearStr}`;
}

function formatDateToWeekString(date: Date): string {
  const dayStr = String(date.getDate()).padStart(2, '0');
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');
  const yearStr = date.getFullYear();
  return `${dayStr}/${monthStr}/${yearStr}`;
}

interface MetricSectionProps {
  title: string;
  metrics: Metric[];
  currentWeek?: string;
  formatValue?: (val: number) => string;
  showPercentage?: boolean;
  percentageLabel?: string;
  unit?: string;
  showChart?: boolean;
  chartType?: 'line' | 'bar';
  hideTitle?: boolean;
}

export default function MetricSection({
  title,
  metrics,
  currentWeek,
  formatValue,
  showPercentage = false,
  percentageLabel,
  unit = '',
  showChart = true,
  chartType = 'line',
  hideTitle = false,
}: MetricSectionProps) {
  // Filter out invalid metrics and ensure we have valid data
  const validMetrics = metrics.filter((m) => m && typeof m.week === 'string' && (typeof m.value === 'number' || typeof m.value === 'string'));
  
  // Sort metrics chronologically by week (DD/MM/YYYY format)
  const sortedMetrics = [...validMetrics].sort((a, b) => sortWeeksChronologically(a.week, b.week));

  if (sortedMetrics.length === 0) {
    return (
      <div className="mb-8">
        {!hideTitle && <h4 className="text-lg font-semibold mb-4 text-gray-800">{title}</h4>}
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const actualCurrentWeek = currentWeek || getCurrentWeekStart();
  let actualCurrentWeekDate: Date | null = null;
  try {
    actualCurrentWeekDate = parseWeekStart(actualCurrentWeek);
  } catch {
    actualCurrentWeekDate = null;
  }

  let lastWeekKey: string | undefined;
  let twoWeeksKey: string | undefined;
  const eightWeekTargets: string[] = [];

  if (actualCurrentWeekDate) {
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    for (let i = 8; i >= 1; i--) {
      const date = new Date(actualCurrentWeekDate.getTime() - i * WEEK_MS);
      eightWeekTargets.push(formatDateToWeekString(date));
    }
    const lastWeekDate = new Date(actualCurrentWeekDate.getTime() - WEEK_MS);
    const twoWeeksDate = new Date(actualCurrentWeekDate.getTime() - 2 * WEEK_MS);
    lastWeekKey = formatDateToWeekString(lastWeekDate);
    twoWeeksKey = formatDateToWeekString(twoWeeksDate);
  }

  if (eightWeekTargets.length === 0) {
    const uniqueWeeks = Array.from(new Set(sortedMetrics.map((metric) => metric.week))).sort((a, b) => sortWeeksChronologically(a, b));
    eightWeekTargets.push(...uniqueWeeks.slice(-8));
  }

  if (!lastWeekKey && eightWeekTargets.length > 0) {
    lastWeekKey = eightWeekTargets[eightWeekTargets.length - 1];
  }
  if (!twoWeeksKey && eightWeekTargets.length > 1) {
    twoWeeksKey = eightWeekTargets[eightWeekTargets.length - 2];
  }

  const lastWeekMetric = lastWeekKey
    ? sortedMetrics.find((metric) => metric.week === lastWeekKey)
    : undefined;
  const twoWeeksMetric = twoWeeksKey
    ? sortedMetrics.find((metric) => metric.week === twoWeeksKey)
    : undefined;

  const targetWeeks = eightWeekTargets.length > 0 ? eightWeekTargets : [lastWeekKey].filter((week): week is string => Boolean(week));

  if (!lastWeekKey) {
    return (
      <div className="mb-8">
        {!hideTitle && <h4 className="text-lg font-semibold mb-4 text-gray-800">{title}</h4>}
        <p className="text-gray-500">Not enough data available</p>
      </div>
    );
  }

  const renderMetricCard = (
    metric: Metric | undefined,
    weekKey: string,
    label: string,
    extraContent?: React.ReactNode,
    leadSessions?: Record<string, number>,
    leadEmailList?: string[],
    clickLeadEmailList?: string[],
    highInterestLeads?: string[],
    bounceLeads?: string[],
    highInterestCount?: number,
    bounceCount?: number,
    leadCountLabel?: string
  ) => (
    <MetricCard
      title={`${title} - ${label}`}
      week={weekKey}
      value={(() => {
        if (!metric) return 0;
        const metricValue = metric.value;
        if (typeof metricValue === 'number') return metricValue;
        if (typeof metricValue === 'string') return parseFloat(metricValue) || 0;
        return 0;
      })()}
      percentage={metric && typeof metric.percentage === 'number' ? metric.percentage : undefined}
      percentageLabel={percentageLabel}
      change={metric && typeof metric.change === 'number' ? metric.change : undefined}
      unit={unit}
      formatValue={formatValue}
      uniqueEmails={metric && typeof metric.uniqueEmails === 'number' ? metric.uniqueEmails : undefined}
      avgInteractionsPerLead={metric && typeof metric.avgInteractionsPerLead === 'number' ? metric.avgInteractionsPerLead : undefined}
      clicked={metric && typeof metric.clicked === 'number' ? metric.clicked : undefined}
      uniqueEmailsOpened={metric && typeof metric.uniqueEmailsOpened === 'number' ? metric.uniqueEmailsOpened : undefined}
      uniqueEmailsClicked={metric && typeof metric.uniqueEmailsClicked === 'number' ? metric.uniqueEmailsClicked : undefined}
      uniqueLeads={metric && typeof metric.uniqueLeads === 'number' ? metric.uniqueLeads : undefined}
      extraContent={extraContent}
      leadSessions={leadSessions}
      leadEmailList={leadEmailList}
      clickLeadEmailList={clickLeadEmailList}
      highInterestCount={highInterestCount}
      bounceCount={bounceCount}
      highInterestLeads={highInterestLeads}
      bounceLeads={bounceLeads}
      leadCountLabel={leadCountLabel}
    />
  );

  const renderLinkClicksByEmail = (metric?: Metric) => {
    if (!metric?.clickLinksByEmail) {
      return null;
    }

    const entries = Object.entries(metric.clickLinksByEmail).filter(([, links]) => links.length > 0);
    if (entries.length === 0) {
      return null;
    }

    return (
      <details className="group">
        <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
          Links Clicked by Lead
        </summary>
        <div className="max-h-56 overflow-y-auto mt-2 pr-2 border border-gray-200 rounded-md bg-gray-50">
          <ul className="space-y-3 text-xs text-gray-700">
            {entries.map(([email, links]) => (
              <li key={email} className="wrap-break-word">
                <p className="font-semibold text-gray-800 mb-1">{email}</p>
                <ul className="list-disc list-inside space-y-1 text-indigo-600">
                  {links.map((link) => (
                    <li key={`${email}-${link}`} className="break-all">
                      <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </details>
    );
  };

  const renderDeckBreakdown = (metric?: Metric) => {
    if (!metric?.deckBreakdown) return null;
    const breakdown = metric.deckBreakdown;
    const hasSessions = breakdown.primaryCount !== undefined || breakdown.redemptiveCount !== undefined;
    const hasUniqueVisits = breakdown.primaryUniqueVisits !== undefined || breakdown.redemptiveUniqueVisits !== undefined;
    const hasDurations = breakdown.primaryAverageDuration !== undefined || breakdown.redemptiveAverageDuration !== undefined;

    if (!hasSessions && !hasUniqueVisits && !hasDurations) {
      return null;
    }

    return (
      <div className="text-xs text-gray-600">
        <p className="font-semibold text-gray-700 mb-1">Lead Magnet Breakdown</p>
        {hasSessions && (
          <>
            <p>Primary Deck Sessions: {breakdown.primaryCount?.toLocaleString() ?? 0}</p>
            <p>Redemptive Deck Sessions: {breakdown.redemptiveCount?.toLocaleString() ?? 0}</p>
          </>
        )}
        {hasUniqueVisits && (
          <>
            <p>Primary Unique Visitors: {breakdown.primaryUniqueVisits?.toLocaleString() ?? 0}</p>
            <p>Redemptive Unique Visitors: {breakdown.redemptiveUniqueVisits?.toLocaleString() ?? 0}</p>
          </>
        )}
        {hasDurations && (
          <>
            <p>
              Primary Avg Session Duration:{' '}
              {breakdown.primaryAverageDuration !== undefined
                ? `${Math.round(breakdown.primaryAverageDuration)}s`
                : 'N/A'}
            </p>
            <p>
              Redemptive Avg Session Duration:{' '}
              {breakdown.redemptiveAverageDuration !== undefined
                ? `${Math.round(breakdown.redemptiveAverageDuration)}s`
                : 'N/A'}
            </p>
          </>
        )}
      </div>
    );
  };

  const buildExtraContent = (metric?: Metric) => {
    const sections: React.ReactNode[] = [];
    const linkClicks = renderLinkClicksByEmail(metric);
    const breakdown = renderDeckBreakdown(metric);

    if (linkClicks) sections.push(<div key="links">{linkClicks}</div>);
    if (breakdown) sections.push(<div key="breakdown">{breakdown}</div>);

    if (sections.length === 0) {
      return undefined;
    }

    return <div className="space-y-4">{sections}</div>;
  };

  return (
    <div className="mb-8">
      {!hideTitle && <h4 className="text-lg font-semibold mb-4 text-gray-800">{title}</h4>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {renderMetricCard(
          lastWeekMetric,
          lastWeekKey,
          'Last Week',
          buildExtraContent(lastWeekMetric),
          lastWeekMetric?.leadSessionCounts,
          lastWeekMetric?.leadEmails,
          lastWeekMetric?.clickLeadEmails,
          lastWeekMetric?.highInterestLeads,
          lastWeekMetric?.bounceLeads,
          lastWeekMetric?.highInterestCount,
          lastWeekMetric?.bounceCount,
          lastWeekMetric?.leadCountLabel
        )}
        {twoWeeksKey &&
          renderMetricCard(
            twoWeeksMetric,
            twoWeeksKey,
            'Two Weeks Ago',
            buildExtraContent(twoWeeksMetric),
            twoWeeksMetric?.leadSessionCounts,
            twoWeeksMetric?.leadEmails,
            twoWeeksMetric?.clickLeadEmails,
            twoWeeksMetric?.highInterestLeads,
            twoWeeksMetric?.bounceLeads,
            twoWeeksMetric?.highInterestCount,
            twoWeeksMetric?.bounceCount,
            twoWeeksMetric?.leadCountLabel
          )}
      </div>

      {showChart && (
        <div className="mb-6">
          <MetricChart
            title={`${title} - Last Two Weeks`}
            metrics={sortedMetrics}
            type={chartType}
            showPercentage={showPercentage}
            formatValue={formatValue}
            unit={unit}
            targetWeeks={targetWeeks}
          />
        </div>
      )}
    </div>
  );
}

