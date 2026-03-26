package repositories

import (
	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SystemSettingRepository struct {
	db *gorm.DB
}

func NewSystemSettingRepository(db *gorm.DB) *SystemSettingRepository {
	return &SystemSettingRepository{db: db}
}

// Get returns the raw string value for a key.
// Returns ("", gorm.ErrRecordNotFound) if the key does not exist.
func (r *SystemSettingRepository) Get(key string) (string, error) {
	var s models.SystemSetting
	err := r.db.Where("key = ?", key).First(&s).Error
	return s.Value, err
}

// Set performs an upsert: creates the row if the key is new, updates it otherwise.
func (r *SystemSettingRepository) Set(key, value string) error {
	setting := models.SystemSetting{Key: key, Value: value}
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "key"}},
		DoUpdates: clause.AssignmentColumns([]string{"value", "updated_at"}),
	}).Create(&setting).Error
}

// GetAll returns every system setting row.
func (r *SystemSettingRepository) GetAll() ([]models.SystemSetting, error) {
	var settings []models.SystemSetting
	err := r.db.Find(&settings).Error
	return settings, err
}
