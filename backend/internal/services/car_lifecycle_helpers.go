package services

import (
	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"gorm.io/gorm"
)

func markCarOccupied(db *gorm.DB, carID uint) error {
	return db.Model(&models.Car{}).
		Where("id = ?", carID).
		Where("status <> ?", models.CarMaintenance).
		Update("status", models.CarOccupied).Error
}

func releaseCarIfNoActiveBookings(db *gorm.DB, carID uint) error {
	var activeBookings int64
	if err := db.Model(&models.CarBooking{}).
		Where("car_id = ?", carID).
		Where("status IN ?", []models.CarBookingStatus{
			models.CarBookingPickedUp,
			models.CarBookingInUse,
		}).
		Count(&activeBookings).Error; err != nil {
		return err
	}

	if activeBookings > 0 {
		return nil
	}

	return db.Model(&models.Car{}).
		Where("id = ?", carID).
		Where("status = ?", models.CarOccupied).
		Update("status", models.CarAvailable).Error
}
