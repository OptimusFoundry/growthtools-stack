/**
 * Gating Components
 * Components and hooks for handling plan limits and feature gating
 */

export type { FeatureGateProps } from "./FeatureGate/component";
export { FeatureGate } from "./FeatureGate/component";
export type { GatedEmptyStateProps } from "./GatedEmptyState/component";
export { GatedEmptyState } from "./GatedEmptyState/component";
export type { LimitUpgradeModalProps } from "./LimitUpgradeModal/component";
export { LimitUpgradeModal } from "./LimitUpgradeModal/component";
export type { UseLimitGateOptions, UseLimitGateResult } from "./useLimitGate";
export { useLimitGate } from "./useLimitGate";
