package prompts

// ImageDescription holds info about an attached image for prompt injection.
type ImageDescription struct {
	Index       int
	Description string
}

// MediaPlan describes pre-assigned media attachments for a generated post.
// When Mode is "thread", the prompt instructs the AI to write copy aware of
// exactly which index sits on which segment (e.g. a demo video on segment 1).
// When Mode is "single", all attached media rides on the one post and the
// prompt just tells the AI what's attached so copy references it naturally.
// Indexes are 1-based to match [IMAGE:N] marker semantics.
type MediaPlan struct {
	// Mode is "single" or "thread". Empty string is treated as "thread" for
	// backwards compatibility with callers that predate mode selection.
	Mode string
	// ThreadParts is the exact number of parts to produce when Mode is
	// "thread". Ignored when Mode is "single". 0 means "use the platform
	// default or the caller-supplied override".
	ThreadParts int
	// VideoIndex is the 1-based index of an attached video clip, or 0 if none.
	VideoIndex int
	// ImageIndexes are the 1-based indexes of still images in order they
	// should be laid out across segments (after the video, if present).
	ImageIndexes []int
}
