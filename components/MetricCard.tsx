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
  leadSessions?: Record<string, number>;
  clickLeadEmailList?: string[];
  highInterestCount?: number;
  bounceCount?: number;
  highInterestLeads?: string[];
  bounceLeads?: string[];
  leadCountLabel?: string;
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
  leadSessions,
  clickLeadEmailList,
  highInterestCount,
  bounceCount,
  highInterestLeads,
  bounceLeads,
  leadCountLabel,
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

  const sessionEntries = leadSessions
    ? Object.entries(leadSessions)
        .filter(([email, count]) => Boolean(email) && count > 0)
        .sort((a, b) => {
          if (b[1] === a[1]) {
            return a[0].localeCompare(b[0]);
          }
          return b[1] - a[1];
        })
    : [];
  const hasLeadSessions = sessionEntries.length > 0;

  const leadCountLabelText = leadCountLabel ?? 'Sessions';

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
          {clicked !== undefined && uniqueEmailsClicked === undefined && (
            <p className="text-xs text-gray-500 mt-1">
              Clicks: {clicked}
            </p>
          )}
          {avgInteractionsPerLead !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              Avg interactions per lead: {avgInteractionsPerLead.toFixed(1)}
            </p>
          )}
          {(uniqueEmails !== undefined || uniqueEmailsOpened !== undefined || uniqueEmailsClicked !== undefined || uniqueLeads !== undefined) && (
            <div className="mt-2 space-y-1 text-xs text-gray-500">
              {uniqueEmails !== undefined && (
                <p>Unique leads (sent): {uniqueEmails.toLocaleString()}</p>
              )}
              {uniqueEmailsOpened !== undefined && (
                <p>Unique leads opened: {uniqueEmailsOpened.toLocaleString()}</p>
              )}
              {uniqueEmailsClicked !== undefined && (
                <p>Unique leads clicked: {uniqueEmailsClicked.toLocaleString()}</p>
              )}
              {uniqueLeads !== undefined && uniqueEmails === undefined && (
                <p>Unique leads: {uniqueLeads.toLocaleString()}</p>
              )}
            </div>
          )}
          {(highInterestCount !== undefined || bounceCount !== undefined) && (
            <div className="mt-2 space-y-1 text-xs text-gray-500">
              {highInterestCount !== undefined && (
                <p>Leads &gt; 20s: {highInterestCount.toLocaleString()}</p>
              )}
              {bounceCount !== undefined && (
                <p>Leads &lt; 10s: {bounceCount.toLocaleString()}</p>
              )}
            </div>
          )}
        </div>
        {change !== undefined && (
          <div className={`text-sm font-semibold ${changeColor}`}>
            {changeIcon} {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      {extraContent && <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">{extraContent}</div>}
      {hasLeadSessions && (
        <details className="mt-4">
          <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
            Unique Lead Emails
          </summary>
          <div className="max-h-48 overflow-y-auto mt-2 pr-2 border border-gray-200 rounded-md bg-gray-50">
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
              {sessionEntries.map(([email, count]) => (
                <li key={email} className="wrap-break-word">
                  {email} ({leadCountLabelText}: {count})
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
      {!hasLeadSessions && leadEmailList && leadEmailList.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
            Unique Lead Emails
          </summary>
          <div className="max-h-48 overflow-y-auto mt-2 pr-2 border border-gray-200 rounded-md bg-gray-50">
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
              {leadEmailList.map((email) => (
                <li key={email} className="wrap-break-word">
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
                <li key={email} className="wrap-break-word">
                  {email}
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
      {highInterestLeads && highInterestLeads.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
            Leads &gt; 20 Seconds
          </summary>
          <div className="max-h-48 overflow-y-auto mt-2 pr-2 border border-gray-200 rounded-md bg-gray-50">
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
              {highInterestLeads.map((email) => (
                <li key={`high-${email}`} className="wrap-break-word">
                  {email}
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
      {bounceLeads && bounceLeads.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
            Leads &lt; 10 Seconds
          </summary>
          <div className="max-h-48 overflow-y-auto mt-2 pr-2 border border-gray-200 rounded-md bg-gray-50">
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
              {bounceLeads.map((email) => (
                <li key={`bounce-${email}`} className="wrap-break-word">
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

