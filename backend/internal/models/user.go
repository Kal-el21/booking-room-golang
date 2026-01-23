package models

import (
	"time"

	"gorm.io/gorm"
)

type UserRole string

const (
	RoleUser      UserRole = "user"
	RoleRoomAdmin UserRole = "room_admin"
	RoleGA        UserRole = "GA"
)

type User struct {
	ID              uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	Name            string         `gorm:"type:varchar(255);not null" json:"name" binding:"required"`
	Email           string         `gorm:"type:varchar(255);unique;not null" json:"email" binding:"required,email"`
	EmailVerifiedAt *time.Time     `gorm:"type:timestamp" json:"email_verified_at"`
	Password        string         `gorm:"type:varchar(255)" json:"-"` // NULL for OAuth
	Role            UserRole       `gorm:"type:varchar(50);not null;default:'user'" json:"role"`
	Division        *string        `gorm:"type:varchar(100)" json:"division"`
	IsActive        bool           `gorm:"default:true" json:"is_active"`
	RefreshToken    *string        `gorm:"type:text" json:"-"` // For JWT refresh
	CreatedAt       time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"` // Soft delete

	// Relationships
	RoomRequests     []RoomRequest   `gorm:"foreignKey:UserID" json:"room_requests,omitempty"`
	AssignedRequests []RoomRequest   `gorm:"foreignKey:AssignedBy" json:"assigned_requests,omitempty"`
	Bookings         []RoomBooking   `gorm:"foreignKey:BookedBy" json:"bookings,omitempty"`
	CreatedRooms     []Room          `gorm:"foreignKey:CreatedBy" json:"created_rooms,omitempty"`
	Notifications    []Notification  `gorm:"foreignKey:UserID" json:"notifications,omitempty"`
	Sessions         []UserSession   `gorm:"foreignKey:UserID" json:"sessions,omitempty"`
	Preferences      *UserPreference `gorm:"foreignKey:UserID" json:"preferences,omitempty"`
}

// TableName specifies table name
func (User) TableName() string {
	return "users"
}

// IsAdmin checks if user is admin (room_admin or GA)
func (u *User) IsAdmin() bool {
	return u.Role == RoleRoomAdmin || u.Role == RoleGA
}

// IsGA checks if user is GA
func (u *User) IsGA() bool {
	return u.Role == RoleGA
}

// IsRoomAdmin checks if user is room admin
func (u *User) IsRoomAdmin() bool {
	return u.Role == RoleRoomAdmin
}

// CanManageRooms checks if user can manage rooms
func (u *User) CanManageRooms() bool {
	return u.Role == RoleRoomAdmin || u.Role == RoleGA
}

// CanApproveRequests checks if user can approve requests
func (u *User) CanApproveRequests() bool {
	return u.Role == RoleGA
}

// UserResponse for API responses (without sensitive data)
type UserResponse struct {
	ID              uint       `json:"id"`
	Name            string     `json:"name"`
	Email           string     `json:"email"`
	Role            UserRole   `json:"role"`
	Division        *string    `json:"division"`
	IsActive        bool       `json:"is_active"`
	EmailVerifiedAt *time.Time `json:"email_verified_at"`
	CreatedAt       time.Time  `json:"created_at"`
}

// ToResponse converts User to UserResponse
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:              u.ID,
		Name:            u.Name,
		Email:           u.Email,
		Role:            u.Role,
		Division:        u.Division,
		IsActive:        u.IsActive,
		EmailVerifiedAt: u.EmailVerifiedAt,
		CreatedAt:       u.CreatedAt,
	}
}
