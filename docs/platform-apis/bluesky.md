# BlueSky AT Protocol -- Publishing Reference

## Post Types

All posts are `app.bsky.feed.post` records. Post type is determined by the `embed` object (if any).

| Post Type | Embed `$type` | Key Fields |
|-----------|--------------|------------|
| Text-only | No embed | Just `text` + `createdAt` |
| With Images | `app.bsky.embed.images` | `images[]` (max 4), each with blob ref + `alt` + optional `aspectRatio` |
| With Video | `app.bsky.embed.video` | `video` blob ref + optional `captions[]` + optional `alt` + optional `aspectRatio` |
| External Link | `app.bsky.embed.external` | `external.uri` + `title` + `description` + optional `thumb` |
| Quote Post | `app.bsky.embed.record` | `record.uri` (AT URI) + `record.cid` (CID hash) |
| Quote + Media | `app.bsky.embed.recordWithMedia` | `record` (quote) + `media` (images or external) |

A single post can only have ONE embed type (except `recordWithMedia` which is the compound case).

## Text Limits & Facets

### Text Constraints
- **Maximum**: 300 **graphemes** (Unicode grapheme clusters, UAX #29)
- **Max bytes**: 3,000 UTF-8 bytes
- Empty string `""` is valid
- `text` field is required, even if empty

### Facets (Rich Text Annotations)

Facets annotate **byte offset ranges** in UTF-8 encoded text (not markdown/HTML):

```json
{
  "index": { "byteStart": 14, "byteEnd": 28 },
  "features": [
    { "$type": "app.bsky.richtext.facet#link", "uri": "https://example.com" }
  ]
}
```

| Feature Type | Fields | Notes |
|-------------|--------|-------|
| `#link` | `uri` (required) | URL the text links to |
| `#mention` | `did` (required) | DID of mentioned user |
| `#tag` | `tag` (required) | Hashtag value WITHOUT `#` prefix |

- `byteStart` is inclusive, `byteEnd` is exclusive
- Byte offsets reference UTF-8 encoding of `text`
- Must resolve handles to DIDs before constructing mention facets

## Media Upload (Blob System)

Media is uploaded via `com.atproto.repo.uploadBlob` BEFORE creating the post.

### Images

| Constraint | Value |
|-----------|-------|
| Max per post | **4** |
| Max file size | **1 MB (1,000,000 bytes)** |
| Supported MIME types | image/jpeg, image/png, image/webp, image/gif (static only) |
| Alt text | Optional per image |
| Aspect ratio | Optional `{ width, height }` |

### Video

| Constraint | Value |
|-----------|-------|
| Max per post | **1** |
| Max file size | **50 MB** |
| Format | video/mp4 (H.264 recommended) |
| Max duration | 60 seconds |
| Max dimensions | 1920x1080 recommended |
| Captions | Optional `captions[]` with `lang` + VTT blob ref |

**Video upload flow** (different from images):
1. `app.bsky.video.uploadVideo` -- returns `jobStatus`
2. Poll `app.bsky.video.getJobStatus` until processing completes
3. Use resulting blob ref in post embed

### Blob Reference Structure
```json
{
  "$type": "blob",
  "ref": { "$link": "bafkrei..." },
  "mimeType": "image/jpeg",
  "size": 524288
}
```

## Thread / Reply Support

Replies use a `reply` object with two required references:

```json
{
  "reply": {
    "root": { "uri": "at://did:plc:.../app.bsky.feed.post/abc", "cid": "bafyrei..." },
    "parent": { "uri": "at://did:plc:.../app.bsky.feed.post/xyz", "cid": "bafyrei..." }
  }
}
```

| Field | Description |
|-------|-------------|
| `reply.root` | Original/first post in the thread |
| `reply.parent` | Direct parent being replied to |

- For direct reply to original: `root` and `parent` are the same
- Both `root` and `parent` required if `reply` is present
- AT URI format: `at://{did}/{collection}/{rkey}`

For threads, each subsequent post references the first as `root` and the preceding as `parent`.

## API Endpoints

### Creating a Post

`POST https://bsky.social/xrpc/com.atproto.repo.createRecord`

```json
{
  "repo": "did:plc:abc123",
  "collection": "app.bsky.feed.post",
  "record": {
    "$type": "app.bsky.feed.post",
    "text": "Hello world",
    "createdAt": "2024-01-15T12:00:00.000Z"
  }
}
```

Response: `{ "uri": "at://did:plc:.../app.bsky.feed.post/3jui...", "cid": "bafyreig..." }`

### Other Endpoints

| Action | Endpoint |
|--------|----------|
| Upload blob | `POST /xrpc/com.atproto.repo.uploadBlob` |
| Create session | `POST /xrpc/com.atproto.server.createSession` |
| Refresh session | `POST /xrpc/com.atproto.server.refreshSession` |
| Delete post | `POST /xrpc/com.atproto.repo.deleteRecord` |
| Resolve handle | `GET /xrpc/com.atproto.identity.resolveHandle` |

## Record Fields

| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| `$type` | Yes | string | `"app.bsky.feed.post"` |
| `text` | Yes | string | Max 300 graphemes, 3000 bytes |
| `createdAt` | Yes | ISO 8601 | Client-asserted timestamp |
| `facets` | No | array | Rich text annotations |
| `embed` | No | union | images/video/external/record/recordWithMedia |
| `reply` | No | object | `{ root, parent }` |
| `langs` | No | string[] | BCP-47 tags, max 3 |
| `labels` | No | union | Content warnings / self-labels |
| `tags` | No | string[] | Non-visible categorization, max 8, each max 640 bytes |

## Self-Labels / Content Warnings

```json
{
  "labels": {
    "$type": "com.atproto.label.defs#selfLabels",
    "values": [{ "val": "sexual" }]
  }
}
```

Known values: `sexual`, `nudity`, `porn`, `graphic-media`, `!no-unauthenticated`

## Authentication

### App Passwords
BlueSky uses app passwords (NOT the main account password):
- Format: `xxxx-xxxx-xxxx-xxxx`
- Generated in BlueSky settings

### Session Flow
1. `createSession` with identifier (handle/DID) + password (app password)
2. Returns: `accessJwt` (~2hr), `refreshJwt` (~90 days), `did`, `handle`
3. Use `accessJwt` in `Authorization: Bearer {accessJwt}` header
4. Refresh with `refreshSession` when expired

### DID (Decentralized Identifier)
- Format: `did:plc:xxxxxxxxxxxxxxxxxxxxx` or `did:web:domain.com`
- Stable, permanent identifier (handles can change)
- Required as `repo` parameter

### Credential Storage
- `identifier` -- handle or DID
- `app_password` -- encrypted at rest
- `did` -- user's DID
- `access_jwt`, `refresh_jwt` -- session tokens
- `session_expires_at`

## Rate Limits

| Operation | Limit | Window |
|-----------|-------|--------|
| `createRecord` (posts) | ~1,667-5,000/day | Rolling 24h |
| `createRecord` burst | ~80/hour | Hourly |
| `uploadBlob` | 1,000/day | Rolling 24h |
| `uploadBlob` max size | 1 MB per image | Per request |
| `createSession` | ~30/5 min | Per IP |
| General XRPC | ~3,000/5 min | Per user |

Rate limit headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `RateLimit-Policy`.
HTTP 429 with `Retry-After` when exceeded.

## Scheduling

**NOT supported natively.** Must implement server-side scheduling.

## Schema Implications

### Post/content fields
- `text` (TEXT, validate at 300 graphemes, 3000 UTF-8 bytes)
- `facets` (JSONB array of `{ index: {byteStart, byteEnd}, features: [{$type, uri/did/tag}] }`)
- `embed_type` (enum: none/images/video/external/record/record_with_media)
- `reply_root_uri`, `reply_root_cid` (TEXT, nullable)
- `reply_parent_uri`, `reply_parent_cid` (TEXT, nullable)
- `quote_uri`, `quote_cid` (TEXT, nullable)
- `langs` (TEXT[] or JSONB, max 3)
- `self_labels` (TEXT[] or JSONB)
- `tags` (TEXT[] or JSONB, max 8, each max 640 bytes)

### Media/blob fields
- `blob_cid` (content-addressed hash)
- `alt_text`, `aspect_ratio_width/height`
- `media_position` (INT, 0-3 for images)
- `mime_type` constraints per type
- `size_bytes` (max 1MB images, 50MB video)

### External embed fields
- `external_uri`, `external_title`, `external_description`
- `external_thumb_blob_cid` (nullable)

### Platform post result
- `platform_post_uri` (AT URI from createRecord)
- `platform_post_cid` (CID from createRecord)
- `rkey` (record key portion) -- critical for thread building

### Key Constraints
1. Text: 300 graphemes (app-level validation)
2. Images: max 4, max 1 MB each
3. Video: max 1, max 50 MB, max 60s
4. Embed union: at most ONE embed type
5. Reply: root and parent must both be present or both absent
6. Langs: max 3 items
7. Tags: max 8 items, each max 640 bytes
