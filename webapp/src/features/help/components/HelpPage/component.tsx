import {
	Accordion,
	Button,
	PageHero,
	SectionHeader,
	Stack,
	Text,
} from "@optimusfoundry/quiet";
import { Mail } from "lucide-react";
import { useId } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { HELP_COPY } from "@/features/help/copy";
import { trimTrailingPeriod } from "@/utils/trimTrailingPeriod";
import styles from "./component.module.scss";

const { hero, faq, contact } = HELP_COPY;

const FAQ_ITEMS = faq.items.map((item) => ({
	id: item.id,
	title: item.question,
	content: <Text color="muted">{item.answer}</Text>,
}));

const MAILTO = `mailto:${contact.email}?subject=${encodeURIComponent(contact.subject)}`;

export function HelpPage() {
	const faqHeadingId = useId();
	const contactHeadingId = useId();

	return (
		<div className={styles.page}>
			<Stack gap="xl">
				<PageHero
					size="md"
					as="h2"
					ruled={false}
					className={styles.hero}
					eyebrow={hero.eyebrow}
					title={trimTrailingPeriod(hero.title)}
					description={hero.description}
				/>
				<section aria-labelledby={faqHeadingId}>
					<Stack gap="lg">
						{/* SectionHeader drops id, so the wrapper carries it. */}
						<div id={faqHeadingId}>
							<SectionHeader
								size="sm"
								as="h2"
								title={trimTrailingPeriod(faq.heading)}
							/>
						</div>
						<Accordion items={FAQ_ITEMS} headingLevel={3} />
					</Stack>
				</section>
				<section aria-labelledby={contactHeadingId}>
					<Stack gap="lg">
						<div id={contactHeadingId}>
							<SectionHeader
								size="sm"
								as="h2"
								title={trimTrailingPeriod(contact.heading)}
							/>
						</div>
						<Text color="muted">{contact.description}</Text>
						<div>
							<Button
								variant="secondary"
								size="sm"
								href={MAILTO}
								leftIcon={<AppIcon icon={Mail} size="md" />}
							>
								{contact.emailLabel}
							</Button>
						</div>
					</Stack>
				</section>
			</Stack>
		</div>
	);
}
