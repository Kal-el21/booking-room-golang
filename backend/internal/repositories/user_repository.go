package repositories

import (
	"github.com/Kal-el21/booking-room-golang/backend/internal/models"

	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

// FindByID finds user by ID
func (r *UserRepository) FindByID(id uint) (*models.User, error) {
	var user models.User
	err := r.db.Preload("Preferences").First(&user, id).Error
	return &user, err
}

// FindByEmail finds user by email
func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Where("email = ?", email).Preload("Preferences").First(&user).Error
	return &user, err
}

// Update updates user
func (r *UserRepository) Update(user *models.User) error {
	return r.db.Save(user).Error
}

// Delete soft deletes user
func (r *UserRepository) Delete(id uint) error {
	return r.db.Delete(&models.User{}, id).Error
}

// List gets all users with pagination
func (r *UserRepository) List(page, pageSize int) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	offset := (page - 1) * pageSize

	// Count total
	if err := r.db.Model(&models.User{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := r.db.Offset(offset).Limit(pageSize).Find(&users).Error
	return users, total, err
}

// UpdatePassword updates user password
func (r *UserRepository) UpdatePassword(userID uint, hashedPassword string) error {
	return r.db.Model(&models.User{}).Where("id = ?", userID).Update("password", hashedPassword).Error
}

// UpdateRole updates user role
func (r *UserRepository) UpdateRole(userID uint, role models.UserRole) error {
	return r.db.Model(&models.User{}).Where("id = ?", userID).Update("role", role).Error
}

// CreateSession creates a new user session
func (r *UserRepository) CreateSession(session *models.UserSession) error {
	return r.db.Create(session).Error
}

// FindSessionByAccessToken finds session by access token
func (r *UserRepository) FindSessionByAccessToken(token string) (*models.UserSession, error) {
	var session models.UserSession
	err := r.db.Where("access_token = ?", token).First(&session).Error
	return &session, err
}

// DeleteSession deletes a session
func (r *UserRepository) DeleteSession(token string) error {
	return r.db.Where("access_token = ?", token).Delete(&models.UserSession{}).Error
}

// DeleteUserSessions deletes all sessions for a user
func (r *UserRepository) DeleteUserSessions(userID uint) error {
	return r.db.Where("user_id = ?", userID).Delete(&models.UserSession{}).Error
}

// GetOrCreatePreferences gets or creates user preferences
func (r *UserRepository) GetOrCreatePreferences(userID uint) (*models.UserPreference, error) {
	var pref models.UserPreference
	err := r.db.Where("user_id = ?", userID).First(&pref).Error

	if err == gorm.ErrRecordNotFound {
		// Create default preferences
		pref = models.GetDefaultPreferences(userID)
		if err := r.db.Create(&pref).Error; err != nil {
			return nil, err
		}
		return &pref, nil
	}

	return &pref, err
}

// UpdatePreferences updates user preferences
func (r *UserRepository) UpdatePreferences(pref *models.UserPreference) error {
	return r.db.Save(pref).Error
}

// FindSessionByRefreshToken finds session by refresh token
func (r *UserRepository) FindSessionByRefreshToken(refreshToken string, userID uint) (*models.UserSession, error) {
	var session models.UserSession
	err := r.db.Where("refresh_token = ? AND user_id = ?", refreshToken, userID).First(&session).Error
	return &session, err
}

// UpdateSession updates a session
func (r *UserRepository) UpdateSession(session *models.UserSession) error {
	return r.db.Save(session).Error
}
