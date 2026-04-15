import { NavGroup } from "@/types/navigation";

/**
 * Navigation configuration for Growth Tools
 * AI-powered social media posting platform
 */
export const navigationConfig: NavGroup[] = [
	{
		label: "Content",
		allowedPersonas: ["admin", "marketing", "content_creator"],
		items: [
			{
				label: "Calendar",
				href: "/calendar",
				iconClass: "calendar-line",
				allowedPersonas: ["admin", "marketing", "content_creator"],
			},
			{
				label: "Posts",
				href: "/posts",
				iconClass: "edit-line",
				allowedPersonas: ["admin", "marketing", "content_creator"],
			},
			{
				label: "AI Chat",
				href: "/chat",
				iconClass: "chat-line",
				allowedPersonas: ["admin", "marketing", "content_creator"],
			},
			{
				label: "Media",
				href: "/media",
				iconClass: "image-line",
				allowedPersonas: ["admin", "marketing", "content_creator"],
			},
			{
				label: "Blog",
				href: "/blog",
				iconClass: "article-line",
				allowedPersonas: ["admin", "marketing", "content_creator"],
			},
			],
	},
	{
		label: "Insights",
		allowedPersonas: ["admin", "marketing"],
		items: [
			{
				label: "Analytics",
				href: "/analytics",
				iconClass: "bar-chart-line",
				allowedPersonas: ["admin", "marketing"],
			},
		],
	},
];
