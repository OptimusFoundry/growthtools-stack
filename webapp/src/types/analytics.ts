export interface AnalyticsOverview {
	totalImpressions: number;
	totalLikes: number;
	totalComments: number;
	totalShares: number;
	totalClicks: number;
	engagementRate: number;
}

export interface TimeSeriesDataPoint {
	date: string;
	impressions: number;
	likes: number;
	comments: number;
	shares: number;
	clicks: number;
}

export interface PlatformBreakdown {
	platform: string;
	impressions: number;
	likes: number;
	comments: number;
	shares: number;
	clicks: number;
}

export interface TopPost {
	id: string;
	title?: string;
	content: string;
	platform: string;
	impressions: number;
	engagement: number;
	publishedAt: string;
}
