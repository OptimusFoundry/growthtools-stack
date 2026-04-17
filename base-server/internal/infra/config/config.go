package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

var ErrEmptyEnvironmentVariable = errors.New("empty environment variable")

// Config holds all application configuration
type Config struct {
	Database      DatabaseConfig
	Auth          AuthConfig
	Services      ServicesConfig
	Server        ServerConfig
	Gemini        GeminiConfig
	S3            S3Config
	Storage       StorageConfig
	GitHub        GitHubConfig
	Kafka     KafkaConfig
	Platforms PlatformsConfig
}

// DatabaseConfig holds database connection settings
type DatabaseConfig struct {
	Host     string
	Username string
	Password string
	Name     string
}

// AuthConfig holds authentication-related configuration
type AuthConfig struct {
	JWTSecret          string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURI  string
}

// ServicesConfig holds external service API keys and configuration
type ServicesConfig struct {
	StripeSecretKey     string
	StripeWebhookSecret string
	ResendAPIKey        string
	DefaultEmailSender  string
	WebAppURI           string
}

// ServerConfig holds HTTP server configuration
type ServerConfig struct {
	Port int
}

// GeminiConfig holds Google Gemini API configuration
type GeminiConfig struct {
	APIKey string
}

// S3Config holds AWS S3 configuration
type S3Config struct {
	Bucket          string
	Region          string
	AccessKeyID     string
	SecretAccessKey string
}

// StorageConfig holds file storage configuration
type StorageConfig struct {
	Type          string // "local" or "s3"
	MediaDir      string // local directory for file storage
	PublicURLBase string // base URL for fetchable media URLs (e.g. https://bucket.s3.region.amazonaws.com or https://api.example.com/public/media/file)
}

// GitHubConfig holds GitHub integration configuration
type GitHubConfig struct {
	WebhookSecret     string
	OAuthClientID     string
	OAuthClientSecret string
}

// KafkaConfig holds Kafka configuration
type KafkaConfig struct {
	Brokers       string
	ConsumerGroup string
}

// PlatformsConfig holds social media platform API credentials
type PlatformsConfig struct {
	XAPIKey            string
	XAPISecret         string
	LinkedInClientID   string
	LinkedInSecret     string
	MetaAppID          string
	MetaAppSecret      string
	ThreadsAppID       string
	ThreadsAppSecret   string
	ThreadsAccessToken string
	TikTokClientKey    string
	TikTokClientSecret string
	PinterestAppID     string
	PinterestAppSecret string
}

// Load reads and validates all required environment variables
func Load() (*Config, error) {
	goEnv := os.Getenv("GO_ENV")
	if goEnv != "production" && goEnv != "test" {
		if err := godotenv.Load("env.local"); err != nil {
			return nil, fmt.Errorf("failed to load env.local: %w", err)
		}
	}

	cfg := &Config{}

	// Database configuration
	var err error
	if cfg.Database.Host, err = requireEnv("DB_HOST"); err != nil {
		return nil, err
	}
	if cfg.Database.Username, err = requireEnv("DB_USERNAME"); err != nil {
		return nil, err
	}
	if cfg.Database.Password, err = requireEnv("DB_PASSWORD"); err != nil {
		return nil, err
	}
	if cfg.Database.Name, err = requireEnv("DB_NAME"); err != nil {
		return nil, err
	}

	// Auth configuration
	if cfg.Auth.JWTSecret, err = requireEnv("JWT_SECRET"); err != nil {
		return nil, err
	}
	if cfg.Auth.GoogleClientID, err = requireEnv("GOOGLE_CLIENT_ID"); err != nil {
		return nil, err
	}
	if cfg.Auth.GoogleClientSecret, err = requireEnv("GOOGLE_CLIENT_SECRET"); err != nil {
		return nil, err
	}
	if cfg.Auth.GoogleRedirectURI, err = requireEnv("GOOGLE_REDIRECT_URI"); err != nil {
		return nil, err
	}

	// Services configuration
	if cfg.Services.StripeSecretKey, err = requireEnv("STRIPE_SECRET_KEY"); err != nil {
		return nil, err
	}
	if cfg.Services.StripeWebhookSecret, err = requireEnv("STRIPE_WEBHOOK_SECRET"); err != nil {
		return nil, err
	}
	if cfg.Services.ResendAPIKey, err = requireEnv("RESEND_API_KEY"); err != nil {
		return nil, err
	}
	if cfg.Services.DefaultEmailSender, err = requireEnv("DEFAULT_EMAIL_SENDER_ADDRESS"); err != nil {
		return nil, err
	}
	if cfg.Services.WebAppURI, err = requireEnv("WEBAPP_URI"); err != nil {
		return nil, err
	}

	// Server configuration
	serverPort, err := requireEnv("SERVER_PORT")
	if err != nil {
		return nil, err
	}
	cfg.Server.Port, err = strconv.Atoi(serverPort)
	if err != nil {
		return nil, fmt.Errorf("failed to parse SERVER_PORT: %w", err)
	}

	// Gemini configuration (optional in dev)
	cfg.Gemini.APIKey = getEnvWithDefault("GOOGLE_AI_API_KEY", "")

	// S3 configuration (optional in dev)
	cfg.S3.Bucket = getEnvWithDefault("S3_BUCKET", "")
	cfg.S3.Region = getEnvWithDefault("S3_REGION", "us-east-1")
	cfg.S3.AccessKeyID = getEnvWithDefault("S3_ACCESS_KEY_ID", "")
	cfg.S3.SecretAccessKey = getEnvWithDefault("S3_SECRET_ACCESS_KEY", "")

	// Storage configuration
	cfg.Storage.Type = getEnvWithDefault("STORAGE_TYPE", "local")
	cfg.Storage.MediaDir = getEnvWithDefault("MEDIA_DIR", "./media-uploads")
	cfg.Storage.PublicURLBase = getEnvWithDefault("MEDIA_PUBLIC_URL_BASE", "")

	// GitHub configuration (optional in dev)
	cfg.GitHub.WebhookSecret = getEnvWithDefault("GITHUB_WEBHOOK_SECRET", "")
	cfg.GitHub.OAuthClientID = getEnvWithDefault("GITHUB_OAUTH_CLIENT_ID", "")
	cfg.GitHub.OAuthClientSecret = getEnvWithDefault("GITHUB_OAUTH_CLIENT_SECRET", "")

	// Kafka configuration
	cfg.Kafka.Brokers = getEnvWithDefault("KAFKA_BROKERS", "localhost:9092")
	cfg.Kafka.ConsumerGroup = getEnvWithDefault("KAFKA_CONSUMER_GROUP", "growth-tools-consumers")

	// Platform API credentials (all optional — empty means platform not configured)
	cfg.Platforms.XAPIKey = getEnvWithDefault("X_API_KEY", "")
	cfg.Platforms.XAPISecret = getEnvWithDefault("X_API_SECRET", "")
	cfg.Platforms.LinkedInClientID = getEnvWithDefault("LINKEDIN_CLIENT_ID", "")
	cfg.Platforms.LinkedInSecret = getEnvWithDefault("LINKEDIN_CLIENT_SECRET", "")
	cfg.Platforms.MetaAppID = getEnvWithDefault("META_APP_ID", "")
	cfg.Platforms.MetaAppSecret = getEnvWithDefault("META_APP_SECRET", "")
	cfg.Platforms.ThreadsAppID = getEnvWithDefault("THREADS_APP_ID", "")
	cfg.Platforms.ThreadsAppSecret = getEnvWithDefault("THREADS_APP_SECRET", "")
	cfg.Platforms.ThreadsAccessToken = getEnvWithDefault("THREADS_ACCESS_TOKEN", "")
	cfg.Platforms.TikTokClientKey = getEnvWithDefault("TIKTOK_CLIENT_KEY", "")
	cfg.Platforms.TikTokClientSecret = getEnvWithDefault("TIKTOK_CLIENT_SECRET", "")
	cfg.Platforms.PinterestAppID = getEnvWithDefault("PINTEREST_APP_ID", "")
	cfg.Platforms.PinterestAppSecret = getEnvWithDefault("PINTEREST_APP_SECRET", "")

	return cfg, nil
}

// ConnectionString returns a PostgreSQL connection string
func (c *DatabaseConfig) ConnectionString() string {
	return fmt.Sprintf("postgres://%s:%s@%s/%s",
		c.Username, c.Password, c.Host, c.Name)
}

// requireEnv retrieves an environment variable or returns an error if empty
func requireEnv(key string) (string, error) {
	value := os.Getenv(key)
	if value == "" {
		return "", fmt.Errorf("%s is not set: %w", key, ErrEmptyEnvironmentVariable)
	}
	return value, nil
}

// getEnvWithDefault retrieves an environment variable or returns a default value
func getEnvWithDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
