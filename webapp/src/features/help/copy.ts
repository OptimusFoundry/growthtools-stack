export const HELP_COPY = {
	title: "Help",
	hero: {
		eyebrow: "Support",
		title: "How can we help",
		description: "Answers to common questions, and a way to reach us.",
	},
	faq: {
		heading: "Frequently asked questions",
		items: [
			{
				id: "connect-platform",
				question: "How do I connect a platform?",
				answer:
					"Open Account, then the Platforms tab, and choose Connect on the platform you want. You sign in on the platform's own page and are sent back here. Bluesky asks for an app password instead.",
			},
			{
				id: "connect-github",
				question: "How do I connect GitHub?",
				answer:
					"Open the GitHub page and choose Connect. Once a repository is linked, new commits appear in the list and can be turned into posts.",
			},
			{
				id: "schedule-post",
				question: "How do I create and schedule a post?",
				answer:
					"Choose New post, write or generate the text, pick the platforms, then publish now or choose a date and time. Scheduled posts show on the Calendar.",
			},
			{
				id: "failed-post",
				question: "What happens when a post fails?",
				answer:
					"A failed post keeps its text and shows which platform rejected it. Open the post and choose Retry once you have fixed the cause, such as an expired connection.",
			},
			{
				id: "media",
				question: "How do media and the featured image work?",
				answer:
					"Upload files on the Media page or while composing a post. Mark one image as featured to use it as the cover on platforms that show a preview.",
			},
			{
				id: "billing",
				question: "Where do I manage my plan and billing?",
				answer:
					"Open Billing from the sidebar to see your plan, change it, update your payment method or cancel.",
			},
		],
	},
	contact: {
		heading: "Contact us",
		description:
			"Can't find an answer? Email us and we'll reply as soon as we can.",
		emailLabel: "Email support",
		// Placeholder; replace with the real support address.
		email: "support@example.com",
		subject: "Growth Tools support",
	},
} as const;
