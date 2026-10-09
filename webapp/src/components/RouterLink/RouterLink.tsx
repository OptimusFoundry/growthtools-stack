import type { LinkComponent } from "@optimusfoundry/quiet";
import { defaultParseSearch, Link } from "@tanstack/react-router";

export const RouterLink: LinkComponent = ({ href, ref, children, ...rest }) => {
	// /api/* is a backend route outside the router tree; client routing would show not-found.
	const isInApp =
		href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/api/");
	if (!isInApp) {
		return (
			<a href={href} ref={ref} {...rest}>
				{children}
			</a>
		);
	}

	const hashIndex = href.indexOf("#");
	const beforeHash = hashIndex === -1 ? href : href.slice(0, hashIndex);
	const hash = hashIndex === -1 ? undefined : href.slice(hashIndex + 1);
	const queryIndex = beforeHash.indexOf("?");
	const to = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
	const query = queryIndex === -1 ? "" : beforeHash.slice(queryIndex);
	const search = query.length > 1 ? defaultParseSearch(query) : undefined;

	return (
		<Link to={to} search={search} hash={hash || undefined} ref={ref} {...rest}>
			{children}
		</Link>
	);
};
