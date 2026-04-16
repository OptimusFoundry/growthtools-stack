package store

// Account ENUMs
const (
	AccountPlanFree       = "free"
	AccountPlanStarter    = "starter"
	AccountPlanPro        = "pro"
	AccountPlanEnterprise = "enterprise"
)

const (
	AccountStatusActive    = "active"
	AccountStatusSuspended = "suspended"
	AccountStatusCanceled  = "canceled"
)

// Team Member ENUMs
const (
	TeamMemberRoleOwner  = "owner"
	TeamMemberRoleAdmin  = "admin"
	TeamMemberRoleEditor = "editor"
	TeamMemberRoleViewer = "viewer"
)

// Platform Types
const (
	PlatformX         = "x"
	PlatformLinkedIn  = "linkedin"
	PlatformBlueSky   = "bluesky"
	PlatformFacebook  = "facebook"
	PlatformInstagram = "instagram"
	PlatformThreads   = "threads"
	PlatformTikTok    = "tiktok"
	PlatformPinterest = "pinterest"
)

// Platform Connection Status
const (
	PlatformConnectionStatusActive  = "active"
	PlatformConnectionStatusExpired = "expired"
	PlatformConnectionStatusRevoked = "revoked"
	PlatformConnectionStatusError   = "error"
)

// Post Status
const (
	PostStatusDraft              = "draft"
	PostStatusScheduled          = "scheduled"
	PostStatusPublishing         = "publishing"
	PostStatusPublished          = "published"
	PostStatusFailed             = "failed"
	PostStatusPartiallyPublished = "partially_published"
)

// Content Type
const (
	ContentTypeText     = "text"
	ContentTypeImage    = "image"
	ContentTypeVideo    = "video"
	ContentTypeCarousel = "carousel"
	ContentTypeThread   = "thread"
	ContentTypeStory    = "story"
	ContentTypeReel     = "reel"
)

// Post Source
const (
	PostSourceManual      = "manual"
	PostSourceAIGenerated = "ai_generated"
	PostSourceGitHubEvent = "github_event"
	PostSourceBulkImport  = "bulk_import"
)

// Platform Post Status
const (
	PlatformPostStatusPending    = "pending"
	PlatformPostStatusPublishing = "publishing"
	PlatformPostStatusPublished  = "published"
	PlatformPostStatusFailed     = "failed"
)

// Media Source
const (
	MediaSourceUpload      = "upload"
	MediaSourceAIGenerated = "ai_generated"
	MediaSourceURLImport   = "url_import"
)

// Blog Status
const (
	BlogStatusDraft     = "draft"
	BlogStatusPublished = "published"
	BlogStatusArchived  = "archived"
)

// Video Job Status
const (
	VideoJobStatusPending          = "pending"
	VideoJobStatusGeneratingConfig = "generating_config"
	VideoJobStatusRendering        = "rendering"
	VideoJobStatusUploading        = "uploading"
	VideoJobStatusCompleted        = "completed"
	VideoJobStatusFailed           = "failed"
)

// Video Aspect Ratio
const (
	VideoAspectRatio9x16 = "9:16"
	VideoAspectRatio1x1  = "1:1"
	VideoAspectRatio16x9 = "16:9"
)
