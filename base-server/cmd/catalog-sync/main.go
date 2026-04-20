// catalog-sync reconciles base-server/catalog.yml with Stripe + the local DB.
//
// Stripe phase: upserts products (by metadata.catalog_key) and prices (by
// lookup_key). Never edits an existing price — Stripe disallows mutating
// unit_amount. A new price requires a new price.key in YAML.
//
// DB phase: upserts products, prices, features, limits, plan_feature_limits.
// Additive only — no DELETEs. To disable a feature on a plan, flip enabled to
// false or set limit to 0 in the YAML and re-run.
//
// Usage:
//
//	catalog-sync [--file catalog.yml] [--env test|prod] [--dry-run]
//	             [--stripe-only] [--db-only]
//
// Prod guard: ENV=prod requires CONFIRM=prod.
package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"os"

	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/stripe/stripe-go/v85"
	"github.com/stripe/stripe-go/v85/price"
	"github.com/stripe/stripe-go/v85/product"
	"gopkg.in/yaml.v3"
)

type Catalog struct {
	Products []Product `yaml:"products"`
	Features []Feature `yaml:"features"`
	Plans    []Plan    `yaml:"plans"`
}

type Product struct {
	Key         string  `yaml:"key"`
	Name        string  `yaml:"name"`
	Description string  `yaml:"description"`
	Prices      []Price `yaml:"prices"`
}

type Price struct {
	Key        string `yaml:"key"`
	UnitAmount int64  `yaml:"unit_amount"`
	Currency   string `yaml:"currency"`
	Interval   string `yaml:"interval"`
}

type Feature struct {
	Name        string `yaml:"name"`
	Description string `yaml:"description"`
}

type Plan struct {
	Price    string                  `yaml:"price"`
	Features map[string]FeatureValue `yaml:"features"`
}

type FeatureValue struct {
	Enabled bool `yaml:"enabled"`
	// Limit is optional. nil = no quantitative limit declared (boolean feature,
	// or unlimited when feature is numeric). Pointer so we can tell "absent"
	// from "explicit zero".
	Limit *int `yaml:"limit,omitempty"`
}

type stripeIDs struct {
	productByKey map[string]string // catalog key → Stripe product ID
	priceByKey   map[string]string // catalog key → Stripe price ID
}

func main() {
	var (
		file       = flag.String("file", "catalog.yml", "path to catalog YAML")
		env        = flag.String("env", "test", "test | prod")
		dryRun     = flag.Bool("dry-run", false, "print planned changes; make no writes")
		stripeOnly = flag.Bool("stripe-only", false, "only sync Stripe, skip DB phase")
		dbOnly     = flag.Bool("db-only", false, "only sync DB, skip Stripe phase")
	)
	flag.Parse()

	if err := run(*file, *env, *dryRun, *stripeOnly, *dbOnly); err != nil {
		fmt.Fprintf(os.Stderr, "catalog-sync: %v\n", err)
		os.Exit(1)
	}
}

func run(file, env string, dryRun, stripeOnly, dbOnly bool) error {
	if env == "prod" && os.Getenv("CONFIRM") != "prod" {
		return errors.New("ENV=prod requires CONFIRM=prod in the environment")
	}

	// Dev loads env.local; prod expects env to be set by the caller.
	if env == "test" {
		_ = godotenv.Load("env.local")
	}

	cat, err := loadCatalog(file)
	if err != nil {
		return fmt.Errorf("load catalog: %w", err)
	}
	if err := cat.validate(); err != nil {
		return fmt.Errorf("validate catalog: %w", err)
	}

	ctx := context.Background()
	ids := &stripeIDs{productByKey: map[string]string{}, priceByKey: map[string]string{}}

	if !dbOnly {
		key := os.Getenv("STRIPE_SECRET_KEY")
		if key == "" {
			return errors.New("STRIPE_SECRET_KEY not set")
		}
		stripe.Key = key
		if err := syncStripe(ctx, cat, ids, dryRun); err != nil {
			return fmt.Errorf("stripe phase: %w", err)
		}
	}

	if !stripeOnly {
		db, err := openDB()
		if err != nil {
			return fmt.Errorf("open db: %w", err)
		}
		defer db.Close()

		// When running db-only, backfill stripeIDs from the DB so plan_feature_limits
		// can resolve price keys → plan_id rows.
		if dbOnly {
			if err := backfillIDsFromDB(ctx, db, cat, ids); err != nil {
				return fmt.Errorf("backfill ids from db: %w", err)
			}
		}

		if err := syncDB(ctx, db, cat, ids, dryRun); err != nil {
			return fmt.Errorf("db phase: %w", err)
		}
	}

	fmt.Println("catalog-sync: done.")
	return nil
}

// ---------- load + validate ----------

func loadCatalog(path string) (*Catalog, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var c Catalog
	if err := yaml.Unmarshal(raw, &c); err != nil {
		return nil, err
	}
	return &c, nil
}

func (c *Catalog) validate() error {
	featureSet := map[string]bool{}
	for _, f := range c.Features {
		if f.Name == "" {
			return errors.New("feature missing name")
		}
		if featureSet[f.Name] {
			return fmt.Errorf("duplicate feature %q", f.Name)
		}
		featureSet[f.Name] = true
	}

	priceKeys := map[string]bool{}
	for _, p := range c.Products {
		if p.Key == "" || p.Name == "" {
			return fmt.Errorf("product missing key or name: %+v", p)
		}
		for _, pr := range p.Prices {
			if pr.Key == "" || pr.Currency == "" || pr.Interval == "" {
				return fmt.Errorf("price %q under %q missing required fields", pr.Key, p.Key)
			}
			if priceKeys[pr.Key] {
				return fmt.Errorf("duplicate price key %q", pr.Key)
			}
			priceKeys[pr.Key] = true
		}
	}

	for _, plan := range c.Plans {
		if !priceKeys[plan.Price] {
			return fmt.Errorf("plan references unknown price %q", plan.Price)
		}
		for fname := range plan.Features {
			if !featureSet[fname] {
				return fmt.Errorf("plan %q references unknown feature %q", plan.Price, fname)
			}
		}
	}
	return nil
}

// ---------- Stripe phase ----------

func syncStripe(ctx context.Context, cat *Catalog, ids *stripeIDs, dryRun bool) error {
	fmt.Println("→ Stripe phase")
	for _, p := range cat.Products {
		prodID, err := upsertStripeProduct(ctx, p, dryRun)
		if err != nil {
			return fmt.Errorf("product %q: %w", p.Key, err)
		}
		ids.productByKey[p.Key] = prodID

		for _, pr := range p.Prices {
			priceID, err := upsertStripePrice(ctx, prodID, pr, dryRun)
			if err != nil {
				return fmt.Errorf("price %q: %w", pr.Key, err)
			}
			ids.priceByKey[pr.Key] = priceID
		}
	}
	return nil
}

func upsertStripeProduct(ctx context.Context, p Product, dryRun bool) (string, error) {
	// Search by our catalog_key metadata.
	searchParams := &stripe.ProductSearchParams{
		SearchParams: stripe.SearchParams{Query: fmt.Sprintf("metadata['catalog_key']:'%s'", p.Key)},
	}
	it := product.Search(searchParams)
	for it.Next() {
		existing := it.Product()
		fmt.Printf("  product %-16s exists   %s\n", p.Key, existing.ID)
		return existing.ID, nil
	}
	if err := it.Err(); err != nil {
		return "", fmt.Errorf("search: %w", err)
	}

	if dryRun {
		fmt.Printf("  product %-16s CREATE   (dry-run)\n", p.Key)
		return "dry_run_" + p.Key, nil
	}
	created, err := product.New(&stripe.ProductParams{
		Name:        stripe.String(p.Name),
		Description: stripe.String(p.Description),
		Metadata:    map[string]string{"catalog_key": p.Key},
	})
	if err != nil {
		return "", fmt.Errorf("create: %w", err)
	}
	fmt.Printf("  product %-16s CREATED  %s\n", p.Key, created.ID)
	return created.ID, nil
}

func upsertStripePrice(ctx context.Context, stripeProductID string, p Price, dryRun bool) (string, error) {
	// Lookup by lookup_key. Restrict to active prices — archived prices can't be
	// used for new subscriptions, so we want to create a fresh one and transfer
	// the lookup_key over.
	listParams := &stripe.PriceListParams{
		LookupKeys: stripe.StringSlice([]string{p.Key}),
		Active:     stripe.Bool(true),
	}
	it := price.List(listParams)
	for it.Next() {
		existing := it.Price()
		if existing.Product == nil || existing.Product.ID != stripeProductID {
			wrongProduct := ""
			if existing.Product != nil {
				wrongProduct = existing.Product.ID
			}
			return "", fmt.Errorf(
				"lookup_key %q is attached to a different product (%s); expected %s. "+
					"Archive the stale price or transfer its lookup_key, then re-run",
				p.Key, wrongProduct, stripeProductID,
			)
		}
		if existing.UnitAmount != p.UnitAmount {
			fmt.Printf("  price   %-16s WARN     unit_amount drift: stripe=%d yaml=%d (Stripe prices are immutable; add a new key to change)\n",
				p.Key, existing.UnitAmount, p.UnitAmount)
		}
		fmt.Printf("  price   %-16s exists   %s\n", p.Key, existing.ID)
		return existing.ID, nil
	}
	if err := it.Err(); err != nil {
		return "", fmt.Errorf("list: %w", err)
	}

	if dryRun {
		fmt.Printf("  price   %-16s CREATE   (dry-run)\n", p.Key)
		return "dry_run_" + p.Key, nil
	}

	params := &stripe.PriceParams{
		Product:           stripe.String(stripeProductID),
		Currency:          stripe.String(p.Currency),
		UnitAmount:        stripe.Int64(p.UnitAmount),
		LookupKey:         stripe.String(p.Key),
		TransferLookupKey: stripe.Bool(true),
	}
	if p.Interval != "" && p.Interval != "once" {
		params.Recurring = &stripe.PriceRecurringParams{Interval: stripe.String(p.Interval)}
	}
	created, err := price.New(params)
	if err != nil {
		return "", fmt.Errorf("create: %w", err)
	}
	fmt.Printf("  price   %-16s CREATED  %s\n", p.Key, created.ID)
	return created.ID, nil
}

// ---------- DB phase ----------

func openDB() (*sqlx.DB, error) {
	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USERNAME")
	pass := os.Getenv("DB_PASSWORD")
	name := os.Getenv("DB_NAME")
	if host == "" || user == "" || pass == "" || name == "" {
		return nil, errors.New("DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME must all be set")
	}
	dsn := fmt.Sprintf("postgres://%s:%s@%s/%s?sslmode=disable", user, pass, host, name)
	return sqlx.Connect("postgres", dsn)
}

// backfillIDsFromDB populates ids.priceByKey (→ Stripe price ID) from the prices
// table so --db-only runs can still resolve plan_id via prices.description.
func backfillIDsFromDB(ctx context.Context, db *sqlx.DB, cat *Catalog, ids *stripeIDs) error {
	rows, err := db.QueryxContext(ctx, `SELECT description, stripe_id FROM prices WHERE deleted_at IS NULL`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var desc, stripeID string
		if err := rows.Scan(&desc, &stripeID); err != nil {
			return err
		}
		ids.priceByKey[desc] = stripeID
	}
	return rows.Err()
}

func syncDB(ctx context.Context, db *sqlx.DB, cat *Catalog, ids *stripeIDs, dryRun bool) error {
	fmt.Println("→ DB phase")

	if dryRun {
		fmt.Println("  (dry-run: no DB writes)")
		return nil
	}

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	// products + prices (mirror Stripe state). Keyed by stripe_id lookup.
	productUUIDByKey := map[string]string{}
	for _, p := range cat.Products {
		stripeID, ok := ids.productByKey[p.Key]
		if !ok {
			// --db-only and product not yet in Stripe: skip and warn.
			fmt.Printf("  product %-16s SKIP     no Stripe ID available\n", p.Key)
			continue
		}
		uuid, created, err := upsertProductRow(ctx, tx, stripeID, p.Name, p.Description)
		if err != nil {
			return fmt.Errorf("product %q: %w", p.Key, err)
		}
		productUUIDByKey[p.Key] = uuid
		fmt.Printf("  product %-16s %s\n", p.Key, tag(created, "CREATED", "updated"))

		for _, pr := range p.Prices {
			spid, ok := ids.priceByKey[pr.Key]
			if !ok {
				fmt.Printf("  price   %-16s SKIP     no Stripe ID available\n", pr.Key)
				continue
			}
			created, err := upsertPriceRow(ctx, tx, uuid, spid, pr)
			if err != nil {
				return fmt.Errorf("price %q: %w", pr.Key, err)
			}
			fmt.Printf("  price   %-16s %s\n", pr.Key, tag(created, "CREATED", "updated"))
		}
	}

	// features
	featureUUIDByName := map[string]string{}
	for _, f := range cat.Features {
		id, created, err := upsertFeature(ctx, tx, f)
		if err != nil {
			return fmt.Errorf("feature %q: %w", f.Name, err)
		}
		featureUUIDByName[f.Name] = id
		fmt.Printf("  feature %-22s %s\n", f.Name, tag(created, "CREATED", "updated"))
	}

	// limits + plan_feature_limits, per plan
	for _, plan := range cat.Plans {
		planID, err := getPriceIDByDescription(ctx, tx, plan.Price)
		if err != nil {
			return fmt.Errorf("plan %q: %w", plan.Price, err)
		}
		for fname, fv := range plan.Features {
			fid := featureUUIDByName[fname]

			var limitID *string
			if fv.Limit != nil {
				limitName := fmt.Sprintf("%s_%s", fname, plan.Price)
				id, err := upsertLimit(ctx, tx, fid, limitName, *fv.Limit)
				if err != nil {
					return fmt.Errorf("limit %q: %w", limitName, err)
				}
				limitID = &id
			}
			if err := upsertPlanFeatureLimit(ctx, tx, planID, fid, limitID, fv.Enabled); err != nil {
				return fmt.Errorf("plan_feature_limit %s/%s: %w", plan.Price, fname, err)
			}
		}
		fmt.Printf("  plan    %-16s %d feature mappings\n", plan.Price, len(plan.Features))
	}

	return tx.Commit()
}

func upsertProductRow(ctx context.Context, tx *sqlx.Tx, stripeID, name, description string) (string, bool, error) {
	var id string
	err := tx.QueryRowxContext(ctx, `SELECT id FROM products WHERE stripe_id = $1`, stripeID).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		err := tx.QueryRowxContext(ctx,
			`INSERT INTO products (stripe_id, name, description) VALUES ($1, $2, $3) RETURNING id`,
			stripeID, name, description,
		).Scan(&id)
		return id, true, err
	}
	if err != nil {
		return "", false, err
	}
	_, err = tx.ExecContext(ctx,
		`UPDATE products SET name=$1, description=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3`,
		name, description, id,
	)
	return id, false, err
}

func upsertPriceRow(ctx context.Context, tx *sqlx.Tx, productUUID, stripeID string, p Price) (bool, error) {
	var existing string
	err := tx.QueryRowxContext(ctx, `SELECT id FROM prices WHERE stripe_id = $1`, stripeID).Scan(&existing)
	if errors.Is(err, sql.ErrNoRows) {
		_, err := tx.ExecContext(ctx,
			`INSERT INTO prices (product_id, stripe_id, description, unit_amount, currency, interval)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			productUUID, stripeID, p.Key, p.UnitAmount, p.Currency, p.Interval,
		)
		return true, err
	}
	if err != nil {
		return false, err
	}
	_, err = tx.ExecContext(ctx,
		`UPDATE prices SET product_id=$1, description=$2, unit_amount=$3, currency=$4, interval=$5,
		     updated_at=CURRENT_TIMESTAMP
		 WHERE id=$6`,
		productUUID, p.Key, p.UnitAmount, p.Currency, p.Interval, existing,
	)
	return false, err
}

func upsertFeature(ctx context.Context, tx *sqlx.Tx, f Feature) (string, bool, error) {
	var id string
	err := tx.QueryRowxContext(ctx, `SELECT id FROM features WHERE name = $1`, f.Name).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		err := tx.QueryRowxContext(ctx,
			`INSERT INTO features (name, description) VALUES ($1, $2) RETURNING id`,
			f.Name, f.Description,
		).Scan(&id)
		return id, true, err
	}
	if err != nil {
		return "", false, err
	}
	_, err = tx.ExecContext(ctx,
		`UPDATE features SET description=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2`,
		f.Description, id,
	)
	return id, false, err
}

func upsertLimit(ctx context.Context, tx *sqlx.Tx, featureID, limitName string, value int) (string, error) {
	var id string
	err := tx.QueryRowxContext(ctx,
		`SELECT id FROM limits WHERE feature_id=$1 AND limit_name=$2`,
		featureID, limitName,
	).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		err := tx.QueryRowxContext(ctx,
			`INSERT INTO limits (feature_id, limit_name, limit_value) VALUES ($1, $2, $3) RETURNING id`,
			featureID, limitName, value,
		).Scan(&id)
		return id, err
	}
	if err != nil {
		return "", err
	}
	_, err = tx.ExecContext(ctx,
		`UPDATE limits SET limit_value=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2`,
		value, id,
	)
	return id, err
}

func upsertPlanFeatureLimit(ctx context.Context, tx *sqlx.Tx, planID, featureID string, limitID *string, enabled bool) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO plan_feature_limits (plan_id, feature_id, limit_id, enabled)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (plan_id, feature_id) DO UPDATE SET
		    limit_id   = EXCLUDED.limit_id,
		    enabled    = EXCLUDED.enabled,
		    updated_at = CURRENT_TIMESTAMP`,
		planID, featureID, limitID, enabled,
	)
	return err
}

func getPriceIDByDescription(ctx context.Context, tx *sqlx.Tx, description string) (string, error) {
	var id string
	err := tx.QueryRowxContext(ctx,
		`SELECT id FROM prices WHERE description = $1 AND deleted_at IS NULL LIMIT 1`,
		description,
	).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return "", fmt.Errorf("no price row with description=%q (run without --db-only first, or ensure the webhook has synced)", description)
	}
	return id, err
}

func tag(created bool, a, b string) string {
	if created {
		return a
	}
	return b
}
