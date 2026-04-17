package store

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// JSONB is a custom type for JSONB fields
type JSONB map[string]interface{}

// Value implements the driver.Valuer interface for JSONB
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface for JSONB
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return errors.New("incompatible type for JSONB")
	}

	// Handle empty or null JSON
	if len(bytes) == 0 || string(bytes) == "null" {
		*j = make(JSONB)
		return nil
	}

	result := make(JSONB)
	err := json.Unmarshal(bytes, &result)
	if err != nil {
		return err
	}
	*j = result
	return nil
}

// StringArray is a custom type for PostgreSQL text[] arrays
type StringArray []string

// Value implements the driver.Valuer interface for StringArray
func (a StringArray) Value() (driver.Value, error) {
	if a == nil {
		return nil, nil
	}
	if len(a) == 0 {
		return "{}", nil
	}
	return "{" + strings.Join(a, ",") + "}", nil
}

// Scan implements the sql.Scanner interface for StringArray
func (a *StringArray) Scan(value interface{}) error {
	if value == nil {
		*a = nil
		return nil
	}

	var str string
	switch v := value.(type) {
	case []byte:
		str = string(v)
	case string:
		str = v
	default:
		return fmt.Errorf("unsupported type for StringArray: %T", value)
	}

	if str == "" || str == "{}" {
		*a = []string{}
		return nil
	}

	str = strings.Trim(str, "{}")
	if str == "" {
		*a = []string{}
		return nil
	}

	*a = strings.Split(str, ",")
	return nil
}

// UUIDArray is a custom type for PostgreSQL UUID[] arrays
type UUIDArray []uuid.UUID

// Value implements the driver.Valuer interface for UUIDArray
func (a UUIDArray) Value() (driver.Value, error) {
	if a == nil {
		return nil, nil
	}
	if len(a) == 0 {
		return "{}", nil
	}
	strVals := make([]string, len(a))
	for i, v := range a {
		strVals[i] = v.String()
	}
	return "{" + strings.Join(strVals, ",") + "}", nil
}

// Scan implements the sql.Scanner interface for UUIDArray
func (a *UUIDArray) Scan(value interface{}) error {
	if value == nil {
		*a = nil
		return nil
	}

	var str string
	switch v := value.(type) {
	case []byte:
		str = string(v)
	case string:
		str = v
	default:
		return fmt.Errorf("unsupported type for UUIDArray: %T", value)
	}

	if str == "" || str == "{}" {
		*a = []uuid.UUID{}
		return nil
	}

	str = strings.Trim(str, "{}")
	if str == "" {
		*a = []uuid.UUID{}
		return nil
	}

	parts := strings.Split(str, ",")
	*a = make([]uuid.UUID, len(parts))
	for i, p := range parts {
		parsed, err := uuid.Parse(p)
		if err != nil {
			return fmt.Errorf("failed to parse UUID at index %d: %w", i, err)
		}
		(*a)[i] = parsed
	}
	return nil
}

// ============================================================================
// Core Models
// ============================================================================

// Account represents a customer account
type Account struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	Name             string     `db:"name" json:"name"`
	Slug             string     `db:"slug" json:"slug"`
	OwnerUserID      uuid.UUID  `db:"owner_user_id" json:"owner_user_id"`
	Plan             string     `db:"plan" json:"plan"`
	Status           string     `db:"status" json:"status"`
	StripeCustomerID *string    `db:"stripe_customer_id" json:"stripe_customer_id,omitempty"`
	TrialEndsAt      *time.Time `db:"trial_ends_at" json:"trial_ends_at,omitempty"`
	Settings         JSONB      `db:"settings" json:"settings"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt        *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}

// TeamMember represents a member of an account team
type TeamMember struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	AccountID   uuid.UUID  `db:"account_id" json:"account_id"`
	UserID      uuid.UUID  `db:"user_id" json:"user_id"`
	Role        string     `db:"role" json:"role"`
	Permissions JSONB      `db:"permissions" json:"permissions"`
	InvitedBy   *uuid.UUID `db:"invited_by" json:"invited_by,omitempty"`
	InvitedAt   *time.Time `db:"invited_at" json:"invited_at,omitempty"`
	JoinedAt    *time.Time `db:"joined_at" json:"joined_at,omitempty"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`
}

// ============================================================================
// Growth Tools Models
// ============================================================================

// PlatformConnection represents an OAuth connection to a social platform
type PlatformConnection struct {
	ID             uuid.UUID   `db:"id" json:"id"`
	AccountID      uuid.UUID   `db:"account_id" json:"account_id"`
	Platform       string      `db:"platform" json:"platform"`
	PlatformUserID string      `db:"platform_user_id" json:"platform_user_id"`
	DisplayName    *string     `db:"display_name" json:"display_name,omitempty"`
	AccessToken    string      `db:"access_token" json:"-"`
	RefreshToken   *string     `db:"refresh_token" json:"-"`
	TokenExpiresAt *time.Time  `db:"token_expires_at" json:"token_expires_at,omitempty"`
	Scopes         StringArray `db:"scopes" json:"scopes"`
	Status         string      `db:"status" json:"status"`
	ConnectedAt    time.Time   `db:"connected_at" json:"connected_at"`
	CreatedAt      time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time   `db:"updated_at" json:"updated_at"`
	DeletedAt      *time.Time  `db:"deleted_at" json:"deleted_at,omitempty"`
}

// Post represents a content item
type Post struct {
	ID            uuid.UUID  `db:"id" json:"id"`
	AccountID     uuid.UUID  `db:"account_id" json:"account_id"`
	Title         *string    `db:"title" json:"title,omitempty"`
	Content       string     `db:"content" json:"content"`
	ContentType   string     `db:"content_type" json:"content_type"`
	Status        string     `db:"status" json:"status"`
	ScheduledAt   *time.Time `db:"scheduled_at" json:"scheduled_at,omitempty"`
	PublishedAt   *time.Time `db:"published_at" json:"published_at,omitempty"`
	MediaIDs      UUIDArray  `db:"media_ids" json:"media_ids"`
	Tags          StringArray `db:"tags" json:"tags"`
	AIGenerated   bool       `db:"ai_generated" json:"ai_generated"`
	BaseContent   *string    `db:"base_content" json:"base_content,omitempty"`
	Source        string     `db:"source" json:"source"`
	GitHubEventID *uuid.UUID  `db:"github_event_id" json:"github_event_id,omitempty"`
	Platforms     StringArray `db:"platforms" json:"platforms"`
	CreatedAt     time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time   `db:"updated_at" json:"updated_at"`
	DeletedAt     *time.Time  `db:"deleted_at" json:"deleted_at,omitempty"`
}

// PlatformPost represents a per-platform publish record
type PlatformPost struct {
	ID             uuid.UUID        `db:"id" json:"id"`
	PostID         uuid.UUID        `db:"post_id" json:"post_id"`
	Platform       string           `db:"platform" json:"platform"`
	PlatformPostID *string          `db:"platform_post_id" json:"platform_post_id,omitempty"`
	Status         string           `db:"status" json:"status"`
	Content        *string          `db:"content" json:"content,omitempty"`
	ThreadSegments *json.RawMessage `db:"thread_segments" json:"thread_segments,omitempty"`
	// MediaHandle carries whatever the platform returned during media
	// upload (container_id, media_id + processing state, blob ref,
	// jobId, etc.). Shape is adapter-owned — the pipeline workers pass
	// it through without cracking it open. Nil for text-only rows.
	MediaHandle    *json.RawMessage `db:"media_handle" json:"media_handle,omitempty"`
	PublishedAt    *time.Time       `db:"published_at" json:"published_at,omitempty"`
	ErrorMessage   *string          `db:"error_message" json:"error_message,omitempty"`
	Engagement     JSONB            `db:"engagement" json:"engagement"`
	AttemptCount   int              `db:"attempt_count" json:"attempt_count"`
	MaxAttempts    int              `db:"max_attempts" json:"max_attempts"`
	NextRetryAt    *time.Time       `db:"next_retry_at" json:"next_retry_at,omitempty"`
	LastAttemptAt  *time.Time       `db:"last_attempt_at" json:"last_attempt_at,omitempty"`
	CreatedAt      time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time        `db:"updated_at" json:"updated_at"`
}

// RetryablePlatformPost extends PlatformPost with the parent post's account_id
type RetryablePlatformPost struct {
	PlatformPost
	AccountID uuid.UUID `db:"account_id"`
}

// Media represents an uploaded media file
type Media struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	AccountID   uuid.UUID  `db:"account_id" json:"account_id"`
	Filename    string     `db:"filename" json:"filename"`
	ContentType string     `db:"content_type" json:"content_type"`
	S3Key       string     `db:"s3_key" json:"s3_key"`
	S3URL       string     `db:"s3_url" json:"s3_url"`
	SizeBytes   int64      `db:"size_bytes" json:"size_bytes"`
	Width       *int       `db:"width" json:"width,omitempty"`
	Height      *int       `db:"height" json:"height,omitempty"`
	AltText     *string    `db:"alt_text" json:"alt_text,omitempty"`
	Source      string     `db:"source" json:"source"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt   *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}

// GitHubEvent represents a received GitHub webhook event
type GitHubEvent struct {
	ID         uuid.UUID  `db:"id" json:"id"`
	AccountID  uuid.UUID  `db:"account_id" json:"account_id"`
	RepoName   string     `db:"repo_name" json:"repo_name"`
	EventType  string     `db:"event_type" json:"event_type"`
	Payload    JSONB      `db:"payload" json:"payload"`
	DeliveryID string     `db:"delivery_id" json:"delivery_id"`
	Processed  bool       `db:"processed" json:"processed"`
	PostID     *uuid.UUID `db:"post_id" json:"post_id,omitempty"`
	CreatedAt  time.Time  `db:"created_at" json:"created_at"`
}

// BlogPost represents a blog post
type BlogPost struct {
	ID              uuid.UUID   `db:"id" json:"id"`
	AccountID       uuid.UUID   `db:"account_id" json:"account_id"`
	Title           string      `db:"title" json:"title"`
	Slug            string      `db:"slug" json:"slug"`
	Content         string      `db:"content" json:"content"`
	Excerpt         *string     `db:"excerpt" json:"excerpt,omitempty"`
	Status          string      `db:"status" json:"status"`
	SEOTitle        *string     `db:"seo_title" json:"seo_title,omitempty"`
	MetaDescription *string     `db:"meta_description" json:"meta_description,omitempty"`
	Keywords        StringArray `db:"keywords" json:"keywords"`
	OGTitle         *string     `db:"og_title" json:"og_title,omitempty"`
	OGDescription   *string     `db:"og_description" json:"og_description,omitempty"`
	FeaturedImageID *uuid.UUID  `db:"featured_image_id" json:"featured_image_id,omitempty"`
	PublishedAt     *time.Time  `db:"published_at" json:"published_at,omitempty"`
	CreatedAt       time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time   `db:"updated_at" json:"updated_at"`
	DeletedAt       *time.Time  `db:"deleted_at" json:"deleted_at,omitempty"`
}

// PostAnalytics represents an analytics snapshot for a platform post
type PostAnalytics struct {
	ID             uuid.UUID `db:"id" json:"id"`
	PlatformPostID uuid.UUID `db:"platform_post_id" json:"platform_post_id"`
	Platform       string    `db:"platform" json:"platform"`
	Impressions    int       `db:"impressions" json:"impressions"`
	Likes          int       `db:"likes" json:"likes"`
	Comments       int       `db:"comments" json:"comments"`
	Shares         int       `db:"shares" json:"shares"`
	Clicks         int       `db:"clicks" json:"clicks"`
	CollectedAt    time.Time `db:"collected_at" json:"collected_at"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
}

// VoiceProfile represents brand voice settings
type VoiceProfile struct {
	ID                 uuid.UUID   `db:"id" json:"id"`
	AccountID          uuid.UUID   `db:"account_id" json:"account_id"`
	Tone               string      `db:"tone" json:"tone"`
	Style              string      `db:"style" json:"style"`
	ExamplePosts       StringArray `db:"example_posts" json:"example_posts"`
	Industry           *string     `db:"industry" json:"industry,omitempty"`
	TargetAudience     *string     `db:"target_audience" json:"target_audience,omitempty"`
	CustomInstructions *string     `db:"custom_instructions" json:"custom_instructions,omitempty"`
	CreatedAt          time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time   `db:"updated_at" json:"updated_at"`
}

// AIConversation represents an AI chat conversation
type AIConversation struct {
	ID        uuid.UUID  `db:"id" json:"id"`
	AccountID uuid.UUID  `db:"account_id" json:"account_id"`
	Title     *string    `db:"title" json:"title,omitempty"`
	CreatedAt time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}

// AIMessage represents a message in an AI conversation
type AIMessage struct {
	ID             uuid.UUID `db:"id" json:"id"`
	ConversationID uuid.UUID `db:"conversation_id" json:"conversation_id"`
	Role           string    `db:"role" json:"role"`
	Content        string    `db:"content" json:"content"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
}
