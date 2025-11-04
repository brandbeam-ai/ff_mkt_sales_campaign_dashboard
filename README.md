# Fundraising Flywheel Marketing & Sales Dashboard

A Next.js dashboard for tracking week-over-week marketing and sales funnel metrics from Airtable.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory with:
   ```
   AIRTABLE_API_KEY=your_airtable_api_key_here
   AIRTABLE_BASE_ID=app0YMWSt1LtrGu7S
   ```

   To get your Airtable API key:
   - Go to https://airtable.com/api
   - Select your base
   - Copy your API key

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Dashboard Features

### Marketing Funnel (WoW)

1. **Email Outreach**
   - Sent outreach (Success - Failed)
   - % sent success over send

2. **Email Interaction**
   - Email interaction (open, click, unsubscribe)
   - % clicked over opened

3. **DM Outreach**
   - DM status (DMed, Lead replied, no replied)
   - % Lead replied over DMed

4. **New Organic Leads**
   - Leads with Source = "Lead magnet" or "Book a call"

5. **Lead Magnets Performance**
   - Landed - Session count
   - Avg. session duration
   - Deck submission count

### Sales Funnel (WoW)

1. **FF Landing Page**
   - Landed - Session count
   - Avg. session duration

2. **Book a Call**
   - Total Clicks on Book a Call button
   - % Landed over clicked

## Data Structure

The dashboard pulls data from the following Airtable tables:
- `Sent Email Log` - Email outreach tracking
- `Email interaction` - Email engagement metrics
- `DM_replied` - LinkedIn DM tracking
- `Lead list` - Main lead database
- `deck analysis website interaction` - Lead magnet landing page analytics
- `deck analysis reports` - Deck submission tracking
- `FF website interaction` - Sales funnel landing page analytics
- `Book a call` - Call booking tracking

All tables should have a "Week start of report date" field (Sunday–Saturday week) for proper week-over-week calculations.

## Project Structure

```
├── app/
│   ├── api/
│   │   └── funnel-data/
│   │       └── route.ts          # API endpoint to fetch all data
│   └── page.tsx                   # Main dashboard page
├── components/
│   ├── MetricCard.tsx             # Individual metric display card
│   └── MetricSection.tsx          # Section with multiple metrics
├── lib/
│   ├── airtable.ts                # Airtable client setup
│   ├── calculate-metrics.ts      # Metrics calculation functions
│   └── utils.ts                   # Utility functions
└── README.md
```

## Technologies Used

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Airtable SDK** - Data fetching
- **date-fns** - Date manipulation
