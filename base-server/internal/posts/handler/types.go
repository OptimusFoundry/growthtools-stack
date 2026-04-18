package handler

import "encoding/json"

type CreatePostRequest struct {
	Title       *string  `json:"title"`
	Content     string   `json:"content" binding:"required"`
	ContentType string   `json:"content_type" binding:"required"`
	Tags        []string `json:"tags"`
	MediaIDs    []string `json:"media_ids"`
}

type UpdatePostRequest struct {
	Title       *string  `json:"title"`
	Content     *string  `json:"content"`
	ContentType *string  `json:"content_type"`
	Tags        []string `json:"tags"`
}

type PublishPostRequest struct {
	Platforms []string `json:"platforms" binding:"required"`
}

type SchedulePostRequest struct {
	ScheduledAt string `json:"scheduled_at" binding:"required"`
}

type PlatformContentInput struct {
	Platform       string           `json:"platform" binding:"required"`
	Content        *string          `json:"content"`
	ThreadSegments *json.RawMessage `json:"thread_segments"`
}

type SaveDraftRequest struct {
	Content     string                 `json:"content" binding:"required"`
	ContentType string                 `json:"content_type" binding:"required"`
	Tags        []string               `json:"tags"`
	MediaIDs    []string               `json:"media_ids"`
	AIGenerated bool                   `json:"ai_generated"`
	BaseContent *string                `json:"base_content"`
	Platforms   []PlatformContentInput `json:"platforms" binding:"required"`
}
