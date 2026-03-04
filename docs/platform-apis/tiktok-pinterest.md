# TikTok & Pinterest APIs -- Publishing Reference

## TikTok Content Posting API

### Post Types
- **Video posts** -- single video upload (primary post type)
- **Photo posts (Photo Mode)** -- 1-35 images as slideshow with music
- **Direct post vs. Inbox upload** -- two distinct API flows

### Video Requirements

| Field | Constraint |
|-------|-----------|
| Formats | MP4, WebM, MOV |
| Codecs | H.264 (video), AAC (audio) |
| Max file size | 4 GB |
| Duration | 1 second to 10 minutes (60 min for some accounts) |
| Min resolution | 360p |
| Recommended aspect ratio | 9:16 (vertical), 1:1, 16:9 |
| Frame rate | 24-60 fps |

### Photo Post Requirements

| Field | Constraint |
|-------|-----------|
| Formats | JPEG, PNG, WebP |
| Max photos per post | **35** |
| Min photos per post | 1 |
| Recommended size | 1080x1920 (9:16) |
| Max file size per image | 20 MB |

### Caption Limits
- **2,200 characters** max
- No separate title field -- TikTok uses description only
- Hashtags and mentions included in character limit

### API Flow: Direct Post vs. Inbox Upload

**Direct Post (`post_mode: DIRECT_POST`):**
- Published directly to user's profile
- Requires `video.publish` scope (higher tier)

**Inbox Upload (`post_mode: FILE_UPLOAD`):**
- Uploaded to creator's TikTok inbox (drafts)
- Creator must manually publish from inbox
- Requires only `video.upload` scope (easier approval)

**Upload flow (both modes):**
1. `POST /v2/post/publish/inbox/video/init/` or `/v2/post/publish/video/init/` -- get `publish_id` and `upload_url`
2. Upload file chunks to `upload_url`
3. Poll status via `publish_id`

### Privacy Levels (Required)

| Value | Description |
|-------|-------------|
| `PUBLIC_TO_EVERYONE` | Visible to all |
| `MUTUAL_FOLLOW_FRIENDS` | Mutual followers only |
| `FOLLOWER_OF_CREATOR` | Followers only |
| `SELF_ONLY` | Private |

### Required vs Optional Fields

**Required:**
- `post_info.description` (can be empty string)
- `post_info.privacy_level` (one of 4 values)
- `source_info` (video URL or photo URLs)
- `post_mode` (DIRECT_POST or FILE_UPLOAD)

**Optional:**
- `disable_comment` (boolean)
- `disable_duet` (boolean)
- `disable_stitch` (boolean)
- `video_cover_timestamp_ms` (integer)
- `brand_content_toggle` (boolean)
- `brand_organic_toggle` (boolean)
- `is_aigc` (boolean -- AI-generated content disclosure)

### Authentication
- **OAuth 2.0** Authorization Code flow
- Scopes: `video.upload`, `video.publish`, `user.info.basic`
- Access token: ~24 hours, refresh token: long-lived

### Rate Limits
- Per-user limits vary by app approval tier
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Scheduling
**NOT supported natively.** Must implement server-side scheduling.

---

## Pinterest API (v5)

### Pin Types

| Type | API Support | Description |
|------|-----------|-------------|
| Standard Pin | Full CRUD via `POST /v5/pins` | Image + description + link |
| Video Pin | Supported via `POST /v5/pins` with video upload | Video + description + link |
| Idea Pins | Limited/deprecated API support | Multi-page media stories |
| Product Pins | Via catalog feed or Rich Pin metadata | Shopping pins with price |

Focus on `standard` and `video` for MVP.

### Image Requirements

| Field | Constraint |
|-------|-----------|
| Formats | JPEG, PNG, TIFF, BMP, WebP, GIF |
| Recommended aspect ratio | **2:3** (1000x1500 px) |
| Minimum size | 100x200 pixels |
| Max file size | 20 MB |
| Other ratios | 1:1, 3:4, 4:5, 9:16 |

### Video Requirements

| Field | Constraint |
|-------|-----------|
| Formats | MP4, MOV, M4V |
| Codecs | H.264 (video), AAC (audio) |
| Duration | 4 seconds to 15 minutes |
| Min resolution | 240p |
| Recommended | 1080p+ |
| Aspect ratios | 1:1, 2:3, 9:16, 16:9 |
| Max file size | 2 GB |
| Frame rate | 25+ fps |

### Description, Title, and Link Limits

| Field | Limit | Required |
|-------|-------|----------|
| Title | **100 characters** | Optional (recommended for SEO) |
| Description | **500 characters** | Optional (recommended) |
| Link URL | Valid URL | Optional (core to Pinterest's value) |
| Alt text | **500 characters** | Optional (accessibility) |

### Board Assignment
- **`board_id` is REQUIRED** when creating a pin
- Board sections: optional via `board_section_id`
- API: `GET /v5/boards` (list), `POST /v5/boards` (create)

### Rich Pin Metadata
Rich Pins are NOT set via API -- automatically applied when `link` URL has proper Open Graph / Schema.org markup. No additional schema fields needed.

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /v5/pins` | POST | Create pin (image or video) |
| `GET /v5/pins/{pin_id}` | GET | Get pin details |
| `PATCH /v5/pins/{pin_id}` | PATCH | Update pin |
| `DELETE /v5/pins/{pin_id}` | DELETE | Delete pin |
| `GET /v5/boards` | GET | List user's boards |
| `POST /v5/boards` | POST | Create a board |
| `POST /v5/media` | POST | Register media upload (video) |
| `GET /v5/media/{media_id}` | GET | Check upload status |

### Video Upload Flow
1. `POST /v5/media` -- register media, get `media_id` and `upload_url`
2. Upload video to `upload_url`
3. `GET /v5/media/{media_id}` -- poll until `status: succeeded`
4. `POST /v5/pins` with `media_source.media_id`

### Authentication
- **OAuth 2.0** Authorization Code flow
- Scopes: `boards:read`, `boards:write`, `pins:read`, `pins:write`, `user_accounts:read`
- Access token: ~1 hour, refresh token: ~30 days

### Rate Limits
- 1,000 requests/minute/user (standard tier)
- Lower limits for write operations
- 200 requests/second/app across all users
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Scheduling
**NOT supported natively.** Must implement server-side scheduling.

---

## Schema Implications

### New Enums

```sql
-- TikTok privacy levels
tiktok_privacy: 'PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'

-- TikTok publish mode
tiktok_publish_mode: 'direct_post', 'inbox_upload'

-- Pinterest pin type
pinterest_pin_type: 'standard', 'video', 'idea', 'product'

-- Async upload status (both platforms)
upload_status: 'initialized', 'uploading', 'processing', 'succeeded', 'failed'
```

### Media Table Additions
- `width`, `height` (INTEGER)
- `duration_seconds` (INTEGER, nullable)
- `position` (INTEGER) -- ordering within post
- `alt_text` (TEXT, nullable)

### Platform Settings (JSONB on platform_posts)

**TikTok:**
```json
{
  "privacy_level": "PUBLIC_TO_EVERYONE",
  "publish_mode": "direct_post",
  "disable_comment": false,
  "disable_duet": false,
  "disable_stitch": false,
  "video_cover_timestamp_ms": 3000,
  "brand_content_toggle": false,
  "is_aigc": true,
  "tiktok_publish_id": "abc123"
}
```

**Pinterest:**
```json
{
  "pin_type": "standard",
  "board_id": "123456789012345678",
  "board_section_id": null,
  "title": "My Pin Title",
  "link_url": "https://myproduct.com",
  "alt_text": "Descriptive alt text",
  "pinterest_media_id": "xyz789"
}
```

### Pinterest Boards Table

```sql
pinterest_boards:
  id                  UUID PK
  account_id          UUID FK -> accounts
  pinterest_board_id  TEXT NOT NULL  -- Pinterest's external ID
  name                TEXT NOT NULL
  description         TEXT
  privacy             TEXT  -- 'public', 'secret', 'protected'
  synced_at           TIMESTAMPTZ
  created_at          TIMESTAMPTZ
```

Required because `board_id` is mandatory for Pinterest pin creation.

### Platform Connections

```sql
platform_connections:
  id                  UUID PK
  account_id          UUID FK -> accounts
  platform            TEXT NOT NULL  -- tiktok, pinterest, etc.
  access_token        TEXT NOT NULL  -- encrypted
  refresh_token       TEXT
  token_expires_at    TIMESTAMPTZ
  scopes              TEXT[] or JSONB
  platform_user_id    TEXT  -- tiktok_open_id or pinterest_user_id
  platform_username   TEXT
  is_active           BOOLEAN DEFAULT true
  created_at          TIMESTAMPTZ
  updated_at          TIMESTAMPTZ
  UNIQUE(account_id, platform)
```

### Async Upload Tracking (on platform_posts)
- `upload_status` -- enum: initialized/uploading/processing/succeeded/failed
- `platform_upload_id` -- tiktok_publish_id or pinterest_media_id
- `upload_started_at`, `upload_completed_at` (TIMESTAMPTZ)

### Key Constraints

| Platform | Field | Constraint |
|----------|-------|-----------|
| TikTok | description | max 2,200 chars |
| TikTok | photos per post | max 35 |
| TikTok | video file size | max 4 GB |
| TikTok | video duration | 1s-600s |
| TikTok | privacy_level | required, 4 enum values |
| Pinterest | title | max 100 chars |
| Pinterest | description | max 500 chars |
| Pinterest | alt_text | max 500 chars |
| Pinterest | board_id | required for pin creation |
| Pinterest | image file size | max 20 MB |
| Pinterest | video file size | max 2 GB |
| Pinterest | video duration | 4s-900s |
