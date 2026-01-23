package models

import (
	"time"

	"gorm.io/datatypes"
)

type AuditAction string
type EntityType string

const (
	ActionCreate  AuditAction = "create"
	ActionUpdate  AuditAction = "update"
	ActionDelete  AuditAction = "delete"
	ActionApprove AuditAction = "approve"
	ActionReject  AuditAction = "reject"
	ActionCancel  AuditAction = "cancel"
)

const (
	EntityRoom    EntityType = "rooms"
	EntityBooking EntityType = "bookings"
	EntityRequest EntityType = "requests"
	EntityUser    EntityType = "users"
)

type AuditLog struct {
	ID         uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID     *uint          `gorm:"index" json:"user_id"`
	Action     AuditAction    `gorm:"type:varchar(50);not null" json:"action"`
	EntityType EntityType     `gorm:"type:varchar(50);not null" json:"entity_type"`
	EntityID   uint           `gorm:"not null;index" json:"entity_id"`
	OldValues  datatypes.JSON `gorm:"type:jsonb" json:"old_values"`
	NewValues  datatypes.JSON `gorm:"type:jsonb" json:"new_values"`
	IPAddress  *string        `gorm:"type:varchar(45)" json:"ip_address"`
	UserAgent  *string        `gorm:"type:text" json:"user_agent"`
	CreatedAt  time.Time      `gorm:"autoCreateTime;index" json:"created_at"`

	// Relationships
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName specifies table name
func (AuditLog) TableName() string {
	return "audit_logs"
}
