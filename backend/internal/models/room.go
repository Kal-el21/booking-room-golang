package models

import (
	"time"

	"gorm.io/gorm"
)

type RoomStatus string

const (
	RoomAvailable   RoomStatus = "available"
	RoomOccupied    RoomStatus = "occupied"
	RoomMaintenance RoomStatus = "maintenance"
)

type Room struct {
	ID          uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	RoomName    string         `gorm:"type:varchar(255);not null" json:"room_name" binding:"required"`
	Capacity    int            `gorm:"not null" json:"capacity" binding:"required,min=1"`
	Location    string         `gorm:"type:varchar(255);not null" json:"location" binding:"required"` // Include floor
	Description *string        `gorm:"type:text" json:"description"`                                  // Facilities info
	ImageURL    *string        `gorm:"type:varchar(255)" json:"image_url"`                            // Room photo
	Status      RoomStatus     `gorm:"type:varchar(50);not null;default:'available'" json:"status"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedBy   uint           `gorm:"not null" json:"created_by"`
	CreatedAt   time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Creator  User          `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Bookings []RoomBooking `gorm:"foreignKey:RoomID" json:"bookings,omitempty"`
}

// TableName specifies table name
func (Room) TableName() string {
	return "rooms"
}

// IsAvailable checks if room is available
func (r *Room) IsAvailable() bool {
	return r.Status == RoomAvailable && r.IsActive
}

// RoomResponse for API responses
type RoomResponse struct {
	ID          uint          `json:"id"`
	RoomName    string        `json:"room_name"`
	Capacity    int           `json:"capacity"`
	Location    string        `json:"location"`
	Description *string       `json:"description"`
	ImageURL    *string       `json:"image_url"`
	Status      RoomStatus    `json:"status"`
	IsActive    bool          `json:"is_active"`
	CreatedBy   uint          `json:"created_by"`
	CreatedAt   time.Time     `json:"created_at"`
	Creator     *UserResponse `json:"creator,omitempty"`
}

// ToResponse converts Room to RoomResponse
func (r *Room) ToResponse() RoomResponse {
	response := RoomResponse{
		ID:          r.ID,
		RoomName:    r.RoomName,
		Capacity:    r.Capacity,
		Location:    r.Location,
		Description: r.Description,
		ImageURL:    r.ImageURL,
		Status:      r.Status,
		IsActive:    r.IsActive,
		CreatedBy:   r.CreatedBy,
		CreatedAt:   r.CreatedAt,
	}

	if r.Creator.ID != 0 {
		creatorResp := r.Creator.ToResponse()
		response.Creator = &creatorResp
	}

	return response
}
