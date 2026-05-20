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
	ID              uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	CarName         string         `gorm:"type:varchar(255);not null" json:"car_name" binding:"required"`
	SeatCapacity    int            `gorm:"not null" json:"seat_capacity" binding:"required,min=1"`
	GarageLocation  string         `gorm:"type:varchar(255);not null" json:"garage_location" binding:"required"`
	PlateNumber     *string        `gorm:"type:varchar(50);unique" json:"plate_number,omitempty"`
	Brand           *string        `gorm:"type:varchar(100)" json:"brand,omitempty"`
	Model           *string        `gorm:"type:varchar(100)" json:"model,omitempty"`
	VehicleType     *string        `gorm:"type:varchar(50)" json:"vehicle_type,omitempty"`
	Transmission    *string        `gorm:"type:varchar(20)" json:"transmission,omitempty"`
	FuelType        *string        `gorm:"type:varchar(20)" json:"fuel_type,omitempty"`
	CurrentOdometer int            `gorm:"default:0" json:"current_odometer"`
	Description     *string        `gorm:"type:text" json:"description"`
	ImageURL        *string        `gorm:"type:varchar(255)" json:"image_url"`
	Status          CarStatus      `gorm:"type:varchar(50);not null;default:'available'" json:"status"`
	IsActive        bool           `gorm:"default:true" json:"is_active"`
	CreatedBy       uint           `gorm:"not null" json:"created_by"`
	CreatedAt       time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Creator  User         `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
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
	ID              uint     `json:"id"`
	CarName         string   `json:"car_name"`
	SeatCapacity    int      `json:"seat_capacity"`
	GarageLocation  string   `json:"garage_location"`
	PlateNumber     *string  `json:"plate_number,omitempty"`
	Brand           *string  `json:"brand,omitempty"`
	Model           *string  `json:"model,omitempty"`
	VehicleType     *string  `json:"vehicle_type,omitempty"`
	Transmission    *string  `json:"transmission,omitempty"`
	FuelType        *string  `json:"fuel_type,omitempty"`
	CurrentOdometer int      `json:"current_odometer"`
	Description     *string  `json:"description"`
	ImageURL        *string  `json:"image_url"`
	Status          CarStatus `json:"status"`
	IsActive        bool     `json:"is_active"`
	CreatedBy       uint     `json:"created_by"`
	CreatedAt       time.Time `json:"created_at"`
	Creator         *UserResponse `json:"creator,omitempty"`
}

// ToResponse converts Car to CarResponse
func (c *Car) ToResponse() CarResponse {
	response := CarResponse{
		ID:              c.ID,
		CarName:         c.CarName,
		SeatCapacity:    c.SeatCapacity,
		GarageLocation:  c.GarageLocation,
		PlateNumber:     c.PlateNumber,
		Brand:           c.Brand,
		Model:           c.Model,
		VehicleType:     c.VehicleType,
		Transmission:    c.Transmission,
		FuelType:        c.FuelType,
		CurrentOdometer: c.CurrentOdometer,
		Description:     c.Description,
		ImageURL:        c.ImageURL,
		Status:          c.Status,
		IsActive:        c.IsActive,
		CreatedBy:       c.CreatedBy,
		CreatedAt:       c.CreatedAt,
	}

	if c.Creator.ID != 0 {
		creatorResp := c.Creator.ToResponse()
		response.Creator = &creatorResp
	}

	return response
}