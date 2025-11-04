'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Metric } from '@/lib/calculate-metrics';
import { formatWeekRange, sortWeeksChronologically } from '@/lib/utils';

interface MetricChartProps {
  title: string;
  metrics: Metric[];
  type?: 'line' | 'bar';
  showPercentage?: boolean;
  formatValue?: (val: number) => string;
  unit?: string;
}

export default function MetricChart({
  title,
  metrics,
  type = 'line',
  showPercentage = false,
  formatValue,
  unit = '',
}: MetricChartProps) {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  // Prepare chart data - ensure chronological order
  const sortedMetrics = [...metrics].sort((a, b) => sortWeeksChronologically(a.week, b.week));
  
  const chartData = sortedMetrics.map((metric) => ({
    week: formatWeekRange(metric.week),
    weekStart: metric.week,
    value: metric.value,
    percentage: metric.percentage || 0,
    previousWeek: metric.previousWeek || 0,
    change: metric.change || 0,
  }));

  const commonChildren = (
    <>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis
        dataKey="week"
        angle={-45}
        textAnchor="end"
        height={80}
        interval={0}
        tick={{ fontSize: 12 }}
      />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip
        formatter={(value: number) => {
          if (formatValue) {
            return formatValue(value);
          }
          return `${value.toLocaleString()}${unit}`;
        }}
        labelFormatter={(label) => `Week: ${label}`}
      />
      <Legend />
    </>
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {type === 'line' ? (
          <LineChart data={chartData}>
            {commonChildren}
            {showPercentage ? (
              <>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Value"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Percentage (%)"
                  dot={{ r: 4 }}
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                name={unit || 'Value'}
                dot={{ r: 4 }}
              />
            )}
          </LineChart>
        ) : (
          <BarChart data={chartData}>
            {commonChildren}
            {showPercentage ? (
              <>
                <Bar dataKey="value" fill="#3b82f6" name="Value" />
                <Bar dataKey="percentage" fill="#10b981" name="Percentage (%)" />
              </>
            ) : (
              <Bar dataKey="value" fill="#3b82f6" name={unit || 'Value'} />
            )}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

