'use client';

import MetricCard from './MetricCard';
import MetricChart from './MetricChart';
import { formatWeekRange, sortWeeksChronologically, parseWeekStart } from '@/lib/utils';
import { Metric } from '@/lib/calculate-metrics';

// Helper function to get current week start (Sunday) in DD/MM/YYYY format
// This matches the "Week start of report date" field format from Airtable
// Week starts on Sunday (day 0)
function getCurrentWeekStart(): string {
  const today = new Date();
  // Calculate week start (Sunday = day 0)
  // If today is Sunday, weekStart = today
  // If today is Monday (day 1), weekStart = today - 1 day
  // If today is Tuesday (day 2), weekStart = today - 2 days, etc.
  const day = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = today.getDate() - day;
  const weekStartDate = new Date(today);
  weekStartDate.setDate(diff);
  
  // Format as DD/MM/YYYY to match "Week start of report date" field format
  const dayStr = String(weekStartDate.getDate()).padStart(2, '0');
  const monthStr = String(weekStartDate.getMonth() + 1).padStart(2, '0');
  const yearStr = weekStartDate.getFullYear();
  
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

  // Determine the actual current week based on today's date
  // Uses the same logic as "Week start of report date" field: Sunday start, DD/MM/YYYY format
  // This ensures "Current Week" is based on the actual current date, not the latest week in data
  const actualCurrentWeek = currentWeek || getCurrentWeekStart();
  const actualCurrentWeekDate = parseWeekStart(actualCurrentWeek);
  
  // Find the most recent week from "Week start of report date" that is <= actual current week
  // This ensures we don't show future weeks as "Current Week"
  // metric.week contains the "Week start of report date" value (DD/MM/YYYY format, Sunday start)
  let latestMetric: Metric | undefined;
  let latestWeek = '';
  
  for (let i = sortedMetrics.length - 1; i >= 0; i--) {
    const metric = sortedMetrics[i];
    try {
      // Parse the "Week start of report date" field (DD/MM/YYYY format)
      const metricWeekDate = parseWeekStart(metric.week);
      // Only consider weeks that are <= actual current week (not future weeks)
      if (metricWeekDate <= actualCurrentWeekDate) {
        latestMetric = metric;
        latestWeek = metric.week; // This is the "Week start of report date" value
        break;
      }
    } catch {
      // If parsing fails, skip this metric
      continue;
    }
  }
  
  // Fallback: if no week <= current week found, use the earliest week in data
  if (!latestMetric) {
    latestMetric = sortedMetrics[0];
    latestWeek = sortedMetrics[0].week;
  }

  if (!latestMetric || !latestMetric.week || (typeof latestMetric.value !== 'number' && typeof latestMetric.value !== 'string')) {
    return (
      <div className="mb-8">
        <h4 className="text-lg font-semibold mb-4 text-gray-800">{title}</h4>
        <p className="text-gray-500">No valid data available</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h4 className="text-lg font-semibold mb-4 text-gray-800">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title={title === 'New DMs Conversation Start' ? 'New DMs Conversation Start - Current Week' : `${title} - Current Week`}
          week={String(latestMetric.week || '')}
          value={(() => {
            const currentValue = latestMetric.value;
            if (typeof currentValue === 'number') {
              return currentValue;
            } else if (typeof currentValue === 'string') {
              return parseFloat(currentValue) || 0;
            }
            return 0;
          })()}
          percentage={showPercentage && typeof latestMetric.percentage === 'number' ? latestMetric.percentage : undefined}
          percentageLabel={percentageLabel}
          change={typeof latestMetric.change === 'number' ? latestMetric.change : undefined}
          unit={unit}
          formatValue={formatValue}
          uniqueEmails={typeof latestMetric.uniqueEmails === 'number' ? latestMetric.uniqueEmails : undefined}
          avgInteractionsPerLead={typeof latestMetric.avgInteractionsPerLead === 'number' ? latestMetric.avgInteractionsPerLead : undefined}
                  clicked={typeof latestMetric.clicked === 'number' ? latestMetric.clicked : undefined}
                  uniqueEmailsOpened={typeof latestMetric.uniqueEmailsOpened === 'number' ? latestMetric.uniqueEmailsOpened : undefined}
                  uniqueEmailsClicked={typeof latestMetric.uniqueEmailsClicked === 'number' ? latestMetric.uniqueEmailsClicked : undefined}
                  uniqueLeads={typeof latestMetric.uniqueLeads === 'number' ? latestMetric.uniqueLeads : undefined}
                />
                {(() => {
                  // Find the previous week: the week immediately before the current week in the sorted data
                  // We need to find the metric that comes chronologically before latestMetric in the sorted array
                  let previousMetric: Metric | undefined;
                  
                  if (latestMetric && latestWeek) {
                    try {
                      // Find the index of the current week metric in the sorted array
                      const currentWeekIndex = sortedMetrics.findIndex((m) => m.week === latestWeek);
                      
                      // If we found the current week and there's a metric before it, use that
                      if (currentWeekIndex > 0) {
                        previousMetric = sortedMetrics[currentWeekIndex - 1];
                      } else if (currentWeekIndex === -1) {
                        // If current week not found in array (shouldn't happen), find the most recent week < current week
                        const currentWeekDate = parseWeekStart(latestWeek);
                        for (let i = sortedMetrics.length - 1; i >= 0; i--) {
                          const metric = sortedMetrics[i];
                          try {
                            const metricWeekDate = parseWeekStart(metric.week);
                            if (metricWeekDate < currentWeekDate) {
                              previousMetric = metric;
                              break;
                            }
                          } catch {
                            continue;
                          }
                        }
                      }
                    } catch {
                      // If parsing fails, fallback to second-to-last in array
                      if (sortedMetrics.length > 1) {
                        previousMetric = sortedMetrics[sortedMetrics.length - 2];
                      }
                    }
                  }
                  
                  if (!previousMetric && sortedMetrics.length > 1) {
                    // Final fallback: use second-to-last in sorted array
                    previousMetric = sortedMetrics[sortedMetrics.length - 2];
                  }
                  
                  if (!previousMetric) {
                    return null;
                  }
                  
                  return (
                    <MetricCard
                      title={title === 'New DMs Conversation Start' ? 'New DMs Conversation Start - Previous Week' : `${title} - Previous Week`}
                      week={String(previousMetric.week || '')}
                      value={(() => {
                        const prevValue = previousMetric.value;
                        if (typeof prevValue === 'number') {
                          return prevValue;
                        } else if (typeof prevValue === 'string') {
                          return parseFloat(prevValue) || 0;
                        }
                        return 0;
                      })()}
                      percentage={showPercentage && typeof previousMetric.percentage === 'number' ? previousMetric.percentage : undefined}
                      percentageLabel={percentageLabel}
                      unit={unit}
                      formatValue={formatValue}
                      uniqueEmails={typeof previousMetric.uniqueEmails === 'number' ? previousMetric.uniqueEmails : undefined}
                      avgInteractionsPerLead={typeof previousMetric.avgInteractionsPerLead === 'number' ? previousMetric.avgInteractionsPerLead : undefined}
                      clicked={typeof previousMetric.clicked === 'number' ? previousMetric.clicked : undefined}
                      uniqueEmailsOpened={typeof previousMetric.uniqueEmailsOpened === 'number' ? previousMetric.uniqueEmailsOpened : undefined}
                      uniqueEmailsClicked={typeof previousMetric.uniqueEmailsClicked === 'number' ? previousMetric.uniqueEmailsClicked : undefined}
                      uniqueLeads={typeof previousMetric.uniqueLeads === 'number' ? previousMetric.uniqueLeads : undefined}
                    />
                  );
                })()}
      </div>
      {showChart && sortedMetrics.length > 0 && (
        <div className="mb-6">
          <MetricChart
            title={`${title} - Growth Over Time`}
            metrics={sortedMetrics}
            type={chartType}
            showPercentage={showPercentage}
            formatValue={formatValue}
            unit={unit}
          />
        </div>
      )}
    </div>
  );
}

