import {
	type AnchorHTMLAttributes,
	type ComponentType,
	createContext,
	type ReactNode,
	type Ref,
	useContext,
} from "react";

export type LinkComponentProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
	href: string;
	ref?: Ref<HTMLAnchorElement>;
	children?: ReactNode;
};

/** A router link, set once on `<QuietRoot linkComponent>` or `<ThemeProvider linkComponent>`. */
export type LinkComponent = ComponentType<LinkComponentProps>;

const LinkContext = createContext<LinkComponent | "a">("a");

export function LinkProvider({
	value,
	children,
}: {
	value: LinkComponent | undefined;
	children: ReactNode;
}) {
	return value ? <LinkContext.Provider value={value}>{children}</LinkContext.Provider> : children;
}

/** The configured router link, or "a" when none is set. */
export function useLinkComponent(): LinkComponent | "a" {
	return useContext(LinkContext);
}

// A router can't navigate to another origin, a non-http scheme or an in-page hash, so those
// stay native anchors.
const NATIVE_HREF = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i;

/** What to render a link to `href` with: the router link for in-app paths, else "a". */
export function useLinkElement(href: string | undefined, external = false): LinkComponent | "a" {
	const Link = useLinkComponent();
	return href == null || external || NATIVE_HREF.test(href) ? "a" : Link;
}
