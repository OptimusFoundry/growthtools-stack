# Meta APIs (Facebook, Instagram, Threads) -- Publishing Reference

## Facebook (Pages API via Graph API)

### Post Types

| Post Type | Endpoint | Description |
|-----------|----------|-------------|
| Text-only | `POST /{page-id}/feed` | `message` field only |
| Photo (single) | `POST /{page-id}/photos` | Single image with optional message |
| Multi-photo | `POST /{page-id}/feed` | Multiple photos via `attached_media` array |
| Video | `POST /{page-id}/videos` | Video upload with optional description |
| Link share | `POST /{page-id}/feed` | `link` field with optional `message` |
| Reel | `POST /{page-id}/video_reels` | Short-form video (9:16) |

### Text/Field Limits

| Field | Limit |
|-------|-------|
| Message (text) | 63,206 characters |
| Scheduled publish time | 10 min to 75 days in the future |

### Photo Post
- Required: `url` (image URL) or `source` (multipart upload)
- Formats: JPEG, PNG, BMP, TIFF, GIF (non-animated)
- Max file size: 10 MB
- Min dimension: 100x100 pixels

### Multi-Photo Post
1. Upload each photo individually unpublished via `/{page-id}/photos` with `published=false`
2. Create feed post with `attached_media[0]={media_fbid:ID1}&attached_media[1]={media_fbid:ID2}`
- Practical limit: ~10 images

### Video Post
- Required: `source` (multipart) or `file_url` (hosted URL)
- Formats: MP4 (recommended), MOV, AVI, WMV, FLV
- Max file size: 10 GB
- Duration: 1 second to 240 minutes

### Reel
- Required: `video_url` (publicly accessible URL)
- Aspect ratio: 9:16 (vertical)
- Duration: 3-90 seconds
- File size: up to 1 GB

### Scheduling
- **Natively supported**: `published=false` + `scheduled_publish_time` (Unix timestamp)
- Window: 10 minutes to 75 days

---

## Instagram (Content Publishing API)

### Post Types

| Post Type | media_type | Description |
|-----------|-----------|-------------|
| Single Image | `IMAGE` | One photo with caption |
| Single Video/Reel | `VIDEO` / `REELS` | Reels |
| Carousel | `CAROUSEL` | 2-10 images/videos |
| Stories | `STORIES` | 24-hour ephemeral content |

### 2-Step Publishing Flow

**Step 1 - Create Container**: `POST /{ig-user-id}/media`
**Step 2 - Publish Container**: `POST /{ig-user-id}/media_publish` with `creation_id`

For videos, poll container status (`GET /{container-id}?fields=status_code`) until `FINISHED` before publishing.

### Carousel Flow (3 steps)
1. Create item containers with `is_carousel_item=true`
2. Create carousel container with `media_type=CAROUSEL` and `children={id1},{id2},...`
3. Publish carousel via `media_publish`

### Image Requirements
- Required: `image_url` (publicly accessible HTTPS)
- Formats: JPEG, PNG
- Max file size: 8 MB
- Aspect ratios: 1:1, 4:5 (recommended), 1.91:1
- Width: 320px min, 1440px max

### Video/Reel Requirements
- Required: `video_url` (HTTPS), `media_type=REELS`
- Formats: MP4, MOV (H.264, AAC)
- Max file size: 1 GB
- Duration: 3 seconds to 15 minutes
- Frame rate: 23-60 FPS
- Aspect ratios: 9:16 (recommended), 1:1, 16:9

### Caption Limits
- Max: 2,200 characters
- Hashtags: max 30 per post (in caption)
- @mentions: max 20 per post

### Container Status Values
`EXPIRED` | `ERROR` | `FINISHED` | `IN_PROGRESS` | `PUBLISHED`

Container TTL: 24 hours (must publish within 24 hours of creation).

### Scheduling
- **Natively supported** (added 2024): `published=false` + `scheduled_publish_time`

---

## Threads API

### Post Types

| Post Type | media_type | Description |
|-----------|-----------|-------------|
| Text-only | `TEXT` | Text post, no media |
| Single Image | `IMAGE` | One image with optional text |
| Single Video | `VIDEO` | One video with optional text |
| Carousel | `CAROUSEL` | Up to 10 images/videos |

### 2-Step Publishing Flow (same as Instagram)

**Step 1**: `POST /{threads-user-id}/threads`
**Step 2**: `POST /{threads-user-id}/threads_publish` with `creation_id`

### Carousel Flow (3-step, same as Instagram)

### Text Limits
- **500 characters** strict limit
- Links in text auto-unfurl

### Image Requirements
- Formats: JPEG, PNG
- Max file size: 8 MB
- Max in carousel: 10

### Video Requirements
- Formats: MP4, MOV
- Max file size: 1 GB
- Max duration: 5 minutes
- Max in carousel: 10

### Reply/Thread Chain Support
- `reply_to_id`: Platform post ID of the Threads post to reply to
- `reply_control`: `everyone` | `accounts_you_follow` | `mentioned_only`
- `quote_post_id`: Quote another thread

### Container Status
Same as Instagram: `IN_PROGRESS` | `FINISHED` | `ERROR` | `EXPIRED` | `PUBLISHED`

---

## Authentication (Cross-Platform)

All three platforms use **Facebook Login** (OAuth 2.0) via the same Meta app.

### Required Scopes

**Facebook Pages:**
- `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`, `pages_read_user_content`, `pages_manage_metadata`
- Uses Page Access Token (long-lived, derived from user token + page ID)

**Instagram:**
- `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`
- Also needs `pages_show_list`, `pages_read_engagement`
- IG User ID retrieved via `GET /me/accounts` -> page -> `instagram_business_account`

**Threads:**
- `threads_basic`, `threads_content_publish`, `threads_manage_replies`, `threads_read_replies`
- Separate OAuth flow (as of mid-2024), but same Meta app

### Token Architecture

| Token Type | Lifespan | Notes |
|-----------|----------|-------|
| Short-lived User Token | ~1-2 hours | From OAuth flow |
| Long-lived User Token | ~60 days | Exchanged from short-lived |
| Page Access Token | **Does not expire** | Derived from long-lived user token |
| Instagram Token | Derived from Page Access Token | |
| Threads Token | ~60 days | Separate, needs refresh |

---

## Rate Limits

### Facebook Pages
- 200 posts/hour/Page
- 50 API calls/user/hour/app
- Batch API: up to 50 requests per batch

### Instagram Content Publishing
- **50 API-published posts per 24 hours** per IG account (all types)
- Container creation does NOT count against publishing limit
- Headers: `x-app-usage`, `x-business-use-case-usage`

### Threads
- 250 posts/24 hours/user
- 1,000 replies/24 hours/user
- 200 calls/user/hour

---

## Schema Implications

### Platform-specific media type (on PlatformPost)
- Facebook: `text`, `photo`, `multi_photo`, `video`, `link`, `reel`
- Instagram: `IMAGE`, `VIDEO`, `REELS`, `CAROUSEL`, `STORIES`
- Threads: `TEXT`, `IMAGE`, `VIDEO`, `CAROUSEL`

### Container ID tracking (Instagram + Threads)
- `container_id` on PlatformPost
- `container_status` (in_progress/finished/error/expired/published)
- For carousels: child container IDs (JSONB array or join table)
- Container TTL: 24 hours

### Media table enrichments
- `width`, `height` (INTEGER)
- `duration_ms` (INTEGER, nullable)
- `thumbnail_url` (TEXT, nullable)
- `platform_media_id` (media_fbid from Facebook)
- `sort_order` (INTEGER, for carousels)

### Platform post media join table
- `platform_post_id`, `media_id`, `sort_order`, `container_id` (for IG/Threads child containers)

### Platform connections table
- `platform`, `platform_user_id`, `platform_page_id`, `platform_page_name`
- `access_token` (encrypted), `refresh_token` (encrypted)
- `token_expires_at`, `scopes` (JSONB), `status`

### PlatformPost enrichments
- `platform_media_type` -- platform-specific post type enum
- `container_id`, `container_status`, `container_created_at`
- `scheduled_publish_time` (Unix, for FB/IG native scheduling)
- `reply_to_platform_post_id` (self-ref FK, for Threads chains)
- `reply_control` (Threads: everyone/accounts_you_follow/mentioned_only)
- `platform_metadata` (JSONB for extras: FB `place`, IG `location_id`, `collaborators`, `cover_url`)

### Text constraints (app-level validation)
- Facebook: 63,206 chars
- Instagram: 2,200 chars
- Threads: 500 chars

### Key relationships
```
Account 1--* PlatformConnection
Post    1--* PlatformPost
PlatformPost *--* Media (via join table with sort_order + container_id)
PlatformPost *--1 PlatformConnection
PlatformPost 0--1 PlatformPost (self-ref for Threads reply chains)
```
