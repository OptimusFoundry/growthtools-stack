# LinkedIn API -- Publishing Reference

## Post Types

Single unified endpoint: `POST https://api.linkedin.com/rest/posts`

| Content Type | Organic | Sponsored | Content Field Key |
|-------------|---------|-----------|-------------------|
| Text-only | Yes | Yes | `content` omitted |
| Single Image | Yes | Yes | `content.media.id` = `urn:li:image:{id}` |
| Single Video | Yes | Yes | `content.media.id` = `urn:li:video:{id}` |
| Document (PDF/PPT/DOC) | Yes | Yes | `content.media.id` = `urn:li:document:{id}` |
| Article (link share) | Yes | Yes | `content.article` |
| MultiImage (2-20) | Yes | No | `content.multiImage.images[]` |
| Poll | Yes | No | `content.poll` |
| Carousel | No | Yes only | `content.carousel` |
| Celebration | Yes | No | `content.celebration` |
| Reshare | Yes | Yes | `reshareContext.parent` URN |

## Text / Character Limits

| Field | Max Length |
|-------|-----------|
| Post commentary | **3,000 characters** |
| Article title | 400 characters |
| Article description | 4,086 characters |
| Poll question | 140 characters |
| Poll option text | 30 characters |
| Image alt text | 4,086 characters (recommended < 120) |

### `little` Text Format

Commentary uses LinkedIn's `little` text format:
- Plain text
- Mentions: `@[Name](urn:li:person:123)` or `@[Name](urn:li:organization:123)`
- Hashtags: `#hashtag` or `{hashtag|\#|tagname}`
- Reserved characters that must be escaped: `| { } @ [ ] ( ) < > # \ * _ ~`

## Media Upload

### Images (Images API)

Endpoint: `POST https://api.linkedin.com/rest/images?action=initializeUpload`

| Property | Value |
|----------|-------|
| Formats | JPG, GIF, PNG |
| Max pixel count | 36,152,320 pixels (~6016x6016) |
| GIF frame limit | 250 frames |
| File size | ~10 MB practical limit |
| Images per MultiImage post | Min 2, **Max 20** |
| Upload method | 2-step: initializeUpload returns `uploadUrl`, then PUT binary |
| URN format | `urn:li:image:{id}` |
| Alt text max | 4,086 characters |

### Videos (Videos API)

Endpoint: `POST https://api.linkedin.com/rest/videos?action=initializeUpload`

| Property | Value |
|----------|-------|
| Format | MP4 only |
| Min file size | 75 KB |
| Max file size | **500 MB** (up to 5 GB for `fileSizeBytes`) |
| Duration | 3 seconds to 30 minutes |
| Upload method | Multi-part chunked (4 MB parts), then finalizeUpload |
| Captions | Optional SRT file (`uploadCaptions: true`) |
| Thumbnail | Optional custom upload (`uploadThumbnail: true`) |
| URN format | `urn:li:video:{id}` |

### Documents (Documents API)

Endpoint: `POST https://api.linkedin.com/rest/documents?action=initializeUpload`

| Property | Value |
|----------|-------|
| Formats | PPT, PPTX, DOC, DOCX, PDF |
| Max file size | **100 MB** |
| Max pages | 300 |
| Upload method | 2-step: initializeUpload, then PUT binary |
| URN format | `urn:li:document:{id}` |
| Title field | Required for document posts |

### Media Asset Status Lifecycle
- `WAITING_UPLOAD` -- upload not yet received
- `PROCESSING` -- generating artifacts
- `PROCESSING_FAILED` -- failed
- `AVAILABLE` -- ready to use

## Article Content

Via the API, an "article" is a **link share with metadata**, NOT a rich-text article body.

| Field | Type | Required | Constraint |
|-------|------|----------|------------|
| `source` | URL | Required | Destination URL |
| `title` | String | Required | Max 400 chars |
| `description` | String | Optional | Max 4,086 chars |
| `thumbnail` | ImageURN | Optional | Must upload via Images API first |
| `thumbnailAltText` | String | Optional | Max 4,086 chars |

LinkedIn does NOT auto-populate metadata from the URL -- you must provide title, description, and thumbnail explicitly.

## API Endpoints

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create post | POST | `https://api.linkedin.com/rest/posts` |
| Get post | GET | `https://api.linkedin.com/rest/posts/{encoded URN}` |
| Batch get | GET | `https://api.linkedin.com/rest/posts?ids=List(...)` |
| Find by author | GET | `https://api.linkedin.com/rest/posts?author={URN}&q=author` |
| Update post | POST | `.../{encoded URN}` with `X-RestLi-Method: PARTIAL_UPDATE` |
| Delete post | DELETE | `https://api.linkedin.com/rest/posts/{encoded URN}` |
| Upload image | POST | `https://api.linkedin.com/rest/images?action=initializeUpload` |
| Upload video (init) | POST | `https://api.linkedin.com/rest/videos?action=initializeUpload` |
| Upload video (finalize) | POST | `https://api.linkedin.com/rest/videos?action=finalizeUpload` |
| Upload document | POST | `https://api.linkedin.com/rest/documents?action=initializeUpload` |

### Required Headers

```
Authorization: Bearer {token}
Linkedin-Version: {YYYYMM} (e.g., 202602)
X-Restli-Protocol-Version: 2.0.0
Content-Type: application/json
```

## Required vs Optional Fields

### Common Fields (all post types)

| Field | Required | Notes |
|-------|----------|-------|
| `author` | Required | `urn:li:person:{id}` or `urn:li:organization:{id}` |
| `commentary` | Required | `little` text format, max 3,000 chars |
| `visibility` | Required | `PUBLIC`, `CONNECTIONS`, `LOGGED_IN`, `CONTAINER` |
| `distribution.feedDistribution` | Required | `MAIN_FEED` or `NONE` |
| `lifecycleState` | Required | Must be `PUBLISHED` on creation |
| `content` | Optional | Omit for text-only |
| `contentCallToActionLabel` | Optional | APPLY, DOWNLOAD, LEARN_MORE, SIGN_UP, etc. |

### Per Content Type

| Type | Required content fields |
|------|----------------------|
| Text-only | None (omit `content`) |
| Image | `content.media.id` (ImageURN) |
| Video | `content.media.id` (VideoURN) |
| Document | `content.media.id` (DocumentURN), `content.media.title` (required) |
| Article | `content.article.source` (URL), `content.article.title` |
| MultiImage | `content.multiImage.images[]` (2-20 items), each with `.id` |
| Poll | `content.poll.question`, `content.poll.options[]` (2-4), `content.poll.settings.duration` |

## Visibility / Audience

| Value | Description |
|-------|-------------|
| `PUBLIC` | Anyone can view |
| `CONNECTIONS` | 1st-degree connections only |
| `LOGGED_IN` | Any logged-in member |
| `CONTAINER` | Delegated to container (e.g., group) |

### Audience Targeting (organization posts)

Via `distribution.targetEntities[]`:
- `geoLocations`, `seniorities`, `industries`, `jobFunctions`, `staffCountRanges`
- Targeted audience must be > 300 members

## Scheduling

**NOT supported natively.** No `scheduledAt` or scheduling parameter exists. `lifecycleState` must be `PUBLISHED` at creation. Must implement scheduling entirely on the server side.

## Authentication (OAuth 2.0)

3-legged OAuth 2.0 Authorization Code Flow.

| Step | URL |
|------|-----|
| Authorize | `GET https://www.linkedin.com/oauth/v2/authorization` |
| Token Exchange | `POST https://www.linkedin.com/oauth/v2/accessToken` |

### Token Details

| Property | Value |
|----------|-------|
| Access token lifespan | **60 days** |
| Refresh token | Available for approved partners |
| Token length | ~500 chars; plan for 1,000+ |

### Required Scopes

| Scope | Purpose |
|-------|---------|
| `w_member_social` | Post on behalf of a member |
| `w_organization_social` | Post on behalf of an org |
| `r_member_social` | Read member's posts |
| `r_organization_social` | Read org's posts |
| `rw_ads` | Sponsored/ad content |

## Rate Limits

- Limits reset at **midnight UTC** daily
- Two types: application-level and member-level
- HTTP 429 when exceeded
- Alerts at 75% usage
- Posting: ~100 posts/day/org (varies by partnership tier)
- API calls: ~100,000/day/app for marketing APIs

## Schema Implications

### Core post fields
- `author_urn`, `author_type` (PERSON/ORG)
- `commentary` (TEXT, max 3000 chars, `little` format)
- `visibility` (enum: PUBLIC/CONNECTIONS/LOGGED_IN/CONTAINER)
- `feed_distribution` (enum: MAIN_FEED/NONE)
- `content_type` (enum: TEXT/IMAGE/VIDEO/DOCUMENT/ARTICLE/MULTI_IMAGE/POLL/CAROUSEL/CELEBRATION/RESHARE)
- `cta_label`, `content_landing_page`
- `linkedin_post_urn` (returned after publish)

### Media assets table
- `urn`, `type` (IMAGE/VIDEO/DOCUMENT), `status` (lifecycle states)
- `file_size_bytes`, `mime_type`, `alt_text`, `title`
- `upload_url`, `upload_url_expires_at`, `download_url`
- `aspect_ratio_width/height`, `duration_ms` (video), `page_count` (document)

### Article fields
- `article_source_url` (required URL), `article_title` (max 400)
- `article_description` (max 4086), `article_thumbnail_urn`

### Poll fields
- `poll_question` (max 140 chars), `poll_duration` (ONE_DAY/THREE_DAYS/SEVEN_DAYS/FOURTEEN_DAYS)
- `poll_options[]`: text (max 30 chars), position, 2-4 options

### Auth storage
- `access_token` (encrypted, plan for 1000+ chars)
- `refresh_token`, `token_expires_at`
- `scopes`, `linkedin_person_urn`, `linkedin_organization_urns[]`

### Targeting
- JSONB column or separate table with arrays of URNs per facet
