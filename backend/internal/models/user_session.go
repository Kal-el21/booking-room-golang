package models

import (
	"time"
)

type UserSession struct {
	ID                    uint       `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID                uint       `gorm:"not null;index" json:"user_id"`
	AccessToken           string     `gorm:"type:text;unique;not null" json:"access_token"`
	RefreshToken          *string    `gorm:"type:text;unique" json:"refresh_token"`
	RememberMe            bool       `gorm:"default:false" json:"remember_me"`
	TokenLifetimeDays     int        `gorm:"not null" json:"token_lifetime_days"` // 1 or 7
	DeviceName            *string    `gorm:"type:varchar(255)" json:"device_name"`
	IPAddress             *string    `gorm:"type:varchar(45)" json:"ip_address"`
	UserAgent             *string    `gorm:"type:text" json:"user_agent"`
	AccessTokenExpiresAt  time.Time  `gorm:"not null;index" json:"access_token_expires_at"`
	RefreshTokenExpiresAt *time.Time `gorm:"type:timestamp" json:"refresh_token_expires_at"`
	LastUsedAt            *time.Time `gorm:"type:timestamp" json:"last_used_at"`
	CreatedAt             time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt             time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

	// Relationships
	User *User `gorm:"foreignKey:UserID" json:"-"`
}

// TableName specifies table name
func (UserSession) TableName() string {
	return "user_sessions"
}

// IsExpired checks if session is expired
func (s *UserSession) IsExpired() bool {
	return time.Now().After(s.AccessTokenExpiresAt)
}

// UpdateLastUsed updates last used timestamp
func (s *UserSession) UpdateLastUsed() {
	now := time.Now()
	s.LastUsedAt = &now
}

// UserPreference for user notification preferences
type UserPreference struct {
	ID                 uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID             uint      `gorm:"unique;not null" json:"user_id"`
	Notification24h    bool      `gorm:"default:true" json:"notification_24h"`
	Notification3h     bool      `gorm:"default:true" json:"notification_3h"`
	Notification30m    bool      `gorm:"default:true" json:"notification_30m"`
	EmailNotifications bool      `gorm:"default:true" json:"email_notifications"`
	CreatedAt          time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt          time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Relationships
	User *User `gorm:"foreignKey:UserID" json:"-"`
}

// TableName specifies table name
func (UserPreference) TableName() string {
	return "user_preferences"
}

// GetDefaultPreferences returns default preferences
func GetDefaultPreferences(userID uint) UserPreference {
	return UserPreference{
		UserID:             userID,
		Notification24h:    true,
		Notification3h:     true,
		Notification30m:    true,
		EmailNotifications: true,
	}
}
