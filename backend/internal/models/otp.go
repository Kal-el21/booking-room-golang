package models

import "time"

// OTPType defines the purpose of an OTP code
type OTPType string

const (
	OTPTypeLogin             OTPType = "login"
	OTPTypeEmailVerification OTPType = "email_verification"
	OTPTypeResetPassword     OTPType = "reset_password"

	// OTPExpiryMins is how long an OTP remains valid
	OTPExpiryMins = 5
)

// OTPCode stores one-time passwords in the database
type OTPCode struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Code      string    `gorm:"type:varchar(6);not null" json:"code"`
	Type      OTPType   `gorm:"type:varchar(50);not null;index" json:"type"`
	IsUsed    bool      `gorm:"default:false;index" json:"is_used"`
	ExpiresAt time.Time `gorm:"not null;index" json:"expires_at"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`

	// Relationships
	User *User `gorm:"foreignKey:UserID" json:"-"`
}

// TableName specifies the database table name
func (OTPCode) TableName() string {
	return "otp_codes"
}

// IsExpired checks whether the OTP has passed its expiry time
func (o *OTPCode) IsExpired() bool {
	return time.Now().After(o.ExpiresAt)
}
