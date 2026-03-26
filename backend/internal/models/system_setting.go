package models

import "time"

// SystemSetting stores system-wide configuration values as key-value pairs.
// Only room_admin can read or write these settings via the API.
type SystemSetting struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Key       string    `gorm:"type:varchar(100);unique;not null;index" json:"key"`
	Value     string    `gorm:"type:text;not null" json:"value"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (SystemSetting) TableName() string {
	return "system_settings"
}

// ── Well-known setting keys ───────────────────────────────────────────────────

const (
	// SettingEmailVerification controls whether new registrations require
	// email OTP verification before the account becomes active.
	// Value: "true" | "false"  (default "false")
	SettingEmailVerification = "email_verification_enabled"
)
