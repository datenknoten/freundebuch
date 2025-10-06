# Epic 9: Dashboard & Insights

**Status:** Planned
**Phase:** Phase 2 (Basic), Phase 3 (Extended)
**Priority:** Medium

## Overview

Numbers tell stories! This dashboard gives you meaningful insights about your social network at a glance. See who needs attention, spot patterns in how you connect with people, and get actionable suggestions to help you maintain the relationships that matter most.

## Goals

- Give you a quick snapshot of how your relationships are doing
- Surface what actually matters - who to reach out to, what's coming up
- Show you patterns and trends in your social life through helpful visualizations
- Help you maintain a healthy balance across all your relationships
- Let you customize the dashboard to show what's most important to you

## Key Features

### Dashboard Widgets (Phase 2 - Basic)

#### Upcoming Birthdays
- Next 30 days of birthdays
- Countdown to each birthday
- Quick action to send wishes
- Link to contact detail
- Filter by group
- "Today" highlight

#### Overdue Contacts
- "Haven't contacted in X days"
- Configurable threshold
- Sorted by days since last contact
- Quick action to log interaction
- Snooze/dismiss functionality
- Group by relationship strength

#### Contact Statistics
- Total contacts count
- New contacts this week/month
- Active contacts (contacted in last 30 days)
- Archived contacts count
- Growth chart (contacts over time)

#### Recent Activity
- Last 10 interactions across all contacts
- Interaction type icons
- Quick view of notes
- Link to full timeline
- "View all" link

#### Top Contacts
- Most frequently contacted (last 30/90 days)
- Interaction frequency score
- Visual ranking (1st, 2nd, 3rd)
- Trend indicators (up/down)
- Filter by time period

### Insights (Phase 3 - Extended)

#### Contact Frequency Analysis
- Average time between interactions per contact
- Interaction frequency distribution (daily, weekly, monthly, rarely)
- Comparison to user's intended frequency
- "Falling behind" warnings
- Suggested action items

#### Group Distribution
- Pie chart of contacts by group
- Bar chart of interactions by group
- Identify underrepresented groups
- Balance indicator (e.g., "90% work, 10% personal")
- Drill-down by group

#### Interaction Trends
- Time series chart of interactions over time
- Monthly/weekly aggregation
- Trend line (increasing/decreasing)
- Comparison to previous period
- Seasonal patterns
- Busiest days/months

#### Neglected Contacts
- Contacts not contacted in longest time
- Configurable definition of "neglected"
- Relationship importance weight
- Suggested priorities
- Quick action to reach out

#### Relationship Health Score
- Composite score based on:
  - Interaction frequency
  - Recency of contact
  - Reminder completion rate
  - Relationship importance (favorite, group)
- Color-coded indicators (green, yellow, red)
- Overall network health score
- Improvement suggestions

### Personalization

#### Customizable Dashboard
- Drag-and-drop widget arrangement
- Show/hide widgets
- Resize widgets
- Save layout preferences
- Multiple dashboard layouts (home, work, personal)
- Widget settings (thresholds, date ranges)

#### Selectable Metrics
- Choose which statistics to display
- Configure thresholds for warnings
- Set preferred visualization types
- Custom date ranges for trends

#### Time Period Filters
- Today, this week, this month, this year
- Last 7/30/90 days
- Custom date range
- Compare to previous period

### Notifications & Alerts

#### Dashboard Notifications
- Badge count on dashboard icon
- New items indicator
- Actionable notifications
- Dismissible alerts
- Notification settings

## User Stories

### Phase 2
1. As a user, I want to see upcoming birthdays so I can plan to reach out
2. As a user, I want to see who I haven't contacted recently so I can prioritize my time
3. As a user, I want to see my total contact count so I can track my network growth
4. As a user, I want to see recent activity so I can quickly remember what I've done

### Phase 3
5. As a user, I want to see how my contacts are distributed across groups so I can balance my relationships
6. As a user, I want to see interaction trends over time so I can understand my social patterns
7. As a user, I want to identify neglected relationships so I can revive them
8. As a user, I want to customize my dashboard so I see the most relevant information
9. As a user, I want a relationship health score so I can quickly assess my network

## Technical Considerations

### Database Queries
- Efficient aggregation queries
- Caching of dashboard data
- Materialized views for complex calculations
- Scheduled jobs for pre-calculation

### API Endpoints
- `GET /api/dashboard` - Get all dashboard widgets data
- `GET /api/dashboard/birthdays` - Upcoming birthdays
- `GET /api/dashboard/overdue` - Overdue contacts
- `GET /api/dashboard/stats` - Contact statistics
- `GET /api/dashboard/activity` - Recent activity
- `GET /api/dashboard/top-contacts` - Most contacted
- `GET /api/insights/frequency` - Contact frequency analysis
- `GET /api/insights/distribution` - Group distribution
- `GET /api/insights/trends` - Interaction trends
- `GET /api/insights/neglected` - Neglected contacts
- `GET /api/insights/health-score` - Relationship health
- `PUT /api/dashboard/layout` - Save dashboard layout
- `GET /api/dashboard/layout` - Get dashboard layout

### Frontend Components

#### Dashboard Layout
- Grid layout system
- Widget containers
- Drag-and-drop manager
- Responsive breakpoints

#### Widgets
- BirthdayWidget
- OverdueContactsWidget
- StatsWidget
- ActivityWidget
- TopContactsWidget
- FrequencyAnalysisWidget
- GroupDistributionWidget
- TrendsChartWidget
- NeglectedContactsWidget
- HealthScoreWidget

#### Visualizations
- Pie chart (group distribution)
- Bar chart (interactions by group)
- Line chart (trends over time)
- Donut chart (health score)
- Sparklines (mini trend indicators)

### Charting Library
- Chart.js or similar
- Responsive charts
- Accessible (ARIA labels)
- Tooltips
- Interactive (click to drill-down)

### Calculations

#### Interaction Frequency Score
```
score = total_interactions / days_since_first_contact
```

#### Relationship Health Score
```
health_score = (
  recency_score * 0.4 +
  frequency_score * 0.4 +
  importance_score * 0.2
) * 100
```

#### Overdue Threshold
```
expected_contact_date = last_interaction_date + average_interval
if today > expected_contact_date: overdue
```

## Success Metrics

- Dashboard loads in <2 seconds
- All widgets display accurate data
- Charts render smoothly without lag
- Drag-and-drop layout works on desktop and touch devices
- Insights accurately identify actionable contacts
- Dashboard refresh updates in <1 second

## Dependencies

- Epic 2: Relationship Management (interaction data)
- Epic 1: Contact Management (contact data)
- Epic 3: Reminder System (reminder data)
- Epic 4: Categorization & Organization (group data)
- Charting library (Chart.js, Recharts, etc.)
- Drag-and-drop library (dnd-kit or similar)

## Out of Scope

- AI-powered relationship advice (we're not relationship counselors!)
- Sentiment analysis of interactions
- Predictions of relationship decay (no crystal balls here)
- Social network graph visualization (we'll keep it simpler for now)
- Comparative analytics with other users (your relationships are unique to you)
- Export dashboard as PDF/image

## Related Epics

- Epic 2: Relationship Management (data source)
- Epic 3: Reminder System (actionable items)
- Epic 8: Activity Timeline (detailed view from dashboard)

## Implementation Phases

### Phase 2A: Basic Widgets
1. Upcoming birthdays
2. Overdue contacts
3. Contact statistics
4. Recent activity

### Phase 2B: Top Contacts
5. Top contacts widget
6. Basic trends

### Phase 3A: Advanced Insights
7. Contact frequency analysis
8. Group distribution charts
9. Interaction trends
10. Neglected contacts

### Phase 3B: Health & Personalization
11. Relationship health score
12. Dashboard customization
13. Layout persistence
14. Advanced filtering

## Testing Strategy

- Test with empty database (new user)
- Test with minimal data (5 contacts, 10 interactions)
- Test with typical data (100 contacts, 500 interactions)
- Test with large dataset (1000+ contacts, 10,000+ interactions)
- Test calculation accuracy
- Test dashboard performance
- Test responsive layout on mobile
- Test drag-and-drop on touch devices

## Mockup Notes

### Dashboard Layout (Desktop)
```
┌────────────────────────────────────────┐
│  Upcoming Birthdays  │  Overdue        │
│                      │  Contacts       │
├──────────────────────┴─────────────────┤
│  Contact Statistics                    │
├────────────────────────────────────────┤
│  Recent Activity    │  Top Contacts    │
└────────────────────────────────────────┘
```

### Insights Page Layout
```
┌────────────────────────────────────────┐
│  Relationship Health Score             │
│  [Donut Chart]                         │
├──────────────────────┬─────────────────┤
│  Group Distribution  │  Interaction    │
│  [Pie Chart]         │  Trends         │
│                      │  [Line Chart]   │
├──────────────────────┴─────────────────┤
│  Neglected Contacts                    │
│  [List with scores]                    │
└────────────────────────────────────────┘
```
