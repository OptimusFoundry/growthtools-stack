package store

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

// JSONB is a custom type for JSONB fields
type JSONB map[string]interface{}

// Value implements the driver.Valuer interface for JSONB
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface for JSONB
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return errors.New("incompatible type for JSONB")
	}

	// Handle empty or null JSON
	if len(bytes) == 0 || string(bytes) == "null" {
		*j = make(JSONB)
		return nil
	}

	result := make(JSONB)
	err := json.Unmarshal(bytes, &result)
	if err != nil {
		return err
	}
	*j = result
	return nil
}

// StringArray is a custom type for PostgreSQL text[] arrays
type StringArray []string

// Value implements the driver.Valuer interface for StringArray
func (a StringArray) Value() (driver.Value, error) {
	if a == nil {
		return nil, nil
	}
	if len(a) == 0 {
		return "{}", nil
	}
	return "{" + strings.Join(a, ",") + "}", nil
}

// Scan implements the sql.Scanner interface for StringArray
func (a *StringArray) Scan(value interface{}) error {
	if value == nil {
		*a = nil
		return nil
	}

	var str string
	switch v := value.(type) {
	case []byte:
		str = string(v)
	case string:
		str = v
	default:
		return fmt.Errorf("unsupported type for StringArray: %T", value)
	}

	if str == "" || str == "{}" {
		*a = []string{}
		return nil
	}

	str = strings.Trim(str, "{}")
	if str == "" {
		*a = []string{}
		return nil
	}

	*a = strings.Split(str, ",")
	return nil
}

// UUIDArray is a custom type for PostgreSQL UUID[] arrays
type UUIDArray []uuid.UUID

// Value implements the driver.Valuer interface for UUIDArray
func (a UUIDArray) Value() (driver.Value, error) {
	if a == nil {
		return nil, nil
	}
	if len(a) == 0 {
		return "{}", nil
	}
	strVals := make([]string, len(a))
	for i, v := range a {
		strVals[i] = v.String()
	}
	return "{" + strings.Join(strVals, ",") + "}", nil
}

// Scan implements the sql.Scanner interface for UUIDArray
func (a *UUIDArray) Scan(value interface{}) error {
	if value == nil {
		*a = nil
		return nil
	}

	var str string
	switch v := value.(type) {
	case []byte:
		str = string(v)
	case string:
		str = v
	default:
		return fmt.Errorf("unsupported type for UUIDArray: %T", value)
	}

	if str == "" || str == "{}" {
		*a = []uuid.UUID{}
		return nil
	}

	str = strings.Trim(str, "{}")
	if str == "" {
		*a = []uuid.UUID{}
		return nil
	}

	parts := strings.Split(str, ",")
	*a = make([]uuid.UUID, len(parts))
	for i, p := range parts {
		parsed, err := uuid.Parse(p)
		if err != nil {
			return fmt.Errorf("failed to parse UUID at index %d: %w", i, err)
		}
		(*a)[i] = parsed
	}
	return nil
}
