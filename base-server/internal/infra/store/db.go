package store

import (
	"base-server/internal/infra/observability"
	"errors"
	"log"
	"time"

	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib" // Import the pgx stdlib for sqlx
	"github.com/jmoiron/sqlx"
)

var ErrNotFound = errors.New("not found")

type Store struct {
	db     *sqlx.DB
	logger *observability.Logger
}

func New(connectionString string, logger *observability.Logger) (Store, error) {
	db, err := sqlx.Open("pgx", connectionString)
	if err != nil {
		log.Fatal(err)
		return Store{}, err
	}

	// Configure connection pool to prevent exhaustion
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	return Store{db: db, logger: logger}, nil
}

// GetDB returns the underlying database connection (useful for tests)
func (s *Store) GetDB() *sqlx.DB {
	return s.db
}

// CalendarStatusRow is one GROUP BY row from the status-breakdown query.
// Day is returned as a plain date string YYYY-MM-DD from PostgreSQL.
type CalendarStatusRow struct {
	Day              string `db:"day"`
	StatusDraft      int    `db:"cnt_draft"`
	StatusScheduled  int    `db:"cnt_scheduled"`
	StatusPublishing int    `db:"cnt_publishing"`
	StatusPublished  int    `db:"cnt_published"`
	StatusFailed     int    `db:"cnt_failed"`
	StatusPartial    int    `db:"cnt_partially_published"`
}

// CalendarPlatformRow is one GROUP BY row from the platform-breakdown query.
type CalendarPlatformRow struct {
	Day      string `db:"day"`
	Platform string `db:"platform"`
	Count    int    `db:"cnt"`
}

// CalendarParams carries the account + year + month for both calendar queries.
type CalendarParams struct {
	AccountID uuid.UUID
	Year      int
	Month     int // 1-based: January = 1
}
