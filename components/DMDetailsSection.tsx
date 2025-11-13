'use client';

import { DMDetailMetrics } from '@/lib/calculate-dm-details';
import { formatWeekRange, parseWeekStart } from '@/lib/utils';

interface DMDetailsSectionProps {
  details: DMDetailMetrics[];
}

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

function findWeekDetail(details: DMDetailMetrics[], targetWeek: string | undefined): DMDetailMetrics | undefined {
  if (!targetWeek) return undefined;
  return details.find((detail) => detail.week === targetWeek);
}

export default function DMDetailsSection({ details }: DMDetailsSectionProps) {
  if (!Array.isArray(details) || details.length === 0) {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">DM Details</h3>
        <p className="text-gray-500">No DM data available</p>
      </div>
    );
  }

  const currentWeekString = getCurrentWeekStart();
  let currentWeekDate: Date | null = null;
  try {
    currentWeekDate = parseWeekStart(currentWeekString);
  } catch {
    currentWeekDate = null;
  }

  let lastWeekKey: string | undefined;
  let priorWeekKey: string | undefined;

  if (currentWeekDate) {
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const lastWeekDate = new Date(currentWeekDate.getTime() - WEEK_MS);
    const priorWeekDate = new Date(currentWeekDate.getTime() - 2 * WEEK_MS);
    lastWeekKey = formatDateToWeekString(lastWeekDate);
    priorWeekKey = formatDateToWeekString(priorWeekDate);
  }

  const sortedDetails = [...details].sort((a, b) => {
    if (!a.week) return -1;
    if (!b.week) return 1;
    try {
      return parseWeekStart(a.week).getTime() - parseWeekStart(b.week).getTime();
    } catch {
      return a.week.localeCompare(b.week);
    }
  });

  if (!lastWeekKey && sortedDetails.length > 0) {
    lastWeekKey = sortedDetails[sortedDetails.length - 1].week;
  }
  if (!priorWeekKey && sortedDetails.length > 1) {
    priorWeekKey = sortedDetails[sortedDetails.length - 2].week;
  }

  const lastWeekDetails = findWeekDetail(sortedDetails, lastWeekKey);
  const priorWeekDetails = findWeekDetail(sortedDetails, priorWeekKey);

  const renderSummaryCards = (weekDetails: DMDetailMetrics | undefined, label: string) => {
    if (!weekDetails) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Total Messages by Me - {label}</h4>
          <p className="text-3xl font-bold text-blue-600">0</p>
          <p className="text-xs text-gray-500 mt-2">No data</p>
        </div>
      );
  }

  return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Total Messages by Me - {label}</h4>
          <p className="text-3xl font-bold text-blue-600">{weekDetails.totalMessagesByMe}</p>
          <p className="text-xs text-gray-500 mt-2">{formatWeekRange(weekDetails.week)}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Total Messages by Correspondent - {label}</h4>
          <p className="text-3xl font-bold text-green-600">{weekDetails.totalMessagesByCorrespondent}</p>
          <p className="text-xs text-gray-500 mt-2">{formatWeekRange(weekDetails.week)}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Total Conversations - {label}</h4>
          <p className="text-3xl font-bold text-purple-600">{weekDetails.totalConversations}</p>
          <p className="text-xs text-gray-500 mt-2">{formatWeekRange(weekDetails.week)}</p>
        </div>
      </div>
    );
  };

  const renderConversations = (weekDetails: DMDetailMetrics | undefined, label: string) => {
    if (!weekDetails) {
      return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">All Conversations - {label}</h4>
            <p className="text-gray-500">No conversations found for this week</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="p-6">
          <details className="group">
            <summary className="text-lg font-semibold text-gray-800 mb-4 cursor-pointer select-none">
              All Conversations - {formatWeekRange(weekDetails.week)}
            </summary>
            {weekDetails.conversations.length === 0 ? (
            <p className="text-gray-500">No conversations found for this week</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversation ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Messages
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      By Me
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      By Correspondent
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {weekDetails.conversations
                    .sort((a, b) => b.totalMessages - a.totalMessages)
                    .map((conversation, index) => (
                        <tr key={`${label}-${conversation.conversationId}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 break-all">
                            <div>
                          {conversation.conversationId}
                            </div>
                            {(conversation.leadFirstName || conversation.leadUrl) && (
                              <div className="text-xs text-gray-500 mt-1 space-x-1">
                                {conversation.leadFirstName && <span>Lead: {conversation.leadFirstName}</span>}
                                {conversation.leadUrl && (
                                  <a
                                    href={conversation.leadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:underline"
                                  >
                                    LinkedIn
                                  </a>
                                )}
                              </div>
                            )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {conversation.totalMessages}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                          {conversation.messagesByMe}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 font-medium">
                          {conversation.messagesByCorrespondent}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          </details>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">DM Details Analysis</h3>

      {renderSummaryCards(lastWeekDetails, 'Last Week')}

      {lastWeekDetails?.topConversation && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Top Conversation (Highest Message Count) - Last Week</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Conversation</p>
              <div className="text-sm text-gray-900">
                <p className="font-mono break-all">{lastWeekDetails.topConversation.conversationId}</p>
                {lastWeekDetails.topConversation.leadFirstName && (
                  <p className="text-xs text-gray-500 mt-1">
                    Lead: {lastWeekDetails.topConversation.leadFirstName}{' '}
                    {lastWeekDetails.topConversation.leadUrl && (
                      <a
                        href={lastWeekDetails.topConversation.leadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        (LinkedIn)
                      </a>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{lastWeekDetails.topConversation.totalMessages}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Messages by Me</p>
              <p className="text-xl font-semibold text-blue-600">{lastWeekDetails.topConversation.messagesByMe}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Messages by Correspondent</p>
              <p className="text-xl font-semibold text-green-600">{lastWeekDetails.topConversation.messagesByCorrespondent}</p>
            </div>
          </div>
        </div>
      )}

      {renderConversations(lastWeekDetails, 'Last Week')}

      <h3 className="text-xl font-semibold mb-4 text-gray-800 mt-10">DM Details Analysis - Two Weeks Ago</h3>
      {renderSummaryCards(priorWeekDetails, 'Two Weeks Ago')}
      {priorWeekDetails?.topConversation && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Top Conversation - Two Weeks Ago</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Conversation</p>
              <div className="text-sm text-gray-900">
                <p className="font-mono break-all">{priorWeekDetails.topConversation.conversationId}</p>
                {priorWeekDetails.topConversation.leadFirstName && (
                  <p className="text-xs text-gray-500 mt-1">
                    Lead: {priorWeekDetails.topConversation.leadFirstName}{' '}
                    {priorWeekDetails.topConversation.leadUrl && (
                      <a
                        href={priorWeekDetails.topConversation.leadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        (LinkedIn)
                      </a>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{priorWeekDetails.topConversation.totalMessages}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Messages by Me</p>
              <p className="text-xl font-semibold text-blue-600">{priorWeekDetails.topConversation.messagesByMe}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Messages by Correspondent</p>
              <p className="text-xl font-semibold text-green-600">{priorWeekDetails.topConversation.messagesByCorrespondent}</p>
            </div>
          </div>
        </div>
      )}
      {renderConversations(priorWeekDetails, 'Two Weeks Ago')}
    </div>
  );
}

