package services

import (
	"errors"
	"log"
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/repositories"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"
)

type OTPService struct {
	otpRepo  *repositories.OTPRepository
	userRepo *repositories.UserRepository
}

func NewOTPService(otpRepo *repositories.OTPRepository, userRepo *repositories.UserRepository) *OTPService {
	return &OTPService{
		otpRepo:  otpRepo,
		userRepo: userRepo,
	}
}

// GenerateAndSend creates a new OTP of the requested type, persists it, and emails it
// to the user. Any previously active OTPs of the same type are invalidated first.
func (s *OTPService) GenerateAndSend(user *models.User, otpType models.OTPType) error {
	// Invalidate any previously issued, still-active OTPs of this type
	if err := s.otpRepo.InvalidateUserOTPs(user.ID, otpType); err != nil {
		log.Printf("[OTPService] Warning: failed to invalidate old OTPs for user %d: %v", user.ID, err)
	}

	// Generate a 6-digit cryptographically secure code
	code, err := utils.GenerateOTP()
	if err != nil {
		return err
	}

	// Persist the OTP
	otp := &models.OTPCode{
		UserID:    user.ID,
		Code:      code,
		Type:      otpType,
		IsUsed:    false,
		ExpiresAt: time.Now().Add(models.OTPExpiryMins * time.Minute),
	}
	if err := s.otpRepo.Create(otp); err != nil {
		return err
	}

	// Send the email based on OTP purpose
	switch otpType {
	case models.OTPTypeEmailVerification:
		return utils.SendVerificationEmail(user.Email, user.Name, code)
	case models.OTPTypeLogin:
		return utils.SendOTPEmail(user.Email, user.Name, code)
	default:
		return utils.SendOTPEmail(user.Email, user.Name, code)
	}
}

// VerifyOTP validates a user-submitted code. Returns nil on success, an error otherwise.
// On success the OTP is immediately marked as used so it cannot be reused.
func (s *OTPService) VerifyOTP(userID uint, code string, otpType models.OTPType) error {
	otp, err := s.otpRepo.FindValidOTP(userID, code, otpType)
	if err != nil {
		return errors.New("kode OTP tidak valid atau sudah kedaluwarsa")
	}

	// Double-check expiry in application layer
	if otp.IsExpired() {
		return errors.New("kode OTP sudah kedaluwarsa, silakan minta kode baru")
	}

	// Mark as used — one-time use only
	if err := s.otpRepo.MarkAsUsed(otp.ID); err != nil {
		return err
	}

	return nil
}

// ResendOTP is a convenience wrapper: looks up the user then calls GenerateAndSend.
// Returns the user email (masked for the API response) and any error.
func (s *OTPService) ResendOTP(userID uint, otpType models.OTPType) (string, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return "", errors.New("user tidak ditemukan")
	}

	if err := s.GenerateAndSend(user, otpType); err != nil {
		return "", err
	}

	return user.Email, nil
}

// CleanupExpired removes expired/used OTPs. Intended to be called from a background job.
func (s *OTPService) CleanupExpired() error {
	return s.otpRepo.DeleteExpired()
}
