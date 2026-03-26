package repositories

import (
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"

	"gorm.io/gorm"
)

type OTPRepository struct {
	db *gorm.DB
}

func NewOTPRepository(db *gorm.DB) *OTPRepository {
	return &OTPRepository{db: db}
}

// Create stores a new OTP record in the database.
func (r *OTPRepository) Create(otp *models.OTPCode) error {
	return r.db.Create(otp).Error
}

// FindValidOTP retrieves an active, unexpired OTP that matches the given criteria.
func (r *OTPRepository) FindValidOTP(userID uint, code string, otpType models.OTPType) (*models.OTPCode, error) {
	var otp models.OTPCode
	err := r.db.Where(
		"user_id = ? AND code = ? AND type = ? AND is_used = ? AND expires_at > ?",
		userID, code, otpType, false, time.Now(),
	).First(&otp).Error
	return &otp, err
}

// MarkAsUsed sets is_used = true so the OTP cannot be reused.
func (r *OTPRepository) MarkAsUsed(id uint) error {
	return r.db.Model(&models.OTPCode{}).
		Where("id = ?", id).
		Update("is_used", true).Error
}

// InvalidateUserOTPs marks all active OTPs of a given type for a user as used.
// Call this before generating a new OTP to prevent multiple valid codes existing.
func (r *OTPRepository) InvalidateUserOTPs(userID uint, otpType models.OTPType) error {
	return r.db.Model(&models.OTPCode{}).
		Where("user_id = ? AND type = ? AND is_used = ?", userID, otpType, false).
		Update("is_used", true).Error
}

// DeleteExpired removes all expired or already-used OTP records to keep the table clean.
func (r *OTPRepository) DeleteExpired() error {
	return r.db.
		Where("expires_at < ? OR is_used = ?", time.Now(), true).
		Delete(&models.OTPCode{}).Error
}
