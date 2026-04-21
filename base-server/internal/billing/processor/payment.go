package processor

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v85"
	"github.com/stripe/stripe-go/v85/billingportal/session"
)

func (p *BillingProcessor) CreateCustomerPortal(ctx context.Context, userID uuid.UUID) (string, error) {
	stripeCustomerID, err := p.store.GetStripeCustomerIDByUserExternalID(ctx, userID)
	if err != nil {
		p.logger.Error(ctx, "failed to get stripe customer ID by user ID", err)
		return "", err
	}

	params := &stripe.BillingPortalSessionParams{
		Customer:      stripe.String(stripeCustomerID),
		ReturnURL:     stripe.String(fmt.Sprintf("%s/account", p.webhostURL)),
		Configuration: stripe.String("bpc_1Sld611OfTxF9BUaCFtj705M"), // Portal config with subscription updates enabled
	}

	result, err := session.New(params)
	if err != nil {
		p.logger.Error(ctx, "failed to create billing portal session", err)
		return "", err
	}

	return result.URL, nil
}
