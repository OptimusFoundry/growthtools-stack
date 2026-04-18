package prompts

// VoiceContext holds optional voice profile fields for prompt injection.
type VoiceContext struct {
	Tone               string   `json:"tone,omitempty"`
	Style              string   `json:"style,omitempty"`
	Industry           string   `json:"industry,omitempty"`
	TargetAudience     string   `json:"target_audience,omitempty"`
	CustomInstructions string   `json:"custom_instructions,omitempty"`
	ExamplePosts       []string `json:"example_posts,omitempty"`
}
