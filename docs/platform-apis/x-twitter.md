# X (Twitter) API v2 -- Publishing Reference

## Post Types

| Post Type | API Mechanism | Constraints |
|-----------|--------------|-------------|
| Text-only | `POST /2/tweets` with `text` only | `text` is required |
| With images | Upload media first, pass `media.media_ids[]` | Up to 4 images |
| With video | Upload media first, pass `media.media_ids[]` | Exactly 1 video |
| With GIF | Upload media first, pass `media.media_ids[]` | Exactly 1 GIF |
| Poll | `poll.options[]` + `poll.duration_minutes` | 2-4 options; cannot combine with media |
| Quote tweet | `quote_tweet_id` field | Can include text + media |
| Thread | Sequential `POST /2/tweets` with `reply.in_reply_to_tweet_id` | No hard API limit on length |
| Reply | `reply.in_reply_to_tweet_id` | Same as thread mechanism |

**Mutually exclusive constraints:**
- Media (images/video/GIF) and polls CANNOT coexist
- Only 1 video OR 1 GIF per tweet (not both)
- Up to 4 images per tweet (no video/GIF if images present)
- Quote tweet CAN include text and media

## Text Limits

| Tier | Character Limit |
|------|----------------|
| Standard (Free/Basic/Pro) | **280 characters** |
| X Premium | **Up to 25,000 characters** |
| URLs | Always count as **23 characters** (t.co wrapping) |

## Media Upload

### Supported Formats

| Media Type | Formats | Max File Size | Max Dimensions |
|-----------|---------|---------------|----------------|
| Images | JPEG, PNG, WEBP | 5 MB | 4096x4096 px |
| Animated GIF | GIF | 15 MB | 1280x1080 px |
| Video | MP4 (H.264 video, AAC audio) | 512 MB (chunked) | 1920x1200 or 1200x1920 |

### Video Constraints
- Duration: 0.5s to 140s (2 min 20 sec)
- Frame rate: 40fps max
- Bitrate: 25 Mbps max
- Audio: AAC LC, up to 128kbps stereo

### Upload Flow (Two-Phase via v1.1)

The media upload uses **v1.1** (no v2 media upload endpoint exists):

1. **INIT**: `POST https://upload.twitter.com/1.1/media/upload.json` with `command=INIT`, `total_bytes`, `media_type`, `media_category`
2. **APPEND**: Same endpoint with `command=APPEND`, `media_id`, `segment_index`, binary chunk
3. **FINALIZE**: Same endpoint with `command=FINALIZE`, `media_id`
4. **STATUS (video only)**: `GET` same endpoint with `command=STATUS&media_id=` -- poll until processing completes

Returns `media_id_string` for use in `POST /2/tweets`.

### Alt Text
- Endpoint: `POST https://upload.twitter.com/1.1/media/metadata/create.json`
- Max: **1,000 characters**
- Set AFTER `FINALIZE`, BEFORE tweet creation
- Supported for images and GIFs only (not video)

## Thread Support

Threads are NOT a first-class API concept. They are sequential tweets with `reply.in_reply_to_tweet_id`:

1. Post tweet #1 -> get `tweet_id_1`
2. Post tweet #2 with `reply.in_reply_to_tweet_id = tweet_id_1` -> get `tweet_id_2`
3. Continue...

Each tweet in a thread can independently have media.

## API Endpoints

### Tweet Management (v2)

| Action | Method | Endpoint |
|--------|--------|----------|
| Create tweet | POST | `https://api.x.com/2/tweets` |
| Delete tweet | DELETE | `https://api.x.com/2/tweets/:id` |
| Get tweet | GET | `https://api.x.com/2/tweets/:id` |

### POST /2/tweets Request Body

```json
{
  "text": "string (required*)",
  "media": {
    "media_ids": ["string"],
    "tagged_user_ids": ["string"]
  },
  "poll": {
    "options": ["string"],
    "duration_minutes": 1440
  },
  "reply": {
    "in_reply_to_tweet_id": "string",
    "exclude_reply_user_ids": ["string"]
  },
  "quote_tweet_id": "string",
  "reply_settings": "mentionedUsers | following | everyone",
  "for_super_followers_only": false,
  "geo": {
    "place_id": "string"
  }
}
```

*`text` is required UNLESS posting media-only.

## Required vs Optional Fields

| Post Type | Required Fields | Optional Fields |
|-----------|----------------|-----------------|
| Text-only | `text` | `reply_settings`, `geo`, `quote_tweet_id` |
| With images | `media.media_ids` (1-4) | `text`, `media.tagged_user_ids` |
| With video | `media.media_ids` (1) | `text`, `reply_settings` |
| With GIF | `media.media_ids` (1) | `text`, `reply_settings` |
| Poll | `text`, `poll.options` (2-4), `poll.duration_minutes` | `reply_settings` |
| Quote tweet | `quote_tweet_id` | `text`, `media` |
| Reply/Thread | `text` OR `media`, `reply.in_reply_to_tweet_id` | `reply.exclude_reply_user_ids` |

## Scheduling

**NOT supported natively.** Must implement server-side scheduling with a worker polling for `status = 'scheduled' AND scheduled_at <= NOW()`.

## Authentication

| Method | Supported | Use Case |
|--------|-----------|----------|
| OAuth 1.0a User Context | Yes | Posting on behalf of a user |
| OAuth 2.0 PKCE | Yes | Modern flow, recommended for new apps |
| OAuth 2.0 App-Only | NO for posting | Read-only |

### Required Scopes (OAuth 2.0 PKCE)

| Scope | Purpose |
|-------|---------|
| `tweet.read` | Reading tweets |
| `tweet.write` | Creating and deleting tweets |
| `users.read` | Reading user profile info |
| `media.write` | Uploading media |
| `offline.access` | Refresh tokens |

### OAuth 1.0a
Requires: API Key, API Secret, Access Token, Access Token Secret (per-user).

## Rate Limits

### Tweet Creation

| Access Level | Per 24 hours | Monthly |
|-------------|-------------|---------|
| Free | 17 tweets/day | 500 |
| Basic | 100 tweets/day | 3,000 |
| Pro | 100 tweets/day | 300,000 |
| Enterprise | Custom | Custom |

### Media Upload
- 15 INIT requests per 15-minute window
- 15 FINALIZE requests per 15-minute window

## Schema Implications

### Posts table additions
- `thread_id` (UUID, nullable) -- groups tweets in a thread
- `thread_position` (INTEGER, nullable) -- order within thread
- `parent_post_id` (UUID, nullable, FK to posts.id) -- previous post in thread
- `quote_tweet_url` (TEXT, nullable)
- `reply_settings` (VARCHAR(20), nullable) -- everyone/mentionedUsers/following

### Media table additions
- `media_category` (VARCHAR(20)) -- tweet_image/tweet_gif/tweet_video
- `alt_text` (VARCHAR(1000), nullable)
- `width`, `height` (INTEGER, nullable)
- `duration_ms` (INTEGER, nullable)
- `upload_status` (VARCHAR(20)) -- pending/uploading/processing/ready/failed
- `platform_media_id` (VARCHAR(64), nullable) -- media_id_string from X
- `position` (INTEGER, default 0)

### Poll tables
- `post_polls`: poll_id, post_id, duration_minutes (5-10080)
- `poll_options`: option_id, poll_id, position (0-3), label (VARCHAR(25))

### Platform connections
- `auth_method` -- oauth1/oauth2
- `access_token`, `access_token_secret` (OAuth 1.0a), `refresh_token` (OAuth 2.0)
- `token_expires_at`, `scopes`, `platform_user_id`, `is_premium` (boolean)

### Validation Rules
- Text: <= 280 chars (standard), <= 25,000 (Premium)
- Poll options: 2-4 options, each <= 25 chars
- Poll duration: 5-10,080 minutes
- Images: 1-4 per post, <= 5 MB each
- Video: exactly 1, <= 512 MB, 0.5s-140s
- GIF: exactly 1, <= 15 MB
- Alt text: <= 1,000 chars
- Media + poll: mutually exclusive
