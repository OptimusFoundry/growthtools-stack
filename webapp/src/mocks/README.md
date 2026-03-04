# Mock Data Library

Comprehensive mock data for all components specified in the Technical Design Document for the Viral Waitlist & Referral Marketing Platform.

## Overview

This library provides realistic, well-structured mock data for use in Storybook stories and testing. All mock data is based on the type definitions from the technical design document and follows the established patterns in CLAUDE.md.

## Directory Structure

```
src/mocks/
├── campaigns.mock.ts           # Campaign data (7 campaigns with various states)
├── users.mock.ts              # Waitlist users (15+ users with different statuses)
├── referrals.mock.ts          # Referrals and leaderboards
├── forms.mock.ts              # Form configurations and designs
├── analytics.mock.ts          # Analytics data for dashboards
├── emails.mock.ts             # Email templates and campaigns
├── rewards.mock.ts            # Rewards and earned rewards
├── team-integrations.mock.ts  # Team members, integrations, and webhooks
├── index.ts                   # Central export file
└── README.md                  # This file
```

## Quick Start

Import mock data in your Storybook stories:

```tsx
import { mockCampaigns, mockWaitlistUsers, mockAnalyticsHighPerformance } from '@/mocks';

export const Default: Story = {
  args: {
    campaign: mockCampaigns[0],
    users: mockWaitlistUsers.slice(0, 10),
    analytics: mockAnalyticsHighPerformance,
  }
};
```

## Available Mock Data

### 1. Campaigns

**Data Collections:**
- `mockCampaigns` - 7 campaigns with different statuses (active, draft, paused, completed)
- `mockCampaignsByStatus` - Campaigns grouped by status
- `mockCampaignSettings` - Various campaign setting configurations
- `mockCampaignStats` - Performance stats (high, medium, early, struggling, viral)

**Helper Functions:**
```tsx
getMockCampaignById(id: string)
getMockCampaignsByUserId(userId: string)
```

**Example Usage:**
```tsx
import { mockCampaigns } from '@/mocks';

export const ActiveCampaign: Story = {
  args: {
    campaign: mockCampaigns[0], // SaaS Product Launch - Active
  }
};

export const DraftCampaign: Story = {
  args: {
    campaign: mockCampaigns[2], // E-commerce Platform - Draft
  }
};
```

### 2. Waitlist Users

**Data Collections:**
- `mockWaitlistUsers` - 15+ users with various states, devices, and sources
- `mockUsersByStatus` - Users grouped by status (pending, verified, invited, active, rejected)
- `mockUsersByDevice` - Users grouped by device (mobile, tablet, desktop)
- `mockUsersBySource` - Users grouped by traffic source

**Helper Functions:**
```tsx
getMockUserById(id: string)
getMockUsersByCampaign(campaignId: string)
getMockUsersByStatus(status: 'pending' | 'verified' | 'invited' | 'active' | 'rejected')
getMockTopReferrers(campaignId: string, limit?: number)
```

**Example Usage:**
```tsx
import { mockWaitlistUsers, mockUsersByStatus } from '@/mocks';

export const UserList: Story = {
  args: {
    users: mockWaitlistUsers,
  }
};

export const VerifiedUsersOnly: Story = {
  args: {
    users: mockUsersByStatus.verified,
  }
};
```

### 3. Referrals & Leaderboards

**Data Collections:**
- `mockReferrals` - 23+ referral records with different statuses
- `mockReferralsBySource` - Referrals grouped by platform (link, email, twitter, etc.)
- `mockReferralsByStatus` - Referrals grouped by status
- `mockLeaderboards` - Leaderboard data for different periods (all_time, weekly, monthly)
- `mockLeaderboardEntries` - Individual leaderboard entries with ranks and badges

**Helper Functions:**
```tsx
getMockReferralsByCampaign(campaignId: string)
getMockReferralsByReferrer(referrerId: string)
getMockLeaderboard(campaignId: string, period: 'all_time' | 'daily' | 'weekly' | 'monthly')
getMockTopReferrersLeaderboard(limit?: number)
```

**Example Usage:**
```tsx
import { mockLeaderboards, mockReferrals } from '@/mocks';

export const LeaderboardWidget: Story = {
  args: {
    leaderboard: mockLeaderboards[0], // Campaign 1 all-time
  }
};

export const ReferralList: Story = {
  args: {
    referrals: mockReferrals.filter(r => r.status === 'verified'),
  }
};
```

### 4. Form Builder

**Data Collections:**
- `mockFormConfigs` - 7 complete form configurations
- `mockFormFields` - Field collections (minimal, standard, comprehensive, multiStep, withConditionalLogic)
- `mockFormDesigns` - Design presets (modern, vibrant, minimal, dark, playful, corporate, tech)
- `mockFormBehaviors` - Behavior configurations
- `mockFieldTemplates` - Draggable field templates for form builder palette

**Helper Functions:**
```tsx
getMockFormConfigById(id: string)
getMockFormConfigByCampaign(campaignId: string)
getMockFormsByLayout(layout: 'single-column' | 'two-column' | 'multi-step')
```

**Example Usage:**
```tsx
import { mockFormConfigs, mockFormDesigns, mockFieldTemplates } from '@/mocks';

export const FormPreview: Story = {
  args: {
    config: mockFormConfigs[0],
  }
};

export const FormBuilder: Story = {
  args: {
    design: mockFormDesigns.modern,
    fieldTemplates: mockFieldTemplates,
  }
};
```

### 5. Analytics

**Data Collections:**
- `mockAnalyticsHighPerformance` - Successful campaign analytics
- `mockAnalyticsMediumPerformance` - Average performing campaign
- `mockAnalyticsEarlyStage` - New campaign with limited data
- `mockAnalyticsViral` - Extremely successful viral campaign
- `mockAnalyticsStruggling` - Underperforming campaign
- `mockGrowthChartData` - Time-series data for charts
- `mockConversionFunnelData` - Funnel stage data
- `mockTrafficSourcesData` - Traffic source breakdown
- `mockReferralSourcesData` - Referral platform performance

**Helper Functions:**
```tsx
getMockAnalyticsByCampaign(campaignId: string)
```

**Example Usage:**
```tsx
import {
  mockAnalyticsHighPerformance,
  mockGrowthChartData,
  mockConversionFunnelData
} from '@/mocks';

export const AnalyticsDashboard: Story = {
  args: {
    analytics: mockAnalyticsHighPerformance,
  }
};

export const GrowthChart: Story = {
  args: {
    data: mockGrowthChartData,
  }
};

export const ConversionFunnel: Story = {
  args: {
    data: mockConversionFunnelData,
  }
};
```

### 6. Emails

**Data Collections:**
- `mockEmailTemplates` - 6 email templates (welcome, verification, milestone, launch, beta, re-engagement)
- `mockEmailCampaigns` - 8 email campaigns with different triggers and statuses
- `mockEmailCampaignStatsAggregated` - Overall email performance stats

**Helper Functions:**
```tsx
getMockEmailTemplateById(id: string)
getMockEmailTemplatesByCampaign(campaignId: string)
getMockEmailTemplatesByType(type: EmailTemplate['type'])
getMockEmailCampaignsByCampaign(campaignId: string)
getMockEmailCampaignsByStatus(status: EmailCampaign['status'])
```

**Example Usage:**
```tsx
import { mockEmailTemplates, mockEmailCampaigns } from '@/mocks';

export const EmailEditor: Story = {
  args: {
    template: mockEmailTemplates[0], // Welcome email
  }
};

export const EmailCampaignList: Story = {
  args: {
    campaigns: mockEmailCampaigns.filter(c => c.status === 'sent'),
  }
};
```

### 7. Rewards

**Data Collections:**
- `mockRewards` - 16 rewards across different campaigns and tiers
- `mockRewardsEarned` - 15 earned reward records with various statuses

**Helper Functions:**
```tsx
getMockRewardsByCampaign(campaignId: string)
getMockRewardsByTier(tier: number)
getMockRewardsByType(type: Reward['type'])
getMockRewardsEarnedByUser(userId: string)
mockRewardsSortedByTier(campaignId: string)
mockRewardTiersOverview(campaignId: string)
mockUserRewardProgress(userId: string, referralCount: number)
```

**Example Usage:**
```tsx
import {
  mockRewards,
  mockRewardsSortedByTier,
  mockUserRewardProgress
} from '@/mocks';

export const RewardTiers: Story = {
  args: {
    rewards: mockRewardsSortedByTier('campaign-1'),
  }
};

export const UserProgress: Story = {
  args: {
    progress: mockUserRewardProgress('wuser-1', 47),
  }
};
```

### 8. Team & Integrations

**Data Collections:**
- `mockTeamMembers` - 8 team members with different roles (owner, admin, editor, viewer)
- `mockIntegrations` - 9 integrations (Zapier, Mailchimp, HubSpot, etc.)
- `mockWebhooks` - 7 webhook configurations with delivery stats
- `mockWebhookDeliveryLogs` - Detailed webhook delivery logs
- `mockIntegrationCategories` - Integrations grouped by category

**Helper Functions:**
```tsx
// Team
getMockTeamMemberById(id: string)
getMockTeamMembersByRole(role: 'owner' | 'admin' | 'editor' | 'viewer')
getMockActiveTeamMembers()
getMockPendingInvitations()

// Integrations
getMockIntegrationById(id: string)
getMockIntegrationsByStatus(status: 'connected' | 'disconnected' | 'error')
getMockConnectedIntegrations()

// Webhooks
getMockWebhooksByCampaign(campaignId: string)
getMockActiveWebhooks()
```

**Example Usage:**
```tsx
import {
  mockTeamMembers,
  mockIntegrations,
  mockWebhooks
} from '@/mocks';

export const TeamMembersList: Story = {
  args: {
    members: mockTeamMembers,
  }
};

export const IntegrationMarketplace: Story = {
  args: {
    integrations: mockIntegrations,
  }
};

export const WebhookManager: Story = {
  args: {
    webhooks: mockWebhooks.filter(w => w.status === 'active'),
  }
};
```

## Mock Data Scenarios

### High Performance Campaign
```tsx
import { mockCampaigns, mockAnalyticsHighPerformance } from '@/mocks';

const campaign = mockCampaigns[0]; // SaaS Product Launch
const analytics = mockAnalyticsHighPerformance;
// 12,547 signups, 81.6% conversion, 2.8 K-factor
```

### Viral Campaign
```tsx
import { mockCampaigns, mockAnalyticsViral } from '@/mocks';

const campaign = mockCampaigns[3]; // AI Writing Assistant
const analytics = mockAnalyticsViral;
// 45,782 signups, 92% conversion, 3.5 K-factor
```

### Early Stage Campaign
```tsx
import { mockCampaigns, mockAnalyticsEarlyStage } from '@/mocks';

const campaign = mockCampaigns[2]; // E-commerce Platform (Draft)
const analytics = mockAnalyticsEarlyStage;
// 189 signups, 80.4% conversion, 1.8 K-factor
```

### Struggling Campaign
```tsx
import { mockCampaigns, mockAnalyticsStruggling } from '@/mocks';

const campaign = mockCampaigns[4]; // Newsletter Signup (Paused)
const analytics = mockAnalyticsStruggling;
// 67 signups, 50.7% conversion, 0.4 K-factor
```

## Component-Specific Examples

### Campaign Card Component
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { CampaignCard } from './campaign-card';
import { mockCampaigns } from '@/mocks';

const meta = {
  title: 'Features/Campaigns/CampaignCard',
  component: CampaignCard,
  tags: ['autodocs'],
} satisfies Meta<typeof CampaignCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
  args: {
    campaign: mockCampaigns[0], // Active campaign
    showStats: true,
  }
};

export const Draft: Story = {
  args: {
    campaign: mockCampaigns[2], // Draft campaign
    showStats: false,
  }
};

export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '16px' }}>
      {mockCampaigns.map(campaign => (
        <CampaignCard key={campaign.id} campaign={campaign} showStats />
      ))}
    </div>
  )
};
```

### Analytics Dashboard Component
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { AnalyticsDashboard } from './analytics-dashboard';
import {
  mockAnalyticsHighPerformance,
  mockAnalyticsViral,
  mockAnalyticsStruggling
} from '@/mocks';

const meta = {
  title: 'Features/Analytics/AnalyticsDashboard',
  component: AnalyticsDashboard,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof AnalyticsDashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HighPerformance: Story = {
  args: {
    analytics: mockAnalyticsHighPerformance,
  }
};

export const ViralGrowth: Story = {
  args: {
    analytics: mockAnalyticsViral,
  }
};

export const NeedsImprovement: Story = {
  args: {
    analytics: mockAnalyticsStruggling,
  }
};
```

### User List Component
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { UserList } from './user-list';
import {
  mockWaitlistUsers,
  mockUsersByStatus,
  getMockUsersByCampaign
} from '@/mocks';

const meta = {
  title: 'Features/Users/UserList',
  component: UserList,
  tags: ['autodocs'],
} satisfies Meta<typeof UserList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllUsers: Story = {
  args: {
    users: mockWaitlistUsers,
  }
};

export const VerifiedOnly: Story = {
  args: {
    users: mockUsersByStatus.verified,
  }
};

export const CampaignUsers: Story = {
  args: {
    users: getMockUsersByCampaign('campaign-1'),
  }
};
```

### Leaderboard Widget Component
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { LeaderboardWidget } from './leaderboard-widget';
import { mockLeaderboards } from '@/mocks';

const meta = {
  title: 'Features/Referrals/LeaderboardWidget',
  component: LeaderboardWidget,
  tags: ['autodocs'],
} satisfies Meta<typeof LeaderboardWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllTime: Story = {
  args: {
    leaderboard: mockLeaderboards[0], // All-time leaderboard
    highlightUserId: 'wuser-1',
  }
};

export const Weekly: Story = {
  args: {
    leaderboard: mockLeaderboards[1], // Weekly leaderboard
    limit: 5,
  }
};
```

## Tips & Best Practices

1. **Use Helper Functions**: Instead of filtering arrays manually, use the provided helper functions for cleaner code.

2. **Import Only What You Need**: The index file exports everything, but import only what you need for better tree-shaking.

3. **Combine Mock Data**: Mock data is designed to work together. For example, use campaign IDs from `mockCampaigns` with `getMockUsersByCampaign()`.

4. **Realistic Scenarios**: Use the pre-defined scenarios (high performance, viral, struggling) to show components in different states.

5. **Empty States**: To test empty states, use empty arrays or filter to get zero results:
   ```tsx
   users: mockWaitlistUsers.filter(u => u.campaignId === 'non-existent')
   ```

6. **Error States**: Use the struggling campaign data or create error scenarios by providing invalid data.

7. **Loading States**: Mock data doesn't include loading states. Handle these in your component stories using Storybook's play function or decorators.

## Data Relationships

Mock data maintains referential integrity:

- Campaign IDs in `mockCampaigns` match those in `mockWaitlistUsers`, `mockFormConfigs`, etc.
- User IDs in `mockWaitlistUsers` match referrer/referred IDs in `mockReferrals`
- Reward IDs in `mockRewards` match those in `mockRewardsEarned`
- Template IDs in `mockEmailTemplates` match those in `mockEmailCampaigns`

## Extending Mock Data

To add new mock data:

1. Follow the existing patterns in the relevant mock file
2. Ensure type safety using the types from `../types/common.types`
3. Maintain referential integrity with existing data
4. Add helper functions if needed
5. Export from the index file
6. Update this README with examples

## Questions or Issues?

If you find any issues with the mock data or need additional scenarios, please update the relevant mock file and submit a PR.
