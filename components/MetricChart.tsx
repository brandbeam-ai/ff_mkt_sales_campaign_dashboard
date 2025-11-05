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
  
  // Limit to latest 12 weeks for better visualization
  const latest12Weeks = sortedMetrics.slice(-12);
  
  const chartData = latest12Weeks.map((metric) => ({
    week: formatWeekRange(metric.week),
    weekStart: metric.week,
    value: metric.value,
    percentage: metric.percentage || 0,
    clicked: metric.clicked || 0,
    uniqueEmails: metric.uniqueEmails || 0,
    uniqueEmailsOpened: metric.uniqueEmailsOpened || 0,
    uniqueEmailsClicked: metric.uniqueEmailsClicked || 0,
    uniqueLeads: metric.uniqueLeads || 0,
    previousWeek: metric.previousWeek || 0,
    change: metric.change || 0,
  }));

  // Check if any metric has clicked data (using latest12Weeks for consistency)
  const hasClickedData = latest12Weeks.some((metric) => typeof metric.clicked === 'number' && metric.clicked > 0);

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
          
          if (formatValue) {
            return formatValue(value);
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
                {hasClickedData && (
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
                )}
                {!hasClickedData && (
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

