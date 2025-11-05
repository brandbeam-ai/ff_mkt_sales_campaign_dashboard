'use client';

import { useEffect, useState } from 'react';
import {
          calculateMKTOutreachMetrics,
          calculateNurtureEmailMetrics,
          calculateOutreachEmailInteractionMetrics,
          calculateNurtureEmailInteractionMetrics,
          calculateAnalysisResultEmailInteractionMetrics,
          calculateDMMetrics,
          calculateDMLeadRepliedMetrics,
          calculateDMFollowupMetrics,
          calculateLeadMagnetLeads,
          calculateBookACallLeads,
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
          const dmLeadRepliedMetrics = calculateDMLeadRepliedMetrics(linkedinDMLogData);
          const dmFollowupMetrics = calculateDMFollowupMetrics(linkedinDMLogData);
          
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
          const leadMagnetLeadsMetrics = calculateLeadMagnetLeads(data.leadList || []);
          const bookACallLeadsMetrics = calculateBookACallLeads(data.leadList || []);
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

                  {/* Outreach */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Outreach</h3>
                    <InfoBox title="About Outreach">
                      <p className="mb-2">
                        This section tracks MKT Outreach email campaigns and their engagement:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>MKT Outreach - Sent:</strong> Total number of outbound marketing emails sent (each record = 1 email). Also shows unique leads who received emails. One lead can receive multiple emails per week.</li>
                        <li><strong>Outreach Emails - Opens & Clicks:</strong> Engagement metrics for MKT Outreach emails filtered by <code className="bg-gray-100 px-1 rounded">mailgun_tags</code> containing &quot;outreach&quot; or &quot;mkt outreach&quot;</li>
                        <li><strong>Opens:</strong> Total number of email open events (main metric shown)</li>
                        <li><strong>Clicks:</strong> Total number of email click events (shown in card)</li>
                        <li><strong>Unique Leads Opened:</strong> Number of unique email addresses that opened emails (shown in card and chart tooltip)</li>
                        <li><strong>Unique Leads Clicked:</strong> Number of unique email addresses that clicked links (shown in card and chart tooltip)</li>
                        <li><strong>% Clicked over Opened:</strong> Click-through rate from opens to clicks (shown in chart tooltip)</li>
                        <li>Charts display the latest 12 weeks of data for better trend visualization</li>
                        <li>Data is tracked week-over-week to monitor campaign performance and engagement rates</li>
                      </ul>
                    </InfoBox>
                    
                    <div className="mb-6">
                      <MetricSection
                        title="MKT Outreach - Sent"
                        metrics={mktOutreachMetrics}
                        showPercentage={false}
                        unit="emails"
                        showChart={true}
                        chartType="line"
                      />
                    </div>

                    <div className="mb-6">
                      <MetricSection
                        title="Outreach Emails - Opens & Clicks"
                        metrics={outreachEmailInteractionMetrics}
                        showPercentage={false}
                        unit="opens"
                        showChart={true}
                        chartType="line"
                      />
                    </div>
                  </div>

                  {/* Nurture */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Nurture</h3>
                    <InfoBox title="About Nurture">
                      <p className="mb-2">
                        This section tracks Nurture email campaigns and their engagement:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Nurture Emails - Sent:</strong> Total number of follow-up emails sent to nurture existing leads (General Nurture, Win-back Sequence). Also shows unique leads who received emails. One lead can receive multiple emails per week.</li>
                        <li><strong>Nurture Emails - Opens & Clicks:</strong> Engagement metrics for Nurture sequence emails filtered by <code className="bg-gray-100 px-1 rounded">mailgun_tags</code> containing &quot;nurture&quot;, &quot;win-back&quot;, or &quot;general nurture&quot;</li>
                        <li><strong>Opens:</strong> Total number of email open events (main metric shown)</li>
                        <li><strong>Clicks:</strong> Total number of email click events (shown in card)</li>
                        <li><strong>Unique Leads Opened:</strong> Number of unique email addresses that opened emails (shown in card and chart tooltip)</li>
                        <li><strong>Unique Leads Clicked:</strong> Number of unique email addresses that clicked links (shown in card and chart tooltip)</li>
                        <li><strong>% Clicked over Opened:</strong> Click-through rate from opens to clicks (shown in chart tooltip)</li>
                        <li>Charts display the latest 12 weeks of data for better trend visualization</li>
                        <li>Data is tracked week-over-week to monitor nurture campaign performance</li>
                      </ul>
                    </InfoBox>
                    
                    <div className="mb-6">
                      <MetricSection
                        title="Nurture Emails - Sent"
                        metrics={nurtureEmailMetrics}
                        showPercentage={false}
                        unit="emails"
                        showChart={true}
                        chartType="line"
                      />
                    </div>

                    <div className="mb-6">
                      <MetricSection
                        title="Nurture Emails - Opens & Clicks"
                        metrics={nurtureEmailInteractionMetrics}
                        showPercentage={false}
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
                        <li><strong>New DMs Conversation Start:</strong> Number of unique new conversations started each week where you sent the first DM. Uses <code className="bg-gray-100 px-1 rounded">Conversation_id</code> to identify unique conversations and counts each conversation in the week it first appeared.</li>
                        <li><strong>Lead Replied:</strong> Number of new conversations where the lead responded (identified by multiple unique senders in the conversation)</li>
                        <li><strong>No Reply:</strong> New conversations where only you sent messages (lead didn&apos;t respond)</li>
                        <li><strong>% Lead Replied over DMed:</strong> Response rate for new conversations (Lead Replied ÷ New DMs) × 100. This is an engagement quality metric.</li>
                        <li><strong>Lead Replied Conversations:</strong> Total number of unique conversations where leads responded, tracked in the week the conversation first appeared. A conversation is counted as &quot;replied&quot; if it has multiple unique senders (meaning both you and the lead sent messages).</li>
                        <li><strong>Followup Conversations:</strong> Number of conversations where you sent a followup DM after the lead replied. This measures ongoing engagement - it counts conversations where ME sent a message AFTER the lead first replied.</li>
                        <li><strong>Note:</strong> A conversation is only counted once, in the week it first appears. Subsequent messages in the same conversation are not counted as new conversations.</li>
                        <li>Charts display the latest 12 weeks of data for better trend visualization</li>
                        <li>The detailed breakdown below shows message counts by sender (You vs. Correspondent) and identifies the most active conversations</li>
                      </ul>
                    </InfoBox>
                    <MetricSection
                      title="New DMs Conversation Start"
                      metrics={dmMetrics}
                      showPercentage={true}
                      percentageLabel="Lead Replied"
                      unit="conversations"
                      showChart={true}
                      chartType="line"
                    />
                    <div className="mb-6">
                      <MetricSection
                        title="Lead Replied Conversations"
                        metrics={dmLeadRepliedMetrics}
                        unit="conversations"
                        showChart={true}
                        chartType="line"
                      />
                    </div>
                    <div className="mb-6">
                      <MetricSection
                        title="Followup Conversations"
                        metrics={dmFollowupMetrics}
                        unit="conversations"
                        showChart={true}
                        chartType="line"
                      />
                    </div>
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
                <li><strong>Lead Magnet Leads:</strong> Count of leads from the <code className="bg-gray-100 px-1 rounded">Lead list</code> table where <code className="bg-gray-100 px-1 rounded">Source</code> = &quot;Lead magnet&quot;. These are leads who discovered you through lead magnet content.</li>
                <li><strong>Book a Call Leads:</strong> Count of leads from the <code className="bg-gray-100 px-1 rounded">Lead list</code> table where <code className="bg-gray-100 px-1 rounded">Source</code> = &quot;Book a call&quot;. These are leads who directly requested a call without being contacted first.</li>
                <li>These leads represent inbound interest and are typically higher quality than outbound leads</li>
                <li>Charts display the latest 12 weeks of data for better trend visualization</li>
                <li>Tracked week-over-week to monitor organic growth and brand awareness</li>
              </ul>
            </InfoBox>
            <div className="mb-6">
              <MetricSection
                title="Lead Magnet Leads"
                metrics={leadMagnetLeadsMetrics}
                unit="leads"
                showChart={true}
                chartType="bar"
              />
            </div>
            <div className="mb-6">
              <MetricSection
                title="Book a Call Leads"
                metrics={bookACallLeadsMetrics}
                unit="leads"
                showChart={true}
                chartType="bar"
              />
            </div>
          </div>

                  {/* Lead Magnets */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">2 LMs Performance</h3>
                    <InfoBox title="About Lead Magnets Performance">
                      <p className="mb-2">
                        This section tracks the performance of your lead magnet landing pages (deck analysis tools):
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Landed:</strong> Total number of unique sessions on the lead magnet landing page (each <code className="bg-gray-100 px-1 rounded">SessionID</code> = 1 session)</li>
                        <li><strong>Unique Lead Visitors:</strong> Number of unique mediums (where medium contains &quot;rec&quot;) that visited the page. Multiple sessions can share the same medium, so this counts unique lead sources. If medium doesn&apos;t contain &quot;rec&quot;, it&apos;s not counted as a unique lead visitor.</li>
                        <li><strong>Avg. Session Duration:</strong> Average time (in seconds) visitors spend on the page per session. Calculated as total duration ÷ number of sessions. Higher duration indicates better content engagement and lead quality.</li>
                        <li><strong>Deck Submission:</strong> Total number of pitch decks submitted for analysis. Also shows unique leads who submitted (one lead can submit multiple decks). This is the conversion metric from landing to submission.</li>
                        <li><strong>Analysis Result Email Interactions:</strong> Opens and clicks on lead magnet deck analysis report emails, filtered by <code className="bg-gray-100 px-1 rounded">mailgun_tags</code> containing &quot;analysis result&quot; or &quot;analysis&quot;. Shows total opens, clicks, and unique leads who opened/clicked.</li>
                        <li>Charts display the latest 12 weeks of data for better trend visualization</li>
                        <li>Track conversion rate from landed to submission to optimize the funnel</li>
                      </ul>
                    </InfoBox>
                    <div className="mb-6">
                      <MetricSection
                        title="Landed"
                        metrics={leadMagnetMetrics.landed}
                        formatValue={(val) => `${Math.round(val)}`}
                        unit="sessions"
                        showChart={true}
                        chartType="line"
                      />
                    </div>
                    <div className="mb-6">
                      <MetricSection
                        title="Unique Lead Visitors"
                        metrics={leadMagnetMetrics.uniqueVisits}
                        formatValue={(val) => `${Math.round(val)}`}
                        unit="visitors"
                        showChart={true}
                        chartType="line"
                      />
                    </div>
                    <div className="mb-6">
                      <MetricSection
                        title="Avg. Session Duration"
                        metrics={leadMagnetMetrics.avgDuration}
                        formatValue={(val) => `${Math.round(val)}s`}
                        unit=""
                        showChart={true}
                        chartType="line"
                      />
                    </div>
                    <div className="mb-6">
                      <MetricSection
                        title="Deck Submission"
                        metrics={leadMagnetMetrics.submissions}
                        unit="submissions"
                        showChart={true}
                        chartType="bar"
                      />
                    </div>
                    <div className="mb-6">
                      <MetricSection
                        title="Analysis Result Email Interactions"
                        metrics={analysisResultEmailInteractionMetrics}
                        showPercentage={false}
                        unit="opens"
                        showChart={true}
                        chartType="line"
                      />
                    </div>
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
                <li><strong>Landed:</strong> Total number of unique sessions on the main landing page (each <code className="bg-gray-100 px-1 rounded">SessionID</code> = 1 session)</li>
                <li><strong>Unique Lead Visitors:</strong> Number of unique mediums (where medium contains &quot;rec&quot;) that visited the page. Multiple sessions can share the same medium, so this counts unique lead sources. If medium doesn&apos;t contain &quot;rec&quot;, it&apos;s not counted as a unique lead visitor.</li>
                <li><strong>Avg. Session Duration:</strong> Average time (in seconds) visitors spend exploring the page per session. Calculated as total duration ÷ number of sessions. Higher duration suggests better fit and higher conversion potential.</li>
                <li>This is the entry point for your sales funnel - visitors come here to learn about your services</li>
                <li>Charts display the latest 12 weeks of data for better trend visualization</li>
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
            <div className="mb-6">
              <MetricSection
                title="Unique Lead Visitors"
                metrics={salesFunnelMetrics.uniqueVisits}
                formatValue={(val) => `${Math.round(val)}`}
                unit="visitors"
                showChart={true}
                chartType="line"
              />
            </div>
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
                <li><strong>Total Clicks:</strong> Number of times the &quot;Book a Call&quot; button was clicked on the FF landing page (counted in the week the click occurred)</li>
                <li><strong>% of Section vs Click Book a Call:</strong> Click-through rate showing what percentage of visitors who landed on the FF landing page clicked the &quot;Book a Call&quot; button</li>
                <li><strong>How it works:</strong> The metric calculates (Button Clicks ÷ Landed Sessions) × 100</li>
                <li><strong>What it means:</strong> Of all visitors who landed on the FF landing page in a given week, what percentage clicked the &quot;Book a Call&quot; button?</li>
                <li><strong>Example:</strong> If 1000 people landed on the FF landing page and 50 clicked the &quot;Book a Call&quot; button, the click-through rate is 5%</li>
                <li><strong>Why this matters:</strong> This metric measures the effectiveness of your call-to-action. A higher percentage indicates that visitors are interested and engaged enough to click the button.</li>
                <li>A lower percentage may indicate that the button placement, visibility, or messaging needs improvement</li>
                <li>A higher percentage indicates a strong call-to-action and good visitor engagement</li>
                <li>Track week-over-week trends to identify if changes to the landing page or button improve or worsen click-through rates</li>
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
              title="% of Section vs Click Book a Call"
              metrics={salesFunnelMetrics.clickToLanded}
              showPercentage={false}
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
