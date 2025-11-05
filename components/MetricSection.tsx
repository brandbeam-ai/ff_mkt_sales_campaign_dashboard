'use client';

import MetricCard from './MetricCard';
import MetricChart from './MetricChart';
import { formatWeekRange } from '@/lib/utils';
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
  
  if (validMetrics.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  // Get the latest week or use currentWeek
  const latestWeek = currentWeek || (validMetrics.length > 0 ? validMetrics[validMetrics.length - 1].week : '');
  const latestMetric = validMetrics.find((m) => m.week === latestWeek) || validMetrics[validMetrics.length - 1];

  if (!latestMetric || !latestMetric.week || (typeof latestMetric.value !== 'number' && typeof latestMetric.value !== 'string')) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>
        <p className="text-gray-500">No valid data available</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>
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
                {validMetrics.length > 1 && (
                  <MetricCard
                    title={title === 'New DMs Conversation Start' ? 'New DMs Conversation Start - Previous Week' : `${title} - Previous Week`}
                    week={String(validMetrics[validMetrics.length - 2].week || '')}
                    value={(() => {
                      const prevValue = validMetrics[validMetrics.length - 2].value;
                      if (typeof prevValue === 'number') {
                        return prevValue;
                      } else if (typeof prevValue === 'string') {
                        return parseFloat(prevValue) || 0;
                      }
                      return 0;
                    })()}
                    percentage={showPercentage && typeof validMetrics[validMetrics.length - 2].percentage === 'number' ? validMetrics[validMetrics.length - 2].percentage : undefined}
                    percentageLabel={percentageLabel}
                    unit={unit}
                    formatValue={formatValue}
                            uniqueEmails={typeof validMetrics[validMetrics.length - 2].uniqueEmails === 'number' ? validMetrics[validMetrics.length - 2].uniqueEmails : undefined}
                            avgInteractionsPerLead={typeof validMetrics[validMetrics.length - 2].avgInteractionsPerLead === 'number' ? validMetrics[validMetrics.length - 2].avgInteractionsPerLead : undefined}
                            clicked={typeof validMetrics[validMetrics.length - 2].clicked === 'number' ? validMetrics[validMetrics.length - 2].clicked : undefined}
                            uniqueEmailsOpened={typeof validMetrics[validMetrics.length - 2].uniqueEmailsOpened === 'number' ? validMetrics[validMetrics.length - 2].uniqueEmailsOpened : undefined}
                            uniqueEmailsClicked={typeof validMetrics[validMetrics.length - 2].uniqueEmailsClicked === 'number' ? validMetrics[validMetrics.length - 2].uniqueEmailsClicked : undefined}
                            uniqueLeads={typeof validMetrics[validMetrics.length - 2].uniqueLeads === 'number' ? validMetrics[validMetrics.length - 2].uniqueLeads : undefined}
                          />
                )}
      </div>
      {showChart && validMetrics.length > 0 && (
        <div className="mb-6">
          <MetricChart
            title={`${title} - Growth Over Time`}
            metrics={validMetrics}
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

