'use client';

import { formatWeekRange } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  week: string;
  value: number | string;
  percentage?: number;
  change?: number;
  unit?: string;
  formatValue?: (val: number) => string;
}

export default function MetricCard({
  title,
  week,
  value,
  percentage,
  change,
  unit = '',
  formatValue,
}: MetricCardProps) {
  // Ensure week is a string
  const weekStr = typeof week === 'string' ? week : String(week || '');
  
  // Ensure value is a number or string
  let numericValue: number;
  if (typeof value === 'number') {
    numericValue = value;
  } else if (typeof value === 'string') {
    numericValue = parseFloat(value) || 0;
  } else {
    // Handle object or other types
    numericValue = 0;
  }
  
  const formattedValue = formatValue
    ? formatValue(numericValue)
    : numericValue.toLocaleString();

  const changeColor = change
    ? change > 0
      ? 'text-green-600'
      : change < 0
      ? 'text-red-600'
      : 'text-gray-600'
    : '';

  const changeIcon = change ? (change > 0 ? '↑' : change < 0 ? '↓' : '→') : '';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-xs text-gray-500 mb-4">{formatWeekRange(weekStr)}</p>
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900">
            {formattedValue}
            {unit && <span className="text-lg ml-1 text-gray-700">{unit}</span>}
          </p>
          {percentage !== undefined && (
            <p className="text-sm text-gray-600 mt-1 font-medium">
              {percentage.toFixed(1)}% Lead Replied
            </p>
          )}
        </div>
        {change !== undefined && (
          <div className={`text-sm font-semibold ${changeColor}`}>
            {changeIcon} {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}

