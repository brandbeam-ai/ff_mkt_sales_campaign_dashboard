'use client';

import MetricCard from './MetricCard';
import MetricChart from './MetricChart';
import { formatWeekRange, sortWeeksChronologically } from '@/lib/utils';
import { Metric } from '@/lib/calculate-metrics';

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

  // Get the latest week or use currentWeek
  // The last item in the sorted array is the most recent week
  const latestWeek = currentWeek || (sortedMetrics.length > 0 ? sortedMetrics[sortedMetrics.length - 1].week : '');
  const latestMetric = sortedMetrics.find((m) => m.week === latestWeek) || sortedMetrics[sortedMetrics.length - 1];

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
                {sortedMetrics.length > 1 && (() => {
                  // Get the previous week metric (second-to-last in chronologically sorted array)
                  const previousMetric = sortedMetrics[sortedMetrics.length - 2];
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

