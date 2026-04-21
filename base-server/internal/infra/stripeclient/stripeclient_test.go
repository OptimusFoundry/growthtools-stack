package stripeclient

import (
	"base-server/internal/infra/observability"
	"testing"

	"github.com/stripe/stripe-go/v85"
)

// Shared client across all tests — calling New per test would race on the
// global stripe.Key under -race when t.Parallel() is enabled.
const testProduct = "launchcamp"
var testClient = New("sk_test_fake", testProduct, observability.NewLogger())

func TestMergeMetadata(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name             string
		input            map[string]string
		expectedProduct  string
		expectedHasKey   bool
		checkNonMutation bool // when true, verify input map was not modified
	}{
		{
			name:            "nil input",
			input:           nil,
			expectedProduct: testProduct,
			expectedHasKey:  true,
		},
		{
			name:            "empty input",
			input:           map[string]string{},
			expectedProduct: testProduct,
			expectedHasKey:  true,
		},
		{
			name: "preserves existing keys",
			input: map[string]string{
				"foo": "bar",
			},
			expectedProduct: testProduct,
			expectedHasKey:  true,
		},
		{
			name: "overwrites existing product key",
			input: map[string]string{
				"product": "other",
			},
			expectedProduct: testProduct,
			expectedHasKey:  true,
		},
		{
			name: "does not mutate original",
			input: map[string]string{
				"a": "b",
			},
			expectedProduct:  testProduct,
			expectedHasKey:   true,
			checkNonMutation: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Store original for mutation check
			var originalLen int
			var originalHadProduct bool
			if tt.checkNonMutation && tt.input != nil {
				originalLen = len(tt.input)
				_, originalHadProduct = tt.input[ProductMetadataKey]
			}

			result := testClient.mergeMetadata(tt.input)

			// Check the result has the product tag
			if !tt.expectedHasKey {
				if val, ok := result[ProductMetadataKey]; ok {
					t.Errorf("expected no %s key, got %s", ProductMetadataKey, val)
				}
				return
			}

			if result[ProductMetadataKey] != tt.expectedProduct {
				t.Errorf("expected %s=%s, got %s=%s",
					ProductMetadataKey, tt.expectedProduct,
					ProductMetadataKey, result[ProductMetadataKey])
			}

			// For non-overwrite cases, verify other keys are preserved
			if tt.input != nil && len(tt.input) > 0 && !originalHadProduct {
				for k, v := range tt.input {
					if k != ProductMetadataKey && result[k] != v {
						t.Errorf("expected key %s=%s in result, got %s", k, v, result[k])
					}
				}
			}

			// Check non-mutation
			if tt.checkNonMutation && tt.input != nil {
				if len(tt.input) != originalLen {
					t.Errorf("input map was mutated: original len=%d, after len=%d",
						originalLen, len(tt.input))
				}
				if _, ok := tt.input[ProductMetadataKey]; ok != originalHadProduct {
					t.Errorf("input map product key was modified: had=%v, now=%v",
						originalHadProduct, ok)
				}
			}
		})
	}
}

func TestIsForThisProduct(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		metadata map[string]string
		expected bool
	}{
		{
			name: "matching metadata",
			metadata: map[string]string{
				"product": "launchcamp",
			},
			expected: true,
		},
		{
			name: "wrong product",
			metadata: map[string]string{
				"product": "other",
			},
			expected: false,
		},
		{
			name: "missing key",
			metadata: map[string]string{
				"foo": "bar",
			},
			expected: false,
		},
		{
			name:     "nil map",
			metadata: nil,
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			result := testClient.IsForThisProduct(tt.metadata)
			if result != tt.expected {
				t.Errorf("testClient.IsForThisProduct(%v) = %v, want %v",
					tt.metadata, result, tt.expected)
			}
		})
	}
}

func TestCustomerCreateStampsMetadata(t *testing.T) {
	t.Parallel()

	c := testClient

	tests := []struct {
		name string
		// test will construct an empty CustomerParams and verify metadata is stamped
	}{
		{
			name: "stamps product metadata",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			params := &stripe.CustomerParams{}

			// Call the method; it will fail with auth error from fake key, but params.Metadata
			// should be stamped before the SDK call is dispatched.
			_, err := c.CustomerCreate(params)

			// We expect an auth error (fake key), but we ignore it.
			// The point is to verify params.Metadata was mutated.
			_ = err

			if params.Metadata == nil {
				t.Error("expected metadata to be set, got nil")
				return
			}

			if params.Metadata[ProductMetadataKey] != testProduct {
				t.Errorf("expected metadata[%s]=%s, got %s",
					ProductMetadataKey, testProduct,
					params.Metadata[ProductMetadataKey])
			}
		})
	}
}

func TestSubscriptionCreateStampsMetadata(t *testing.T) {
	t.Parallel()

	c := testClient

	tests := []struct {
		name string
		// test will construct an empty SubscriptionParams and verify metadata is stamped
	}{
		{
			name: "stamps product metadata",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			params := &stripe.SubscriptionParams{}

			// Call the method; it will fail with auth error from fake key, but params.Metadata
			// should be stamped before the SDK call is dispatched.
			_, err := c.SubscriptionCreate(params)

			// We expect an auth error (fake key), but we ignore it.
			_ = err

			if params.Metadata == nil {
				t.Error("expected metadata to be set, got nil")
				return
			}

			if params.Metadata[ProductMetadataKey] != testProduct {
				t.Errorf("expected metadata[%s]=%s, got %s",
					ProductMetadataKey, testProduct,
					params.Metadata[ProductMetadataKey])
			}
		})
	}
}

func TestCheckoutSessionCreateStampsMetadata(t *testing.T) {
	t.Parallel()

	c := testClient

	tests := []struct {
		name string
		// test will construct an empty CheckoutSessionParams and verify metadata is stamped
	}{
		{
			name: "stamps product metadata",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			params := &stripe.CheckoutSessionParams{}

			// Call the method; it will fail with auth error from fake key, but params.Metadata
			// should be stamped before the SDK call is dispatched.
			_, err := c.CheckoutSessionCreate(params)

			// We expect an auth error (fake key), but we ignore it.
			_ = err

			if params.Metadata == nil {
				t.Error("expected metadata to be set, got nil")
				return
			}

			if params.Metadata[ProductMetadataKey] != testProduct {
				t.Errorf("expected metadata[%s]=%s, got %s",
					ProductMetadataKey, testProduct,
					params.Metadata[ProductMetadataKey])
			}
		})
	}
}

func TestProductCreateStampsMetadata(t *testing.T) {
	t.Parallel()

	c := testClient

	tests := []struct {
		name string
		// test will construct an empty ProductParams and verify metadata is stamped
	}{
		{
			name: "stamps product metadata",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			params := &stripe.ProductParams{}

			// Call the method; it will fail with auth error from fake key, but params.Metadata
			// should be stamped before the SDK call is dispatched.
			_, err := c.ProductCreate(params)

			// We expect an auth error (fake key), but we ignore it.
			_ = err

			if params.Metadata == nil {
				t.Error("expected metadata to be set, got nil")
				return
			}

			if params.Metadata[ProductMetadataKey] != testProduct {
				t.Errorf("expected metadata[%s]=%s, got %s",
					ProductMetadataKey, testProduct,
					params.Metadata[ProductMetadataKey])
			}
		})
	}
}

func TestProductUpdateStampsMetadata(t *testing.T) {
	t.Parallel()

	c := testClient

	tests := []struct {
		name string
		// test will construct an empty ProductParams and verify metadata is stamped
	}{
		{
			name: "stamps product metadata",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			params := &stripe.ProductParams{}

			// Call the method; it will fail with auth error from fake key, but params.Metadata
			// should be stamped before the SDK call is dispatched.
			_, err := c.ProductUpdate("prod_test_fake", params)

			// We expect an auth error (fake key), but we ignore it.
			_ = err

			if params.Metadata == nil {
				t.Error("expected metadata to be set, got nil")
				return
			}

			if params.Metadata[ProductMetadataKey] != testProduct {
				t.Errorf("expected metadata[%s]=%s, got %s",
					ProductMetadataKey, testProduct,
					params.Metadata[ProductMetadataKey])
			}
		})
	}
}

func TestPriceCreateStampsMetadata(t *testing.T) {
	t.Parallel()

	c := testClient

	tests := []struct {
		name string
		// test will construct an empty PriceParams and verify metadata is stamped
	}{
		{
			name: "stamps product metadata",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			params := &stripe.PriceParams{}

			// Call the method; it will fail with auth error from fake key, but params.Metadata
			// should be stamped before the SDK call is dispatched.
			_, err := c.PriceCreate(params)

			// We expect an auth error (fake key), but we ignore it.
			_ = err

			if params.Metadata == nil {
				t.Error("expected metadata to be set, got nil")
				return
			}

			if params.Metadata[ProductMetadataKey] != testProduct {
				t.Errorf("expected metadata[%s]=%s, got %s",
					ProductMetadataKey, testProduct,
					params.Metadata[ProductMetadataKey])
			}
		})
	}
}
