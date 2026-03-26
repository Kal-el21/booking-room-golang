package services

import (
	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/repositories"
	"gorm.io/gorm"
)

type SystemSettingService struct {
	repo *repositories.SystemSettingRepository
}

func NewSystemSettingService(repo *repositories.SystemSettingRepository) *SystemSettingService {
	return &SystemSettingService{repo: repo}
}

// SystemSettingsResponse is the shape returned to the frontend admin.
type SystemSettingsResponse struct {
	EmailVerificationEnabled bool `json:"email_verification_enabled"`
}

// GetAll fetches all known settings and returns them as a typed response.
// Unknown / missing keys fall back to their safe default (false).
func (s *SystemSettingService) GetAll() (*SystemSettingsResponse, error) {
	resp := &SystemSettingsResponse{
		EmailVerificationEnabled: false, // safe default
	}

	settings, err := s.repo.GetAll()
	if err != nil {
		return resp, nil // return defaults on error rather than failing
	}

	for _, setting := range settings {
		switch setting.Key {
		case models.SettingEmailVerification:
			resp.EmailVerificationEnabled = setting.Value == "true"
		}
	}

	return resp, nil
}

// UpdateEmailVerification persists the email verification toggle.
func (s *SystemSettingService) UpdateEmailVerification(enabled bool) error {
	value := "false"
	if enabled {
		value = "true"
	}
	return s.repo.Set(models.SettingEmailVerification, value)
}

// IsEmailVerificationEnabled reads the current value of the toggle.
// Falls back to false (off) if the key has never been set.
func (s *SystemSettingService) IsEmailVerificationEnabled() bool {
	val, err := s.repo.Get(models.SettingEmailVerification)
	if err != nil {
		// Key not found or DB error → treat as disabled
		if err == gorm.ErrRecordNotFound {
			return false
		}
		return false
	}
	return val == "true"
}
