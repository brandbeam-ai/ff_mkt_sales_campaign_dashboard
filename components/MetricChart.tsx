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
import { formatWeekRange, sortWeeksChronologically, parseWeekStart } from '@/lib/utils';

// Helper function to get current week start (Sunday) in DD/MM/YYYY format
// This matches the "Week start of report date" field format from Airtable
function getCurrentWeekStart(): string {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
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

interface MetricChartProps {
  title: string;
  metrics: Metric[];
  type?: 'line' | 'bar';
  showPercentage?: boolean;
  formatValue?: (val: number) => string;
  unit?: string;
  targetWeeks?: string[];
}

export default function MetricChart({
  title,
  metrics,
  type = 'line',
  showPercentage = false,
  formatValue,
  unit = '',
  targetWeeks,
}: MetricChartProps) {
  if ((!metrics || metrics.length === 0) && (!targetWeeks || targetWeeks.length === 0)) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const sortedMetrics = [...metrics].sort((a, b) => sortWeeksChronologically(a.week, b.week));
  
  const actualCurrentWeek = getCurrentWeekStart();
  let actualCurrentWeekDate: Date | null = null;
  try {
    actualCurrentWeekDate = parseWeekStart(actualCurrentWeek);
  } catch {
    actualCurrentWeekDate = null;
  }

  let filteredMetrics = actualCurrentWeekDate
    ? sortedMetrics.filter((metric) => {
    try {
      const metricWeekDate = parseWeekStart(metric.week);
          return metricWeekDate < actualCurrentWeekDate!;
    } catch {
      return false;
    }
      })
    : sortedMetrics;

  if (filteredMetrics.length === 0) {
    filteredMetrics = sortedMetrics;
  }

  let weeksToPlot: string[];
  if (targetWeeks && targetWeeks.length > 0) {
    weeksToPlot = targetWeeks;
  } else if (actualCurrentWeekDate) {
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    weeksToPlot = [];
    for (let i = 8; i >= 1; i--) {
      const date = new Date(actualCurrentWeekDate.getTime() - i * WEEK_MS);
      weeksToPlot.push(formatDateToWeekString(date));
    }
  } else {
    weeksToPlot = filteredMetrics.slice(-8).map((metric) => metric.week);
  }

  weeksToPlot = Array.from(new Set(weeksToPlot));
  
  const chartData = weeksToPlot
    .map((week) => {
      const metric =
        filteredMetrics.find((item) => item.week === week) || sortedMetrics.find((item) => item.week === week);

      if (!metric) {
        return {
          week: formatWeekRange(week),
          weekStart: week,
          value: 0,
          percentage: 0,
          clicked: 0,
          uniqueEmails: undefined,
          uniqueEmailsOpened: undefined,
          uniqueEmailsClicked: undefined,
          uniqueLeads: undefined,
          previousWeek: 0,
          change: 0,
        };
      }

      const value = typeof metric.value === 'number' ? metric.value : parseFloat(String(metric.value)) || 0;
      const uniqueEmails = typeof metric.uniqueEmails === 'number' && metric.uniqueEmails > 0 ? metric.uniqueEmails : undefined;
      const uniqueEmailsOpened = typeof metric.uniqueEmailsOpened === 'number' && metric.uniqueEmailsOpened > 0
        ? metric.uniqueEmailsOpened
        : undefined;
      const uniqueEmailsClicked = typeof metric.uniqueEmailsClicked === 'number' && metric.uniqueEmailsClicked > 0
        ? metric.uniqueEmailsClicked
        : undefined;

      return {
        week: formatWeekRange(week),
        weekStart: week,
        value,
    percentage: metric.percentage || 0,
    clicked: metric.clicked || 0,
        uniqueEmails: uniqueEmails ?? null,
        uniqueEmailsOpened: uniqueEmailsOpened ?? null,
        uniqueEmailsClicked: uniqueEmailsClicked ?? null,
    uniqueLeads: metric.uniqueLeads || 0,
    previousWeek: metric.previousWeek || 0,
    change: metric.change || 0,
      };
    })
    .filter((data, index, arr) => index === arr.findIndex((d) => d.weekStart === data.weekStart));

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const hasClickedData = chartData.some((metric) => typeof metric.clicked === 'number' && metric.clicked > 0);
  const hasUniqueSeries = chartData.some(
    (metric) =>
      typeof metric.uniqueEmails === 'number' ||
      typeof metric.uniqueEmailsOpened === 'number' ||
      typeof metric.uniqueEmailsClicked === 'number'
  );

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
        contentStyle={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
        labelStyle={{
          color: '#111827',
          fontWeight: 'bold',
          fontSize: '14px',
          marginBottom: '8px',
        }}
        itemStyle={{
          color: '#374151',
          fontSize: '13px',
          padding: '2px 0',
        }}
        formatter={(value: number, name: string, props?: { payload?: { uniqueEmailsOpened?: number; uniqueEmailsClicked?: number } }) => {
          const payload = props?.payload || {};
          
          if (formatValue && typeof value === 'number') {
            return formatValue(value);
          }

          if (typeof value !== 'number') {
            return 'N/A';
          }
          
          // For Opens and Clicks, show both total and unique counts
          if (name === 'Opens' || name === unit || name === 'opens') {
            const uniqueOpened = payload.uniqueEmailsOpened || 0;
            return (
              <div style={{ color: '#3b82f6', fontWeight: '500' }}>
                <div>Total: {value.toLocaleString()} {unit}</div>
                {uniqueOpened > 0 && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    Unique: {uniqueOpened.toLocaleString()}
                  </div>
                )}
              </div>
            );
          }
          
          if (name === 'Clicks' || name === 'clicks') {
            const uniqueClicked = payload.uniqueEmailsClicked || 0;
            return (
              <div style={{ color: '#ef4444', fontWeight: '500' }}>
                <div>Total: {value.toLocaleString()} clicks</div>
                {uniqueClicked > 0 && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    Unique: {uniqueClicked.toLocaleString()}
                  </div>
                )}
              </div>
            );
          }
          
          return `${value.toLocaleString()}${unit}`;
        }}
        labelFormatter={(label) => `Week: ${label}`}
        content={({ active, payload, label }) => {
          if (active && payload && payload.length > 0) {
            const data = payload[0].payload;

            if (hasUniqueSeries) {
              return (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <div style={{ color: '#111827', fontWeight: 'bold', fontSize: '14px', marginBottom: '10px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                    Week: {label}
                  </div>
                  <div style={{ color: '#4f46e5', fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>
                    Unique sent: {typeof data.uniqueEmails === 'number' ? data.uniqueEmails.toLocaleString() : 'N/A'}
                  </div>
                  <div style={{ color: '#3b82f6', fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>
                    Unique opened: {typeof data.uniqueEmailsOpened === 'number' ? data.uniqueEmailsOpened.toLocaleString() : 'N/A'}
                  </div>
                  <div style={{ color: '#ef4444', fontWeight: '600', fontSize: '13px' }}>
                    Unique clicked: {typeof data.uniqueEmailsClicked === 'number' ? data.uniqueEmailsClicked.toLocaleString() : 'N/A'}
                  </div>
                </div>
              );
            }
            
            return (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ color: '#111827', fontWeight: 'bold', fontSize: '14px', marginBottom: '10px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                  Week: {label}
                </div>
                {hasClickedData ? (
                  <>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ color: '#3b82f6', fontWeight: '600', fontSize: '13px' }}>
                        Opens: {data.value?.toLocaleString() || 0} {unit}
                      </div>
                      {data.uniqueEmailsOpened > 0 && (
                        <div style={{ color: '#6b7280', fontSize: '12px', marginLeft: '12px', marginTop: '2px' }}>
                          Unique leads opened: {data.uniqueEmailsOpened.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ color: '#ef4444', fontWeight: '600', fontSize: '13px' }}>
                        Clicks: {data.clicked?.toLocaleString() || 0} clicks
                      </div>
                      {data.uniqueEmailsClicked > 0 && (
                        <div style={{ color: '#6b7280', fontSize: '12px', marginLeft: '12px', marginTop: '2px' }}>
                          Unique leads clicked: {data.uniqueEmailsClicked.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ color: '#374151', fontSize: '13px', fontWeight: '600', marginBottom: (data.uniqueEmails > 0 || data.uniqueLeads > 0) ? '4px' : '0' }}>
                      {unit || 'Value'}: {data.value?.toLocaleString() || 0}
                    </div>
                    {data.uniqueEmails > 0 && (
                      <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
                        Unique leads: {data.uniqueEmails.toLocaleString()}
                      </div>
                    )}
                    {data.uniqueLeads > 0 && (
                      <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
                        Unique leads: {data.uniqueLeads.toLocaleString()}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          }
          return null;
        }}
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
            ) : hasUniqueSeries ? (
              <>
                <Line
                  type="monotone"
                  dataKey="uniqueEmails"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  name="Unique Sent"
                  dot={{ r: 4 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="uniqueEmailsOpened"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Unique Opened"
                  dot={{ r: 4 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="uniqueEmailsClicked"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Unique Clicked"
                  dot={{ r: 4 }}
                  connectNulls
                />
              </>
            ) : hasClickedData ? (
              <>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name={unit || 'Opens'}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="clicked"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Clicks"
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
            ) : hasUniqueSeries ? (
              <>
                <Bar dataKey="uniqueEmails" fill="#4f46e5" name="Unique Sent" />
                <Bar dataKey="uniqueEmailsOpened" fill="#3b82f6" name="Unique Opened" />
                <Bar dataKey="uniqueEmailsClicked" fill="#ef4444" name="Unique Clicked" />
              </>
            ) : hasClickedData ? (
              <>
                <Bar dataKey="value" fill="#3b82f6" name={unit || 'Opens'} />
                <Bar dataKey="clicked" fill="#ef4444" name="Clicks" />
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

