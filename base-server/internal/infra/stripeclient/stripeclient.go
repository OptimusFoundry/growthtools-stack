package stripeclient

import (
	"base-server/internal/infra/observability"

	"github.com/stripe/stripe-go/v85"
	"github.com/stripe/stripe-go/v85/checkout/session"
	"github.com/stripe/stripe-go/v85/customer"
	stripeprice "github.com/stripe/stripe-go/v85/price"
	stripeproduct "github.com/stripe/stripe-go/v85/product"
	"github.com/stripe/stripe-go/v85/subscription"
)

// ProductMetadataKey is the platform-shared metadata key used by every product
// sharing the same Stripe account. The value (this product's name) comes from
// the APP_PRODUCT_NAME env var and is held on Client.
const ProductMetadataKey = "product"

type Client struct {
	productName string
	logger      *observability.Logger
}

// New returns a Client. apiKey is set globally on the stripe package.
// productName is stamped into Stripe metadata under ProductMetadataKey on every
// create/update, and is also the value IsForThisProduct compares against on
// inbound webhooks.
func New(apiKey, productName string, logger *observability.Logger) *Client {
	stripe.Key = apiKey
	return &Client{productName: productName, logger: logger}
}

// mergeMetadata returns a copy of m with ProductMetadataKey forced to the
// client's productName. m may be nil.
func (c *Client) mergeMetadata(m map[string]string) map[string]string {
	out := make(map[string]string, len(m)+1)
	for k, v := range m {
		out[k] = v
	}
	out[ProductMetadataKey] = c.productName
	return out
}

// IsForThisProduct returns true iff metadata[ProductMetadataKey] equals the
// client's productName. Pass the Metadata map directly from the Stripe object.
func (c *Client) IsForThisProduct(metadata map[string]string) bool {
	return metadata[ProductMetadataKey] == c.productName
}

func (c *Client) CustomerCreate(params *stripe.CustomerParams) (*stripe.Customer, error) {
	params.Metadata = c.mergeMetadata(params.Metadata)
	return customer.New(params)
}

func (c *Client) SubscriptionCreate(params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
	params.Metadata = c.mergeMetadata(params.Metadata)
	return subscription.New(params)
}

func (c *Client) CheckoutSessionCreate(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
	params.Metadata = c.mergeMetadata(params.Metadata)
	return session.New(params)
}

func (c *Client) ProductCreate(params *stripe.ProductParams) (*stripe.Product, error) {
	params.Metadata = c.mergeMetadata(params.Metadata)
	return stripeproduct.New(params)
}

func (c *Client) ProductUpdate(id string, params *stripe.ProductParams) (*stripe.Product, error) {
	params.Metadata = c.mergeMetadata(params.Metadata)
	return stripeproduct.Update(id, params)
}

func (c *Client) PriceCreate(params *stripe.PriceParams) (*stripe.Price, error) {
	params.Metadata = c.mergeMetadata(params.Metadata)
	return stripeprice.New(params)
}
