package models

import (
	"time"

	"gorm.io/gorm"
)

type CarStatus string

const (
	CarAvailable   CarStatus = "available"
	CarOccupied    CarStatus = "occupied"
	CarMaintenance CarStatus = "maintenance"
)

type Car struct {
	ID          uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	CarName     string         `gorm:"type:varchar(255);not null" json:"car_name" binding:"required"`
	Capacity    int            `gorm:"not null" json:"capacity" binding:"required,min=1"`
	Location    string         `gorm:"type:varchar(255);not null" json:"location" binding:"required"` // Include floor or parking spot
	Description *string        `gorm:"type:text" json:"description"`                                  // Facilities info
	ImageURL    *string        `gorm:"type:varchar(255)" json:"image_url"`                            // Car photo
	Status      CarStatus      `gorm:"type:varchar(50);not null;default:'available'" json:"status"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedBy   uint           `gorm:"not null" json:"created_by"`
	CreatedAt   time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Creator  User          `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Bookings []CarBooking  `gorm:"foreignKey:CarID" json:"bookings,omitempty"`
}

// TableName specifies table name
func (Car) TableName() string {
	return "cars"
}

// IsAvailable checks if car is available
func (c *Car) IsAvailable() bool {
	return c.Status == CarAvailable && c.IsActive
}

// CarResponse for API responses
type CarResponse struct {
	ID          uint          `json:"id"`
	CarName     string        `json:"car_name"`
	Capacity    int           `json:"capacity"`
	Location    string       	`json:"location"`
	Description *string       `json:"description"`
	ImageURL    *string       `json:"image_url"`
	Status      CarStatus     `json:"status"`
	IsActive    bool          `json:"is_active"`
	CreatedBy   uint          `json:"created_by"`
	CreatedAt   time.Time     `json:"created_at"`
	Creator     *UserResponse `json:"creator,omitempty"`
}

// ToResponse converts Car to CarResponse
func (c *Car) ToResponse() CarResponse {
	response := CarResponse{
		ID:          c.ID,
		CarName:     c.CarName,
		Capacity:    c.Capacity,
		Location:    c.Location,
		Description: c.Description,
		ImageURL:    c.ImageURL,
		Status:      c.Status,
		IsActive:    c.IsActive,
		CreatedBy:   c.CreatedBy,
		CreatedAt:   c.CreatedAt,
	}

	if c.Creator.ID != 0 {
		creatorResp := c.Creator.ToResponse()
		response.Creator = &creatorResp
	}

	return response
}