package services

import (
	"errors"

	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/repositories"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"
)

type UserService struct {
	userRepo *repositories.UserRepository
}

func NewUserService(userRepo *repositories.UserRepository) *UserService {
	return &UserService{
		userRepo: userRepo,
	}
}

type UpdateUserInput struct {
	Name     *string          `json:"name"`
	Email    *string          `json:"email"`
	Role     *models.UserRole `json:"role"`
	Division *string          `json:"division"`
	IsActive *bool            `json:"is_active"`
}

type ChangePasswordInput struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=6"`
}

type UpdatePreferencesInput struct {
	Notification24h    *bool `json:"notification_24h"`
	Notification3h     *bool `json:"notification_3h"`
	Notification30m    *bool `json:"notification_30m"`
	EmailNotifications *bool `json:"email_notifications"`
}

// GetUser gets user by ID (GA only)
func (s *UserService) GetUser(id uint) (*models.User, error) {
	return s.userRepo.FindByID(id)
}

// ListUsers lists all users (GA only)
func (s *UserService) ListUsers(page, pageSize int) ([]models.User, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	return s.userRepo.List(page, pageSize)
}

// UpdateUser updates user (GA only)
func (s *UserService) UpdateUser(id uint, input UpdateUserInput) (*models.User, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Update fields if provided
	if input.Name != nil {
		user.Name = *input.Name
	}
	if input.Email != nil {
		// Check if email already exists
		existingUser, err := s.userRepo.FindByEmail(*input.Email)
		if err == nil && existingUser.ID != id {
			return nil, errors.New("email already in use")
		}
		user.Email = *input.Email
	}
	if input.Role != nil {
		user.Role = *input.Role
	}
	if input.Division != nil {
		user.Division = input.Division
	}
	if input.IsActive != nil {
		user.IsActive = *input.IsActive
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return s.userRepo.FindByID(id)
}

// DeleteUser soft deletes user (GA only)
func (s *UserService) DeleteUser(id uint) error {
	return s.userRepo.Delete(id)
}

// ChangePassword changes user password
func (s *UserService) ChangePassword(userID uint, input ChangePasswordInput) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return err
	}

	// Verify current password
	if err := utils.CheckPassword(user.Password, input.CurrentPassword); err != nil {
		return errors.New("current password is incorrect")
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(input.NewPassword)
	if err != nil {
		return err
	}

	// Update password
	return s.userRepo.UpdatePassword(userID, hashedPassword)
}

// ResetPassword resets user password (Room Admin/GA only)
func (s *UserService) ResetPassword(userID uint, newPassword string) error {
	// Hash new password
	hashedPassword, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}

	// Update password
	return s.userRepo.UpdatePassword(userID, hashedPassword)
}

// UpdatePreferences updates user preferences
func (s *UserService) UpdatePreferences(userID uint, input UpdatePreferencesInput) (*models.UserPreference, error) {
	pref, err := s.userRepo.GetOrCreatePreferences(userID)
	if err != nil {
		return nil, err
	}

	// Update fields if provided
	if input.Notification24h != nil {
		pref.Notification24h = *input.Notification24h
	}
	if input.Notification3h != nil {
		pref.Notification3h = *input.Notification3h
	}
	if input.Notification30m != nil {
		pref.Notification30m = *input.Notification30m
	}
	if input.EmailNotifications != nil {
		pref.EmailNotifications = *input.EmailNotifications
	}

	if err := s.userRepo.UpdatePreferences(pref); err != nil {
		return nil, err
	}

	return pref, nil
}

// GetPreferences gets user preferences
func (s *UserService) GetPreferences(userID uint) (*models.UserPreference, error) {
	return s.userRepo.GetOrCreatePreferences(userID)
}
