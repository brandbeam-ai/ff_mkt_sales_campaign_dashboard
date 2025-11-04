'use client';

import { DMDetailMetrics } from '@/lib/calculate-dm-details';
import { formatWeekRange } from '@/lib/utils';

interface DMDetailsSectionProps {
  details: DMDetailMetrics[];
}

export default function DMDetailsSection({ details }: DMDetailsSectionProps) {
  // Validate that details is an array
  if (!Array.isArray(details) || details.length === 0) {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">DM Details</h3>
        <p className="text-gray-500">No DM data available</p>
      </div>
    );
  }

  // Get the latest week's details
  const latestWeekDetails = details[details.length - 1];

  // Validate latestWeekDetails
  if (!latestWeekDetails || typeof latestWeekDetails !== 'object' || Array.isArray(latestWeekDetails)) {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">DM Details</h3>
        <p className="text-gray-500">Invalid DM data format</p>
      </div>
    );
  }

  // Check if it's an error object
  if ('error' in latestWeekDetails) {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">DM Details</h3>
        <p className="text-gray-500">Error loading DM data</p>
      </div>
    );
  }

  // Validate week is a string, or set a default
  if (!latestWeekDetails.week || typeof latestWeekDetails.week !== 'string') {
    // Try to use a default or extract from first conversation
    const firstConv = latestWeekDetails.conversations?.[0];
    if (firstConv?.week && typeof firstConv.week === 'string') {
      latestWeekDetails.week = firstConv.week;
    } else {
      return (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">DM Details</h3>
          <p className="text-gray-500">No valid week data found. Total Messages by Me: {latestWeekDetails.totalMessagesByMe || 0}, Total Messages by Correspondent: {latestWeekDetails.totalMessagesByCorrespondent || 0}</p>
        </div>
      );
    }
  }

  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">DM Details Analysis</h3>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Total Messages by Me</h4>
          <p className="text-3xl font-bold text-blue-600">{latestWeekDetails.totalMessagesByMe}</p>
          <p className="text-xs text-gray-500 mt-2">{formatWeekRange(latestWeekDetails.week)}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Total Messages by Correspondent</h4>
          <p className="text-3xl font-bold text-green-600">{latestWeekDetails.totalMessagesByCorrespondent}</p>
          <p className="text-xs text-gray-500 mt-2">{formatWeekRange(latestWeekDetails.week)}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Total Conversations</h4>
          <p className="text-3xl font-bold text-purple-600">{latestWeekDetails.totalConversations}</p>
          <p className="text-xs text-gray-500 mt-2">{formatWeekRange(latestWeekDetails.week)}</p>
        </div>
      </div>

      {/* Top Conversation */}
      {latestWeekDetails.topConversation && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Top Conversation (Highest Message Count)</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Conversation ID</p>
              <p className="text-sm font-mono text-gray-900 break-all">{latestWeekDetails.topConversation.conversationId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{latestWeekDetails.topConversation.totalMessages}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Messages by Me</p>
              <p className="text-xl font-semibold text-blue-600">{latestWeekDetails.topConversation.messagesByMe}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Messages by Correspondent</p>
              <p className="text-xl font-semibold text-green-600">{latestWeekDetails.topConversation.messagesByCorrespondent}</p>
            </div>
          </div>
        </div>
      )}

      {/* All Conversations Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            All Conversations - {typeof latestWeekDetails.week === 'string' ? formatWeekRange(latestWeekDetails.week) : 'N/A'}
          </h4>
          {latestWeekDetails.conversations.length === 0 ? (
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
                  {latestWeekDetails.conversations
                    .sort((a, b) => b.totalMessages - a.totalMessages)
                    .map((conversation, index) => (
                      <tr key={conversation.conversationId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 break-all">
                          {conversation.conversationId}
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
        </div>
      </div>
    </div>
  );
}

