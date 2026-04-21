package processor

import (
	"base-server/internal/money/subscriptions"
	"base-server/internal/infra/observability"
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v85"
	checkoutsession "github.com/stripe/stripe-go/v85/checkout/session"
)

var (
	// ErrNoActiveSubscription is returned when no active subscription is found for a user
	ErrNoActiveSubscription           = errors.New("no active subscription found")
	ErrSubscriptionAlreadyExists      = errors.New("user already has an active subscription")
	ErrFailedToGetSubscription        = errors.New("failed to get subscription")
	ErrFailedToCreateFreeSubscription = errors.New("failed to create free subscription")
)

func (p *BillingProcessor) CreateFreeSubscription(ctx context.Context, stripeCustomerID string) error {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "stripe_customer_id", Value: stripeCustomerID})

	p.logger.Info(ctx, "Creating free subscription for customer")

	freePriceStripeID, err := p.store.GetFreePriceStripeID(ctx)
	if err != nil {
		p.logger.Error(ctx, "failed to get free price stripe id", err)
		return ErrFailedToCreateFreeSubscription
	}

	params := &stripe.SubscriptionParams{
		Customer: stripe.String(stripeCustomerID),
		Items: []*stripe.SubscriptionItemsParams{
			{
				Price: stripe.String(freePriceStripeID),
			},
		},
	}

	_, err = p.stripeClient.SubscriptionCreate(params)
	if err != nil {
		p.logger.Error(ctx, "failed to create free subscription", err)
		return ErrFailedToCreateFreeSubscription
	}

	return nil
}

func (p *BillingProcessor) GetActiveSubscription(ctx context.Context, userID uuid.UUID) (subscriptions.Subscription,
	error) {
	ctx = observability.WithFields(ctx, observability.Field{Key: "user_id", Value: userID})

	sub, err := p.subscriptionService.GetSubscriptionByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, subscriptions.ErrNoSubscription) {
			p.logger.Info(ctx, "no active subscription found for user")
			return subscriptions.Subscription{}, ErrNoActiveSubscription
		}

		p.logger.Error(ctx, "failed to get subscription by user id", err)
		return subscriptions.Subscription{}, ErrFailedToGetSubscription
	}

	return sub, nil
}

func (p *BillingProcessor) CreateCheckoutSession(ctx context.Context, userID uuid.UUID, priceID string) (*stripe.CheckoutSession, error) {
	ctx = observability.WithFields(ctx,
		observability.Field{Key: "user_id", Value: userID},
		observability.Field{Key: "price_id", Value: priceID})

	// Check if user already has an active subscription - only allow one subscription per user
	_, err := p.GetActiveSubscription(ctx, userID)
	if err == nil {
		// User already has a subscription, they should use billing portal to change plans
		p.logger.Info(ctx, "user already has an active subscription, use billing portal to change plans")
		return nil, ErrSubscriptionAlreadyExists
	}
	if !errors.Is(err, ErrNoActiveSubscription) {
		// Unexpected error checking subscription
		p.logger.Error(ctx, "failed to check existing subscription", err)
		return nil, errors.New("failed to check existing subscription")
	}

	stripeCustomerID, err := p.store.GetStripeCustomerIDByUserExternalID(ctx, userID)
	if err != nil {
		p.logger.Error(ctx, "failed to get stripe customer id from db", err)
		return nil, errors.New("failed to get stripe customer id")
	}

	price, err := p.store.GetPriceByID(ctx, priceID)
	if err != nil {
		p.logger.Error(ctx, "failed to get price by stripe id", err)
		return nil, errors.New("failed to get price by stripe id")
	}

	params := &stripe.CheckoutSessionParams{
		Customer: stripe.String(stripeCustomerID),
		PaymentMethodTypes: []*string{
			stripe.String("card"),
		},
		UIMode: stripe.String("embedded"),
		Mode:   stripe.String("subscription"),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(price.StripeID),
				Quantity: stripe.Int64(1),
			},
		},
		CustomerUpdate: &stripe.CheckoutSessionCustomerUpdateParams{
			Address: stripe.String("auto"),
		},
		ReturnURL: stripe.String(fmt.Sprintf("%s/billing/payment_attempt?session_id={CHECKOUT_SESSION_ID}",
			p.webhostURL)),
		AutomaticTax: &stripe.CheckoutSessionAutomaticTaxParams{Enabled: stripe.Bool(true)},
	}

	checkoutSession, err := p.stripeClient.CheckoutSessionCreate(params)
	if err != nil {
		p.logger.Error(ctx, "failed to create checkout session", err)
		return nil, errors.New("failed to create checkout session")
	}

	return checkoutSession, nil

}

type CheckoutSessionInfo struct {
	SessionID     string `json:"session_id"`
	Status        string `json:"status"`
	PaymentStatus string `json:"payment_status"`
}

func (p *BillingProcessor) GetCheckoutSession(ctx context.Context, sessionID string) (CheckoutSessionInfo, error) {
	ctx = observability.WithFields(ctx, observability.Field{Key: "session_id", Value: sessionID})

	cs, err := checkoutsession.Get(sessionID, nil)
	if err != nil {
		p.logger.Error(ctx, "failed to get checkout session", err)
		return CheckoutSessionInfo{}, errors.New("failed to get checkout session")
	}

	return CheckoutSessionInfo{
		SessionID:     cs.ID,
		Status:        string(cs.Status),
		PaymentStatus: string(cs.PaymentStatus),
	}, nil
}
