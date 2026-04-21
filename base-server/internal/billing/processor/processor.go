package processor

//go:generate go run go.uber.org/mock/mockgen@latest -source=processor.go -destination=mocks_test.go -package=processor

import (
	"base-server/internal/billing/products"
	"base-server/internal/billing/subscriptions"
	"base-server/internal/infra/observability"
	"base-server/internal/infra/store"
	"base-server/internal/infra/stripeclient"
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v85"
)

// BillingProcessorInterface defines the contract for billing operations
type BillingProcessorInterface interface {
	// Customer Management
	CreateStripeCustomer(ctx context.Context, email string) (string, error)

	// Subscription Management
	CreateFreeSubscription(ctx context.Context, stripeCustomerID string) error
	GetActiveSubscription(ctx context.Context, userID uuid.UUID) (subscriptions.Subscription, error)

	// Checkout & Portal Management
	CreateCheckoutSession(ctx context.Context, userID uuid.UUID, priceID string) (*stripe.CheckoutSession, error)
	GetCheckoutSession(ctx context.Context, sessionID string) (CheckoutSessionInfo, error)
	CreateCustomerPortal(ctx context.Context, userID uuid.UUID) (string, error)

	// Pricing Management
	ListPrices(ctx context.Context) ([]products.Price, error)

	// Webhook Handlers
	SubscriptionUpdated(ctx context.Context, subscription stripe.Subscription) error
	SubscriptionCreated(ctx context.Context, subscription stripe.Subscription) error
	ProductCreated(ctx context.Context, productCreated stripe.Product) error
	PriceCreated(ctx context.Context, priceCreated stripe.Price) error
	PriceUpdated(ctx context.Context, priceUpdated stripe.Price) error
	SubscriptionDeleted(ctx context.Context, subscriptionDeleted stripe.Subscription) error
	PriceDeleted(ctx context.Context, priceDeleted stripe.Price) error
	HandleWebhook(ctx context.Context, event stripe.Event) error
}

// BillingStore defines the database operations required by BillingProcessor
type BillingStore interface {
	GetStripeCustomerIDByUserExternalID(ctx context.Context, ID uuid.UUID) (string, error)
	GetPriceByID(ctx context.Context, priceID string) (store.Price, error)
	GetFreePriceStripeID(ctx context.Context) (string, error)
}

// ProductService defines the product operations required by BillingProcessor
type ProductService interface {
	ListPrices(ctx context.Context) ([]products.Price, error)
	CreateProduct(ctx context.Context, productCreated stripe.Product) error
	CreatePrice(ctx context.Context, priceCreated stripe.Price) error
	UpdatePrice(ctx context.Context, priceUpdated stripe.Price) error
	DeletePrice(ctx context.Context, priceDeleted stripe.Price) error
}

// SubscriptionService defines the subscription operations required by BillingProcessor
type SubscriptionService interface {
	GetSubscriptionByUserID(ctx context.Context, userID uuid.UUID) (subscriptions.Subscription, error)
	CancelSubscription(ctx context.Context, subscriptionID string, cancelAt time.Time) error
	UpdateSubscription(ctx context.Context, subscriptionUpdated stripe.Subscription) error
	CreateSubscription(ctx context.Context, subscriptionCreated stripe.Subscription) error
}

// EmailService defines the email operations required by BillingProcessor
type EmailService interface {
	SendEmail(ctx context.Context, to, subject, htmlContent string) error
}

var ErrFailedToCreateCustomer = errors.New("failed to create customer")

type BillingProcessor struct {
	stripKey            string
	WebhookSecret       string
	webhostURL          string
	logger              *observability.Logger
	store               BillingStore
	productService      ProductService
	subscriptionService SubscriptionService
	emailService        EmailService
	stripeClient        *stripeclient.Client
}

func New(stripKey string, webhookSecret string, webhostURL string, store BillingStore,
	productService ProductService, subService SubscriptionService,
	emailService EmailService, logger *observability.Logger,
	sc *stripeclient.Client) BillingProcessor {
	return BillingProcessor{
		stripKey:            stripKey,
		WebhookSecret:       webhookSecret,
		webhostURL:          webhostURL,
		store:               store,
		productService:      productService,
		subscriptionService: subService,
		emailService:        emailService,
		logger:              logger,
		stripeClient:        sc,
	}
}

func (p *BillingProcessor) CreateStripeCustomer(ctx context.Context, email string) (string, error) {
	ctx = observability.WithFields(ctx, observability.Field{Key: "email", Value: email})

	params := &stripe.CustomerParams{
		Email: stripe.String(email),
	}

	customer, err := p.stripeClient.CustomerCreate(params)
	if err != nil {
		p.logger.Error(ctx, "failed to create customer", err)
		return "", ErrFailedToCreateCustomer
	}

	return customer.ID, nil
}
