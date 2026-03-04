import { AnimatePresence } from "motion/react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { Banner, type BannerType, type BannerVariant } from "../Banner";
import styles from "./BannerCenter.module.scss";

export interface BannerItem {
	/** Unique identifier */
	id: string;
	/** Banner type */
	type?: BannerType;
	/** Visual variant */
	variant?: BannerVariant;
	/** Title text */
	title: string;
	/** Description text */
	description?: string;
	/** Custom icon */
	icon?: ReactNode;
	/** Action element (button or link) */
	action?: ReactNode;
	/** Whether the banner can be dismissed */
	dismissible?: boolean;
}

interface BannerContextValue {
	/** Add a banner to the center */
	addBanner: (banner: Omit<BannerItem, "id"> & { id?: string }) => string;
	/** Remove a banner by ID */
	removeBanner: (id: string) => void;
	/** Clear all dismissible banners */
	clearDismissible: () => void;
	/** Clear all banners */
	clearAll: () => void;
}

const BannerContext = createContext<BannerContextValue | null>(null);

export function useBannerCenter() {
	const context = useContext(BannerContext);
	if (!context) {
		throw new Error(
			"useBannerCenter must be used within a BannerCenterProvider",
		);
	}
	return context;
}

export interface BannerCenterProviderProps {
	children: ReactNode;
}

let bannerId = 0;
const generateId = () => `banner-${++bannerId}`;

export function BannerCenterProvider({ children }: BannerCenterProviderProps) {
	const [banners, setBanners] = useState<BannerItem[]>([]);

	const addBanner = useCallback(
		(banner: Omit<BannerItem, "id"> & { id?: string }) => {
			const id = banner.id || generateId();
			setBanners((prev) => [...prev, { ...banner, id }]);
			return id;
		},
		[],
	);

	const removeBanner = useCallback((id: string) => {
		setBanners((prev) => prev.filter((b) => b.id !== id));
	}, []);

	const clearDismissible = useCallback(() => {
		setBanners((prev) => prev.filter((b) => b.dismissible === false));
	}, []);

	const clearAll = useCallback(() => {
		setBanners([]);
	}, []);

	const value = useMemo(
		() => ({ addBanner, removeBanner, clearDismissible, clearAll }),
		[addBanner, removeBanner, clearDismissible, clearAll],
	);

	// Split banners into dismissible and non-dismissible
	// Reverse dismissible so newest is on top
	const dismissibleBanners = banners
		.filter((b) => b.dismissible !== false)
		.reverse();
	const nonDismissibleBanners = banners.filter((b) => b.dismissible === false);

	return (
		<BannerContext.Provider value={value}>
			<BannerCenterDisplay
				dismissibleBanners={dismissibleBanners}
				nonDismissibleBanners={nonDismissibleBanners}
				onDismiss={removeBanner}
			/>
			{children}
		</BannerContext.Provider>
	);
}

interface BannerCenterDisplayProps {
	dismissibleBanners: BannerItem[];
	nonDismissibleBanners: BannerItem[];
	onDismiss: (id: string) => void;
}

function BannerCenterDisplay({
	dismissibleBanners,
	nonDismissibleBanners,
	onDismiss,
}: BannerCenterDisplayProps) {
	const isEmpty =
		dismissibleBanners.length === 0 && nonDismissibleBanners.length === 0;

	if (isEmpty) return null;

	return (
		<div className={styles.bannerCenter}>
			{/* Non-dismissible banners (always at bottom, always visible) */}
			{nonDismissibleBanners.length > 0 && (
				<div className={styles.nonDismissibleRow}>
					<AnimatePresence>
						{nonDismissibleBanners.map((banner) => (
							<Banner
								key={banner.id}
								type={banner.type}
								variant={banner.variant}
								title={banner.title}
								description={banner.description}
								icon={banner.icon}
								action={banner.action}
								dismissible={false}
								animate
							/>
						))}
					</AnimatePresence>
				</div>
			)}

			{/* Dismissible banners (show top one with skeleton hints) */}
			{dismissibleBanners.length > 0 && (
				<div className={styles.dismissibleStack}>
					<AnimatePresence mode="wait">
						<Banner
							key={dismissibleBanners[0]!.id}
							type={dismissibleBanners[0]!.type}
							variant={dismissibleBanners[0]!.variant}
							title={dismissibleBanners[0]!.title}
							description={dismissibleBanners[0]!.description}
							icon={dismissibleBanners[0]!.icon}
							action={dismissibleBanners[0]!.action}
							dismissible
							onDismiss={() => onDismiss(dismissibleBanners[0]!.id)}
							animate
						/>
					</AnimatePresence>
					{/* Skeleton hints for stacked banners */}
					{dismissibleBanners.length > 1 && (
						<div className={styles.stackIndicator}>
							<div className={styles.skeletonBar} />
							{dismissibleBanners.length > 2 && (
								<div className={styles.skeletonBar} />
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

BannerCenterProvider.displayName = "BannerCenterProvider";
