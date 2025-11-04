import { sortWeeksChronologically } from './utils';

export interface DMConversationDetail {
  conversationId: string;
  week: string;
  messagesByMe: number;
  messagesByCorrespondent: number;
  totalMessages: number;
  firstMessageDate?: string;
  lastMessageDate?: string;
}

export interface DMDetailMetrics {
  week: string;
  totalMessagesByMe: number;
  totalMessagesByCorrespondent: number;
  totalConversations: number;
  conversations: DMConversationDetail[];
  topConversation?: DMConversationDetail;
}

export function calculateDMDetails(linkedinDMLog: any[]): DMDetailMetrics[] {
  try {
    // Ensure we have valid input
    if (!Array.isArray(linkedinDMLog)) {
      console.warn('calculateDMDetails: linkedinDMLog is not an array:', typeof linkedinDMLog, linkedinDMLog);
      return [];
    }
    
    // Check if it's an error object
    if (linkedinDMLog && typeof linkedinDMLog === 'object' && 'error' in linkedinDMLog) {
      console.warn('calculateDMDetails: linkedinDMLog is an error object:', linkedinDMLog);
      return [];
    }

    const weekMap = new Map<string, {
      conversations: Map<string, DMConversationDetail>;
      totalMessagesByMe: number;
      totalMessagesByCorrespondent: number;
    }>();

    // Process all messages
    linkedinDMLog.forEach((record) => {
      const weekStart = record['Week start of report date'];
      const conversationId = record['Conversation_id'];
      const sender = record['Sender']?.trim() || '';
      const sentTime = record['Sent time'];
      
      if (!weekStart || !conversationId) return;

      // Initialize week data if needed
      if (!weekMap.has(weekStart)) {
        weekMap.set(weekStart, {
          conversations: new Map<string, DMConversationDetail>(),
          totalMessagesByMe: 0,
          totalMessagesByCorrespondent: 0,
        });
      }

      const weekData = weekMap.get(weekStart)!;

      // Initialize or get conversation detail
      if (!weekData.conversations.has(conversationId)) {
        weekData.conversations.set(conversationId, {
          conversationId,
          week: weekStart,
          messagesByMe: 0,
          messagesByCorrespondent: 0,
          totalMessages: 0,
        });
      }

      const conversation = weekData.conversations.get(conversationId)!;
      
      // Determine if sender is ME or CORRESPONDENT
      // Check if sender is empty or contains "ME" (case-insensitive)
      // Also check for common patterns that indicate our messages
      const senderLower = (sender || '').toLowerCase().trim();
      const isMe = senderLower === '' || 
                    senderLower === 'me' ||
                    senderLower.includes('jay') || 
                    senderLower.includes('jda') ||
                    senderLower.includes('fundraising flywheel');
      
      if (isMe) {
        conversation.messagesByMe++;
        weekData.totalMessagesByMe++;
      } else {
        conversation.messagesByCorrespondent++;
        weekData.totalMessagesByCorrespondent++;
      }
      
      conversation.totalMessages++;
      
      // Track message dates
      if (sentTime) {
        if (!conversation.firstMessageDate || sentTime < conversation.firstMessageDate) {
          conversation.firstMessageDate = sentTime;
        }
        if (!conversation.lastMessageDate || sentTime > conversation.lastMessageDate) {
          conversation.lastMessageDate = sentTime;
        }
      }
    });

    // Convert to array format and find top conversations
    const metrics: DMDetailMetrics[] = Array.from(weekMap.entries())
      .map(([week, data]) => {
        const conversations = Array.from(data.conversations.values());
        
        // Find top conversation (highest total messages)
        const topConversation = conversations.length > 0
          ? conversations.reduce((top, current) => 
              current.totalMessages > top.totalMessages ? current : top
            )
          : undefined;

        return {
          week,
          totalMessagesByMe: data.totalMessagesByMe,
          totalMessagesByCorrespondent: data.totalMessagesByCorrespondent,
          totalConversations: conversations.length,
          conversations,
          topConversation,
        };
      })
      .sort((a, b) => sortWeeksChronologically(a.week, b.week));

    return metrics;
  } catch (error) {
    console.error('Error calculating DM details:', error);
    return [];
  }
}

