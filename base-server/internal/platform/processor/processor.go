//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

package processor

import (
	"context"
	"errors"
	"net/http"
	"sync"
	"time"

	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"

	"github.com/google/uuid"
)

var (
	ErrInitiateOAuth       = errors.New("failed to initiate oauth")
	ErrHandleOAuthCallback = errors.New("failed to handle oauth callback")
	ErrConnectBluesky      = errors.New("failed to connect bluesky")
	ErrConnectThreads      = errors.New("failed to connect threads")
	ErrDisconnectPlatform  = errors.New("failed to disconnect platform")
	ErrListConnections     = errors.New("failed to list connections")
	ErrUnsupportedPlatform = errors.New("unsupported platform")
	ErrConnectionNotFound  = errors.New("platform connection not found")
	ErrAlreadyConnected    = errors.New("platform already connected")
	ErrTokenExchange       = errors.New("failed to exchange token")
	ErrMissingToken        = errors.New("no access token configured for platform")
	ErrTokenRefresh        = errors.New("failed to refresh token")
	ErrTokenRevoked        = errors.New("token has been revoked")
	ErrNoRefreshToken      = errors.New("no refresh token available")
)

// PlatformStore defines the database operations required by PlatformProcessor.
type PlatformStore interface {
	CreatePlatformConnection(ctx context.Context, params store.CreatePlatformConnectionParams) (store.PlatformConnection, error)
	GetPlatformConnectionByID(ctx context.Context, accountID, id uuid.UUID) (store.PlatformConnection, error)
	GetPlatformConnectionByAccountAndPlatform(ctx context.Context, accountID uuid.UUID, platform, platformUserID string) (store.PlatformConnection, error)
	ListPlatformConnectionsByAccount(ctx context.Context, accountID uuid.UUID) ([]store.PlatformConnection, error)
	UpdatePlatformConnectionStatus(ctx context.Context, accountID, id uuid.UUID, status string) error
	UpdatePlatformConnectionTokens(ctx context.Context, accountID, id uuid.UUID, accessToken string, refreshToken *string, expiresAt *time.Time) error
	DeletePlatformConnection(ctx context.Context, accountID, id uuid.UUID) error
}

// XClient defines the X API operations needed for health checks.
type XClient interface {
	VerifyCredentials(ctx context.Context, accessToken string) error
}

// ThreadsClient defines the Threads API operations needed for health checks and profile fetches.
type ThreadsClient interface {
	VerifyCredentials(ctx context.Context, accessToken string) error
	GetProfile(ctx context.Context, accessToken string) (userID, username string, err error)
}

// BlueskyClient defines the Bluesky API operations needed for health checks.
type BlueskyClient interface {
	VerifyCredentials(ctx context.Context, handle, appPassword string) error
}

// OAuthConfig holds OAuth credentials for a platform.
type OAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	Scopes       []string
	AuthURL      string
	TokenURL     string
}

// PlatformOAuthConfigs maps platform names to their OAuth configurations.
type PlatformOAuthConfigs map[string]OAuthConfig

// StaticTokens holds pre-configured access tokens for platforms that bypass OAuth.
type StaticTokens map[string]string

// PlatformProcessor handles platform connection logic.
type PlatformProcessor struct {
	store          PlatformStore
	oauthConfigs   PlatformOAuthConfigs
	staticTokens   StaticTokens
	logger         *observability.Logger
	httpClient     *http.Client // shared tracing client for outbound HTTP calls
	xClient        XClient
	threadsClient  ThreadsClient
	blueskyClient  BlueskyClient
	pkceVerifiers  map[string]string // accountID -> code_verifier for PKCE flows
	pkceVerifierMu sync.Mutex
	refreshMu      sync.Mutex                  // guards concurrent token refreshes
	refreshing     map[uuid.UUID]chan struct{} // tracks in-flight refresh per connection ID
}

// New creates a new PlatformProcessor.
func New(store PlatformStore, oauthConfigs PlatformOAuthConfigs, staticTokens StaticTokens, httpClient *http.Client, logger *observability.Logger, xClient XClient, threadsClient ThreadsClient, blueskyClient BlueskyClient) PlatformProcessor {
	return PlatformProcessor{
		store:         store,
		oauthConfigs:  oauthConfigs,
		staticTokens:  staticTokens,
		httpClient:    httpClient,
		logger:        logger,
		xClient:       xClient,
		threadsClient: threadsClient,
		blueskyClient: blueskyClient,
		pkceVerifiers: make(map[string]string),
		refreshing:    make(map[uuid.UUID]chan struct{}),
	}
}
