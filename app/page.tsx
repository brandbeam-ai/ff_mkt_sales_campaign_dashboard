'use client';

import { useEffect, useState } from 'react';
import {
  calculateMKTOutreachMetrics,
  calculateNurtureEmailMetrics,
  calculateOutreachEmailInteractionMetrics,
  calculateNurtureEmailInteractionMetrics,
  calculateAnalysisResultEmailInteractionMetrics,
  calculateDMMetrics,
  calculateOrganicLeads,
  calculateLeadMagnetMetrics,
  calculateSalesFunnelMetrics,
} from '@/lib/calculate-metrics';
import { calculateDMDetails, DMDetailMetrics } from '@/lib/calculate-dm-details';
import MetricSection from '@/components/MetricSection';
import DMDetailsSection from '@/components/DMDetailsSection';
import InfoBox from '@/components/InfoBox';

interface FunnelData {
  sentEmailLog?: unknown[];
  emailInteractions?: unknown[];
  dmReplied?: unknown[];
  linkedinDMLog?: unknown[];
  leadList?: unknown[];
  deckAnalysisInteractions?: unknown[];
  deckReports?: unknown[];
  ffInteractions?: unknown[];
  bookACall?: unknown[];
  lastUpdated?: string;
  error?: string;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FunnelData | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/funnel-data');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-gray-900">Loading dashboard...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-red-600">Error: {error}</h1>
          <p className="text-gray-700">
            Please make sure AIRTABLE_API_KEY is set in your .env.local file
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Check if data contains an error
  if (data.error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-red-600">Error: {data.error}</h1>
        </div>
      </div>
    );
  }

  // Ensure linkedinDMLog is an array
  const linkedinDMLogData = Array.isArray(data.linkedinDMLog) ? data.linkedinDMLog : [];

  // Calculate all metrics
  const mktOutreachMetrics = calculateMKTOutreachMetrics(
    data.sentEmailLog || [],
    data.emailInteractions || []
  );
  const nurtureEmailMetrics = calculateNurtureEmailMetrics(
    data.sentEmailLog || [],
    data.emailInteractions || []
  );
  const outreachEmailInteractionMetrics = calculateOutreachEmailInteractionMetrics(
    data.emailInteractions || []
  );
  const nurtureEmailInteractionMetrics = calculateNurtureEmailInteractionMetrics(
    data.emailInteractions || []
  );
  const analysisResultEmailInteractionMetrics = calculateAnalysisResultEmailInteractionMetrics(
    data.emailInteractions || []
  );
  const dmMetrics = calculateDMMetrics(linkedinDMLogData);
  
  // Calculate DM details with extra safety
  let dmDetails: DMDetailMetrics[] = [];
  try {
    if (Array.isArray(linkedinDMLogData) && linkedinDMLogData.length > 0) {
      const result = calculateDMDetails(linkedinDMLogData);
      // Triple check it's an array
      if (Array.isArray(result)) {
        dmDetails = result;
      } else {
        console.warn('calculateDMDetails returned non-array:', result);
        dmDetails = [];
      }
    }
  } catch (error) {
    console.error('Error calculating DM details:', error);
    dmDetails = [];
  }
  
  // Final safety check - ensure dmDetails is always an array
  if (!Array.isArray(dmDetails)) {
    console.error('dmDetails is not an array, resetting:', dmDetails);
    dmDetails = [];
  }
  
  // Additional check: ensure no error objects in the array
  dmDetails = dmDetails.filter(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return false;
    }
    if ('error' in item) {
      console.warn('Found error object in dmDetails, removing:', item);
      return false;
    }
    return true;
  });
  const organicLeadsMetrics = calculateOrganicLeads(data.leadList || []);
  const leadMagnetMetrics = calculateLeadMagnetMetrics(
    data.deckAnalysisInteractions || [],
    data.deckReports || []
  );
  const salesFunnelMetrics = calculateSalesFunnelMetrics(
    data.ffInteractions || [],
    data.bookACall || []
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-gray-900">Marketing & Sales Funnel Dashboard</h1>
            <p className="text-gray-700 mb-2 font-medium">Week-over-Week Metrics</p>
            {data.lastUpdated && typeof data.lastUpdated === 'string' && (
              <p className="text-sm text-gray-500">
                Last updated: {new Date(data.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Marketing Funnel */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-blue-700">Marketing Funnel (WoW)</h2>

          {/* Email Outreach */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Email Outreach</h3>
            <InfoBox title="About Email Outreach">
              <p className="mb-2">
                This section tracks email outreach campaigns sent to leads, separated by campaign type:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>MKT Outreach:</strong> Outbound marketing emails sent to new leads</li>
                <li><strong>Nurture Emails:</strong> Follow-up emails to nurture existing leads (General Nurture, Win-back Sequence)</li>
                <li><strong>% Sent Success:</strong> Percentage of emails successfully sent out of total attempts</li>
                <li>Data is tracked week-over-week to monitor campaign performance and delivery rates</li>
              </ul>
            </InfoBox>
            
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-3 text-gray-700">MKT Outreach Emails</h4>
              <MetricSection
                title="MKT Outreach - Sent"
                metrics={mktOutreachMetrics}
                showPercentage={true}
                unit="emails"
                showChart={true}
                chartType="line"
              />
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-3 text-gray-700">Nurture Emails</h4>
              <MetricSection
                title="Nurture Emails - Sent"
                metrics={nurtureEmailMetrics}
                showPercentage={true}
                unit="emails"
                showChart={true}
                chartType="line"
              />
            </div>
          </div>

          {/* Email Interaction */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Email Interaction</h3>
            <InfoBox title="About Email Interaction">
              <p className="mb-2">
                This section measures how leads engage with your emails, separated by email type:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Outreach Email Interactions:</strong> Opens and clicks on MKT Outreach emails</li>
                <li><strong>Nurture Email Interactions:</strong> Opens and clicks on Nurture sequence emails</li>
                <li><strong>Analysis Result Email Interactions:</strong> Opens and clicks on lead magnet deck analysis report emails</li>
                <li><strong>% Clicked over Opened:</strong> Conversion rate from opens to clicks (engagement quality metric)</li>
              </ul>
            </InfoBox>
            
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-3 text-gray-700">Outreach Email Interactions</h4>
              <MetricSection
                title="Outreach Emails - Opens & Clicks"
                metrics={outreachEmailInteractionMetrics}
                showPercentage={true}
                unit="opens"
                showChart={true}
                chartType="line"
              />
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-3 text-gray-700">Nurture Email Interactions</h4>
              <MetricSection
                title="Nurture Emails - Opens & Clicks"
                metrics={nurtureEmailInteractionMetrics}
                showPercentage={true}
                unit="opens"
                showChart={true}
                chartType="line"
              />
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-3 text-gray-700">Analysis Result Email Interactions</h4>
              <MetricSection
                title="Analysis Result Emails - Opens & Clicks"
                metrics={analysisResultEmailInteractionMetrics}
                showPercentage={true}
                unit="opens"
                showChart={true}
                chartType="line"
              />
            </div>
          </div>

          {/* DM Outreach */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">DM Outreach</h3>
            <InfoBox title="About DM Outreach">
              <p className="mb-2">
                This section tracks LinkedIn Direct Message outreach and engagement:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>New DMs Conversation Start:</strong> Number of unique new conversations started each week where you sent the first DM</li>
                <li><strong>How it works:</strong> The dashboard uses <code className="bg-gray-100 px-1 rounded">Conversation_id</code> to identify unique conversations and counts each conversation in the week it first appeared</li>
                <li><strong>Lead Replied:</strong> Number of new conversations where the lead responded (multiple senders in the conversation)</li>
                <li><strong>No Reply:</strong> New conversations where only you sent messages (lead didn&apos;t respond)</li>
                <li><strong>% Lead Replied over DMed:</strong> Response rate for new conversations (engagement quality metric)</li>
                <li><strong>Note:</strong> A conversation is only counted once, in the week it first appears. Subsequent messages in the same conversation are not counted as new conversations</li>
                <li>The detailed breakdown below shows message counts by sender (You vs. Correspondent) and identifies the most active conversations</li>
              </ul>
            </InfoBox>
            <MetricSection
              title="New DMs Conversation Start"
              metrics={dmMetrics}
              showPercentage={true}
              unit="conversations"
              showChart={true}
              chartType="line"
            />
            {Array.isArray(dmDetails) && <DMDetailsSection details={dmDetails} />}
          </div>

          {/* New Organic Leads */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">New Organic Leads</h3>
            <InfoBox title="About New Organic Leads">
              <p className="mb-2">
                This section tracks leads that come to you organically (not from outbound campaigns):
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Lead Magnet:</strong> Leads who discovered you through lead magnet content</li>
                <li><strong>Book a Call:</strong> Leads who directly requested a call without being contacted first</li>
                <li>These leads represent inbound interest and are typically higher quality than outbound leads</li>
                <li>Tracked week-over-week to monitor organic growth and brand awareness</li>
              </ul>
            </InfoBox>
            <MetricSection
              title="Organic Leads (Lead Magnet or Book a Call)"
              metrics={organicLeadsMetrics}
              unit="leads"
              showChart={true}
              chartType="bar"
            />
          </div>

          {/* Lead Magnets */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">2 LMs Performance</h3>
            <InfoBox title="About Lead Magnets Performance">
              <p className="mb-2">
                This section tracks the performance of your lead magnet landing pages (deck analysis tools):
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Landed:</strong> Number of unique sessions on the lead magnet landing page</li>
                <li><strong>Avg. Session Duration:</strong> Average time visitors spend on the page (engagement indicator)</li>
                <li><strong>Deck Submission:</strong> Number of pitch decks submitted for analysis (conversion metric)</li>
                <li>Higher session duration indicates better content engagement and lead quality</li>
                <li>Track conversion rate from landed to submission to optimize the funnel</li>
              </ul>
            </InfoBox>
            <MetricSection
              title="Landed"
              metrics={leadMagnetMetrics.landed}
              formatValue={(val) => `${Math.round(val)}`}
              unit="sessions"
              showChart={true}
              chartType="line"
            />
            <MetricSection
              title="Avg. Session Duration"
              metrics={leadMagnetMetrics.avgDuration}
              formatValue={(val) => `${Math.round(val)}s`}
              unit=""
              showChart={true}
              chartType="line"
            />
            <MetricSection
              title="Deck Submission"
              metrics={leadMagnetMetrics.submissions}
              unit="submissions"
              showChart={true}
              chartType="bar"
            />
          </div>
        </div>

        {/* Sales Funnel */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-green-700">Sales Funnel (WoW)</h2>

          {/* FF Landing Page */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">FF Landing Page</h3>
            <InfoBox title="About FF Landing Page">
              <p className="mb-2">
                This section tracks the main Fundraising Flywheel landing page performance:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Landed:</strong> Number of unique sessions on the main landing page</li>
                <li><strong>Avg. Session Duration:</strong> Average time visitors spend exploring the page</li>
                <li>This is the entry point for your sales funnel - visitors come here to learn about your services</li>
                <li>Higher engagement (duration) suggests better fit and higher conversion potential</li>
                <li>Monitor trends to understand traffic quality and optimize page content</li>
              </ul>
            </InfoBox>
            <MetricSection
              title="Landed"
              metrics={salesFunnelMetrics.landed}
              formatValue={(val) => `${Math.round(val)}`}
              unit="sessions"
              showChart={true}
              chartType="line"
            />
            <MetricSection
              title="Avg. Session Duration"
              metrics={salesFunnelMetrics.avgDuration}
              formatValue={(val) => `${Math.round(val)}s`}
              unit=""
              showChart={true}
              chartType="line"
            />
          </div>

          {/* Book a Call */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Book a Call</h3>
            <InfoBox title="About Book a Call">
              <p className="mb-2">
                This section tracks the final conversion step in your sales funnel:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Total Clicks:</strong> Number of times the &quot;Book a Call&quot; button was clicked</li>
                <li><strong>% Landed over Clicked:</strong> Conversion rate from button click to actual call booking completion</li>
                <li>This metric shows how many interested visitors actually complete the booking process</li>
                <li>A lower percentage may indicate friction in the booking flow that needs optimization</li>
                <li>Note: This metric will continue to be tracked until the &quot;Book a Call&quot; feature is officially removed</li>
              </ul>
            </InfoBox>
            <MetricSection
              title="Total Clicks on Book a Call Button"
              metrics={salesFunnelMetrics.clicks}
              unit="clicks"
              showChart={true}
              chartType="bar"
            />
            <MetricSection
              title="% Landed over Clicked"
              metrics={salesFunnelMetrics.clickToLanded}
              showPercentage={true}
              unit="%"
              showChart={true}
              chartType="line"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
