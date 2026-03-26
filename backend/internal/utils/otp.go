package utils

import (
	"crypto/rand"
	"fmt"
	"math/big"
)

// GenerateOTP generates a cryptographically secure random 6-digit OTP code.
// Uses crypto/rand instead of math/rand to ensure unpredictability.
func GenerateOTP() (string, error) {
	// Generate a number in [0, 1_000_000)
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", fmt.Errorf("failed to generate OTP: %w", err)
	}
	// Zero-pad to always produce exactly 6 digits (e.g. 000042)
	return fmt.Sprintf("%06d", n.Int64()), nil
}
