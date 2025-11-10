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
}: MetricSectionProps) {
  // Filter out invalid metrics and ensure we have valid data
  const validMetrics = metrics.filter((m) => m && typeof m.week === 'string' && (typeof m.value === 'number' || typeof m.value === 'string'));
  
  // Sort metrics chronologically by week (DD/MM/YYYY format)
  const sortedMetrics = [...validMetrics].sort((a, b) => sortWeeksChronologically(a.week, b.week));

  if (sortedMetrics.length === 0) {
    return (
      <div className="mb-8">
        <h4 className="text-lg font-semibold mb-4 text-gray-800">{title}</h4>
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
        <h4 className="text-lg font-semibold mb-4 text-gray-800">{title}</h4>
        <p className="text-gray-500">Not enough data available</p>
      </div>
    );
  }

  const renderMetricCard = (
    metric: Metric | undefined,
    weekKey: string,
    label: string,
    extraContent?: React.ReactNode,
    leadEmailList?: string[],
    clickLeadEmailList?: string[]
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
      leadEmailList={leadEmailList}
      clickLeadEmailList={clickLeadEmailList}
    />
  );

  return (
    <div className="mb-8">
      <h4 className="text-lg font-semibold mb-4 text-gray-800">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {renderMetricCard(
          lastWeekMetric,
          lastWeekKey,
          'Last Week',
          lastWeekMetric && (lastWeekMetric.links?.length || lastWeekMetric.deckBreakdown || lastWeekMetric.clickLeadEmails?.length)
            ? (
                <div className="mt-4 space-y-4">
                  {lastWeekMetric.links?.length ? (
                    <details className="group">
                      <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none">Links Clicked (Unique Leads)</summary>
                      <div className="max-h-48 overflow-y-auto mt-2 pr-2 border border-gray-200 rounded-md bg-gray-50">
                        <ul className="list-disc list-inside space-y-1 text-xs text-indigo-600">
                          {lastWeekMetric.links.map((link) => (
                            <li key={link} className="break-all">
                              {link}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  ) : null}

                  {lastWeekMetric.deckBreakdown && (
                    <div className="text-xs text-gray-600">
                      <p className="font-semibold text-gray-700 mb-1">Lead Magnet Breakdown</p>
                      {lastWeekMetric.deckBreakdown.primaryCount !== undefined || lastWeekMetric.deckBreakdown.redemptiveCount !== undefined ? (
                        <>
                          <p>Primary Deck Sessions: {lastWeekMetric.deckBreakdown.primaryCount?.toLocaleString() ?? 0}</p>
                          <p>Redemptive Deck Sessions: {lastWeekMetric.deckBreakdown.redemptiveCount?.toLocaleString() ?? 0}</p>
                        </>
                      ) : null}
                      {lastWeekMetric.deckBreakdown.primaryUniqueVisits !== undefined || lastWeekMetric.deckBreakdown.redemptiveUniqueVisits !== undefined ? (
                        <>
                          <p>Primary Unique Visitors: {lastWeekMetric.deckBreakdown.primaryUniqueVisits?.toLocaleString() ?? 0}</p>
                          <p>Redemptive Unique Visitors: {lastWeekMetric.deckBreakdown.redemptiveUniqueVisits?.toLocaleString() ?? 0}</p>
                        </>
                      ) : null}
                      {lastWeekMetric.deckBreakdown.primaryAverageDuration !== undefined || lastWeekMetric.deckBreakdown.redemptiveAverageDuration !== undefined ? (
                        <>
                          <p>
                            Primary Avg Session Duration:{' '}
                            {lastWeekMetric.deckBreakdown.primaryAverageDuration !== undefined
                              ? `${Math.round(lastWeekMetric.deckBreakdown.primaryAverageDuration)}s`
                              : 'N/A'}
                          </p>
                          <p>
                            Redemptive Avg Session Duration:{' '}
                            {lastWeekMetric.deckBreakdown.redemptiveAverageDuration !== undefined
                              ? `${Math.round(lastWeekMetric.deckBreakdown.redemptiveAverageDuration)}s`
                              : 'N/A'}
                          </p>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            : undefined,
          lastWeekMetric?.leadEmails,
          lastWeekMetric?.clickLeadEmails
        )}
        {twoWeeksKey &&
          renderMetricCard(
            twoWeeksMetric,
            twoWeeksKey,
            'Two Weeks Ago',
            twoWeeksMetric && (twoWeeksMetric.links?.length || twoWeeksMetric.deckBreakdown || twoWeeksMetric.clickLeadEmails?.length)
              ? (
                  <div className="mt-4 space-y-4">
                    {twoWeeksMetric.links?.length ? (
                      <details className="group">
                        <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none">Links Clicked (Unique Leads)</summary>
                        <div className="max-h-48 overflow-y-auto mt-2 pr-2 border border-gray-200 rounded-md bg-gray-50">
                          <ul className="list-disc list-inside space-y-1 text-xs text-indigo-600">
                            {twoWeeksMetric.links.map((link) => (
                              <li key={link} className="break-all">
                                {link}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    ) : null}

                    {twoWeeksMetric.deckBreakdown && (
                      <div className="text-xs text-gray-600">
                        <p className="font-semibold text-gray-700 mb-1">Lead Magnet Breakdown</p>
                        {twoWeeksMetric.deckBreakdown.primaryCount !== undefined || twoWeeksMetric.deckBreakdown.redemptiveCount !== undefined ? (
                          <>
                            <p>Primary Deck Sessions: {twoWeeksMetric.deckBreakdown.primaryCount?.toLocaleString() ?? 0}</p>
                            <p>Redemptive Deck Sessions: {twoWeeksMetric.deckBreakdown.redemptiveCount?.toLocaleString() ?? 0}</p>
                          </>
                        ) : null}
                        {twoWeeksMetric.deckBreakdown.primaryUniqueVisits !== undefined || twoWeeksMetric.deckBreakdown.redemptiveUniqueVisits !== undefined ? (
                          <>
                            <p>Primary Unique Visitors: {twoWeeksMetric.deckBreakdown.primaryUniqueVisits?.toLocaleString() ?? 0}</p>
                            <p>Redemptive Unique Visitors: {twoWeeksMetric.deckBreakdown.redemptiveUniqueVisits?.toLocaleString() ?? 0}</p>
                          </>
                        ) : null}
                        {twoWeeksMetric.deckBreakdown.primaryAverageDuration !== undefined || twoWeeksMetric.deckBreakdown.redemptiveAverageDuration !== undefined ? (
                          <>
                            <p>
                              Primary Avg Session Duration:{' '}
                              {twoWeeksMetric.deckBreakdown.primaryAverageDuration !== undefined
                                ? `${Math.round(twoWeeksMetric.deckBreakdown.primaryAverageDuration)}s`
                                : 'N/A'}
                            </p>
                            <p>
                              Redemptive Avg Session Duration:{' '}
                              {twoWeeksMetric.deckBreakdown.redemptiveAverageDuration !== undefined
                                ? `${Math.round(twoWeeksMetric.deckBreakdown.redemptiveAverageDuration)}s`
                                : 'N/A'}
                            </p>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                )
              : undefined,
            twoWeeksMetric?.leadEmails,
            twoWeeksMetric?.clickLeadEmails
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

