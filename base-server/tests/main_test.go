//go:build integration

package tests

import (
	"os"
	"testing"

	"base-server/tests/testenv"
)

func TestMain(m *testing.M) {
	env := testenv.Start(m)
	code := m.Run()
	env.Stop()
	os.Exit(code)
}
