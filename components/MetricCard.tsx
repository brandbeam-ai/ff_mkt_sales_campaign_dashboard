'use client';

import { formatWeekRange } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  week: string;
  value: number | string;
  percentage?: number;
  percentageLabel?: string;
  change?: number;
  unit?: string;
  formatValue?: (val: number) => string;
  uniqueEmails?: number;
  avgInteractionsPerLead?: number;
  clicked?: number;
  uniqueEmailsOpened?: number;
  uniqueEmailsClicked?: number;
  uniqueLeads?: number;
  extraContent?: React.ReactNode;
  leadEmailList?: string[];
  clickLeadEmailList?: string[];
}

export default function MetricCard({
  title,
  week,
  value,
  percentage,
  percentageLabel,
  change,
  unit = '',
  formatValue,
  uniqueEmails,
  avgInteractionsPerLead,
  clicked,
  uniqueEmailsOpened,
  uniqueEmailsClicked,
  uniqueLeads,
  extraContent,
  leadEmailList,
  clickLeadEmailList,
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
          {percentage !== undefined && percentageLabel !== undefined && (
            <p className="text-sm text-gray-600 mt-1 font-medium">
              {percentage.toFixed(1)}% {percentageLabel}
            </p>
          )}
          {uniqueEmails !== undefined && uniqueEmailsOpened === undefined && uniqueEmailsClicked === undefined && (
            <p className="text-xs text-gray-500 mt-1">
              Unique leads: {uniqueEmails}
            </p>
          )}
          {clicked !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              Clicks: {clicked}
            </p>
          )}
          {uniqueEmailsOpened !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              Unique leads opened: {uniqueEmailsOpened}
            </p>
          )}
          {uniqueEmailsClicked !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              Unique leads clicked: {uniqueEmailsClicked}
            </p>
          )}
          {uniqueLeads !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              Unique leads: {uniqueLeads}
            </p>
          )}
        </div>
        {change !== undefined && (
          <div className={`text-sm font-semibold ${changeColor}`}>
            {changeIcon} {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      {extraContent && <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">{extraContent}</div>}
      {leadEmailList && leadEmailList.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
            Unique Lead Emails
          </summary>
          <div className="max-h-48 overflow-y-auto mt-2 pr-2 border border-gray-200 rounded-md bg-gray-50">
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
              {leadEmailList.map((email) => (
                <li key={email} className="break-all">
                  {email}
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
      {clickLeadEmailList && clickLeadEmailList.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
            Leads Who Clicked
          </summary>
          <div className="max-h-48 overflow-y-auto mt-2 pr-2 border border-gray-200 rounded-md bg-gray-50">
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
              {clickLeadEmailList.map((email) => (
                <li key={email} className="break-all">
                  {email}
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}

