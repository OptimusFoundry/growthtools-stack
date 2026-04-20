package socialposts

// Event is the streaming event sum type. Use a type switch.
type Event interface{ isEvent() }

// PhaseEvent signals entry into a named generation phase.
// Platform is empty for global phases (describing, generating base).
type PhaseEvent struct{ Phase, Platform string }

// ChunkEvent carries a streamed AI token.
// Platform is empty for base-content tokens.
type ChunkEvent struct{ Platform, Chunk string }

// BaseDoneEvent signals completion of base content generation.
type BaseDoneEvent struct{ Content string }

// PlatformDoneEvent signals completion of one platform's output.
type PlatformDoneEvent struct {
	Platform string
	Result   PlatformResult
}

// ErrorEvent is the terminal error event. After this event the channel is closed.
type ErrorEvent struct{ Err error }

func (PhaseEvent) isEvent()        {}
func (ChunkEvent) isEvent()        {}
func (BaseDoneEvent) isEvent()     {}
func (PlatformDoneEvent) isEvent() {}
func (ErrorEvent) isEvent()        {}
