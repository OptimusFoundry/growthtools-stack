package processor

import (
	"base-server/internal/infra/observability"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/stripe/stripe-go/v85"
)

// Invoke this method in your webhook handler when `customer.subscription.updated` webhook is received
func (p *BillingProcessor) SubscriptionUpdated(ctx context.Context, subscription stripe.Subscription) error {
	ctx = observability.WithFields(ctx, observability.Field{Key: "subscription_id", Value: subscription.ID})

	if subscription.CancelAt > 0 {
		cancelAt := time.Unix(subscription.CancelAt, 0)

		err := p.subscriptionService.CancelSubscription(ctx, subscription.ID, cancelAt)
		if err != nil {
			p.logger.Error(ctx, "failed to cancel subscription", err)
			return fmt.Errorf("failed to cancel subscription: %w", err)
		}

		p.logger.Info(ctx, "Subscription cancelled")
		return nil
	}

	err := p.subscriptionService.UpdateSubscription(ctx, subscription)
	if err != nil {
		p.logger.Error(ctx, "failed to update subscription", err)
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	p.logger.Info(ctx, "Subscription updated")
	return nil
}

// Invoke this method in your webhook handler when `customer.subscription.created` webhook is received
func (p *BillingProcessor) SubscriptionCreated(ctx context.Context, subscription stripe.Subscription) error {
	ctx = observability.WithFields(ctx, observability.Field{Key: "subscription_id", Value: subscription.ID})

	err := p.subscriptionService.CreateSubscription(ctx, subscription)
	if err != nil {
		p.logger.Error(ctx, "failed to create subscription", err)
		return fmt.Errorf("failed to create subscription: %w", err)
	}

	p.logger.Info(ctx, "Subscription created")
	return nil
}

func (p *BillingProcessor) ProductCreated(ctx context.Context, productCreated stripe.Product) error {
	ctx = observability.WithFields(ctx, observability.Field{Key: "product_id", Value: productCreated.ID})

	err := p.productService.CreateProduct(ctx, productCreated)
	if err != nil {
		p.logger.Error(ctx, "failed to handle product creation webhook event", err)
		return fmt.Errorf("failed to handle product creation webhook event: %w", err)
	}

	p.logger.Info(ctx, "Product created")
	return nil
}

func (p *BillingProcessor) PriceCreated(ctx context.Context, priceCreated stripe.Price) error {
	ctx = observability.WithFields(ctx, observability.Field{Key: "price_id", Value: priceCreated.ID})

	err := p.productService.CreatePrice(ctx, priceCreated)
	if err != nil {
		p.logger.Error(ctx, "failed to handle plan creation webhook event", err)
		return fmt.Errorf("failed to handle plan creation webhook event: %w", err)
	}

	p.logger.Info(ctx, "Price created")
	return nil
}

func (p *BillingProcessor) PriceUpdated(ctx context.Context, priceUpdated stripe.Price) error {
	ctx = observability.WithFields(ctx, observability.Field{Key: "price_id", Value: priceUpdated.ID})

	err := p.productService.UpdatePrice(ctx, priceUpdated)
	if err != nil {
		p.logger.Error(ctx, "failed to handle plan update webhook event", err)
		return fmt.Errorf("failed to handle plan update webhook event: %w", err)
	}

	p.logger.Info(ctx, "Price updated")
	return nil
}

func (p *BillingProcessor) SubscriptionDeleted(ctx context.Context, subscriptionDeleted stripe.Subscription) error {
	ctx = observability.WithFields(ctx, observability.Field{Key: "subscription_id", Value: subscriptionDeleted.ID})

	err := p.subscriptionService.CancelSubscription(ctx, subscriptionDeleted.ID, time.Now())
	if err != nil {
		p.logger.Error(ctx, "failed to handle subscription deletion webhook event", err)
		return fmt.Errorf("failed to handle subscription deletion webhook event: %w", err)
	}

	p.logger.Info(ctx, "Subscription deleted")
	return nil
}

func (p *BillingProcessor) PriceDeleted(ctx context.Context, priceDeleted stripe.Price) error {
	ctx = observability.WithFields(ctx, observability.Field{Key: "price_id", Value: priceDeleted.ID})

	err := p.productService.DeletePrice(ctx, priceDeleted)
	if err != nil {
		p.logger.Error(ctx, "failed to handle plan deletion webhook event", err)
		return fmt.Errorf("failed to handle plan deletion webhook event: %w", err)
	}

	p.logger.Info(ctx, "Price deleted")
	return nil
}

func (p *BillingProcessor) HandleWebhook(ctx context.Context, event stripe.Event) error {
	ctx = observability.WithFields(ctx, observability.Field{Key: "event_id", Value: event.ID})
	// Handle the event
	switch event.Type {
	case "product.created":
		var product stripe.Product
		err := json.Unmarshal(event.Data.Raw, &product)
		if err != nil {
			p.logger.Error(ctx, "failed to unmarshal product", err)
			return fmt.Errorf("failed to parse product from event: %w", err)
		}
		if !p.stripeClient.IsForThisProduct(product.Metadata) {
			p.logger.Info(ctx, "skipping product.created: not a protoapp product")
			return nil
		}
		return p.ProductCreated(ctx, product)

	case "price.created", "price.updated", "price.deleted":
		var price stripe.Price
		err := json.Unmarshal(event.Data.Raw, &price)
		if err != nil {
			p.logger.Error(ctx, "failed to unmarshal price", err)
			return fmt.Errorf("failed to parse price from event: %w", err)
		}
		if !p.stripeClient.IsForThisProduct(price.Metadata) {
			p.logger.Info(ctx, "skipping price event: not a protoapp price")
			return nil
		}
		switch event.Type {
		case "price.created":
			return p.PriceCreated(ctx, price)
		case "price.updated":
			return p.PriceUpdated(ctx, price)
		case "price.deleted":
			return p.PriceDeleted(ctx, price)
		}

	case "customer.subscription.created":
		var subscription stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &subscription)
		if err != nil {
			p.logger.Error(ctx, "failed to unmarshal subscription", err)
			return fmt.Errorf("failed to parse subscription from event: %w", err)
		}
		if !p.stripeClient.IsForThisProduct(subscription.Metadata) {
			p.logger.Info(ctx, "skipping customer.subscription.created: not a protoapp subscription")
			return nil
		}
		return p.SubscriptionCreated(ctx, subscription)

	case "customer.subscription.updated":
		var subscription stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &subscription)
		if err != nil {
			p.logger.Error(ctx, "failed to unmarshal subscription", err)
			return fmt.Errorf("failed to parse subscription from event: %w", err)
		}
		if !p.stripeClient.IsForThisProduct(subscription.Metadata) {
			p.logger.Info(ctx, "skipping customer.subscription.updated: not a protoapp subscription")
			return nil
		}

		// Check for previous subscription status
		previousStatus, ok := event.Data.PreviousAttributes["status"].(string)
		if !ok {
			err := errors.New("failed to retrieve previous subscription status")
			p.logger.Error(ctx, "subscription updated event missing previous status", err)
		}

		// Subscription status handling
		if previousStatus == "incomplete" {
			return p.SubscriptionCreated(ctx, subscription)
		} else {
			return p.SubscriptionUpdated(ctx, subscription)
		}

	case "customer.subscription.deleted":
		var subscription stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &subscription)
		if err != nil {
			p.logger.Error(ctx, "failed to unmarshal subscription", err)
			return fmt.Errorf("failed to parse subscription from event: %w", err)
		}
		if !p.stripeClient.IsForThisProduct(subscription.Metadata) {
			p.logger.Info(ctx, "skipping customer.subscription.deleted: not a protoapp subscription")
			return nil
		}
		return p.SubscriptionDeleted(ctx, subscription)

	default:
		p.logger.Warn(ctx, fmt.Sprintf("Unhandled event type: %s", event.Type))
	}

	return nil
}
